// controllers/vnpayController.js
const qs = require("qs");
const crypto = require("crypto");
const { sequelize, Payment, Order, OrderItem, ProductVariation } = require("../models");

const VNP_HASHSECRET = process.env.VNP_HASHSECRET;

/** Helpers */
function sortObject(obj) {
  const s = {};
  Object.keys(obj).sort().forEach((k) => (s[k] = obj[k]));
  return s;
}
function hmacSHA512(secret, data) {
  return crypto.createHmac("sha512", secret).update(data, "utf-8").digest("hex");
}

/**
 * IPN handler (nguồn sự thật):
 * - Verify chữ ký
 * - Đối soát số tiền
 * - Idempotent
 * - Transaction + row-lock
 * - (Nếu SUCCESS) trừ kho an toàn
 */
async function ipn(req, res) {
  try {
    // 1) Verify chữ ký
    const params = { ...req.query };
    const secureHash = params.vnp_SecureHash;
    delete params.vnp_SecureHash;
    if ("vnp_SecureHashType" in params) delete params.vnp_SecureHashType;

    const signData = qs.stringify(sortObject(params), { encode: false });
    const check = hmacSHA512(VNP_HASHSECRET, signData);
    if (check !== secureHash) {
      return res.json({ RspCode: "97", Message: "Invalid Checksum" });
    }

    // 2) Trích thông tin quan trọng
    const txnRef = params.vnp_TxnRef; // đã lưu vào payments.txn_ref khi tạo URL
    const amount = Number(params.vnp_Amount || 0) / 100; // VNPAY *100 đơn vị -> đổi về VND
    const rspCode = params.vnp_ResponseCode;
    const txnStatus = params.vnp_TransactionStatus;
    const isSuccess = rspCode === "00" && txnStatus === "00";

    // 3) Transaction + row-lock toàn bộ cập nhật
    await sequelize.transaction(async (t) => {
      // Lấy payment theo (provider, txn_ref) và khoá hàng
      const payment = await Payment.findOne({
        where: { provider: "VNPAY", txn_ref: txnRef },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!payment) throw new Error("Payment not found");

      // Idempotent: đã xử lý thành công trước đó thì xác nhận OK luôn
      if (payment.payment_status === "completed") {
        return;
      }

      // Đối soát số tiền
      if (Number(payment.amount) !== amount) {
        payment.payment_status = "failed";
        payment.raw_ipn = req.query; // lưu log thô để trace
        await payment.save({ transaction: t });

        const order = await Order.findOne({
          where: { order_id: payment.order_id },
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        if (order) {
          order.status = "FAILED";
          await order.save({ transaction: t });
        }
        return;
      }

      // Lấy order và khoá dòng
      const order = await Order.findOne({
        where: { order_id: payment.order_id },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!order) throw new Error("Order not found");

      if (isSuccess) {
        payment.payment_status = "completed";
        payment.transaction_id = params.vnp_TransactionNo || null;
        payment.raw_ipn = req.query;
        payment.paid_at = new Date();
        await payment.save({ transaction: t });

        order.status = "PAID";
        await order.save({ transaction: t });

      } else {
        // giao dịch thất bại → HOÀN KHO
        const items = await OrderItem.findAll({ where: { order_id: order.order_id }, transaction: t });
        for (const it of items) {
          const v = await ProductVariation.findOne({
            where: { variation_id: it.variation_id },
            transaction: t,
            lock: t.LOCK.UPDATE,
            skipLocked: true,
          });
          if (v) {
            await v.increment("stock_quantity", { by: it.quantity, transaction: t });
          }
        }
        payment.payment_status = "failed";
        payment.raw_ipn = req.query;
        await payment.save({ transaction: t });

        order.status = "FAILED";
        await order.save({ transaction: t });
      }
    });

    return res.json({ RspCode: "00", Message: "Confirm Success" });
  } catch (e) {
    // lỗi hệ thống → để VNPAY retry
    return res.json({ RspCode: "99", Message: "Unknown error" });
  }
}

module.exports = { ipn };
