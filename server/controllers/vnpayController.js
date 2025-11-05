// controllers/vnpayController.js
const qs = require("qs");
const crypto = require("crypto");
const {
  sequelize,
  Payment,
  Order,
  OrderItem,
  ProductVariation,
} = require("../models");

const VNP_HASHSECRET = process.env.VNP_HASHSECRET;

/** Encode + sort giống mẫu VNPAY (keys & values), space -> '+' */
function sortObjectForVnp(obj) {
  const encoded = {};
  const keys = [];
  for (const k in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      keys.push(encodeURIComponent(k));
    }
  }
  keys.sort();
  for (let i = 0; i < keys.length; i++) {
    const encKey = keys[i];
    const rawKey = decodeURIComponent(encKey);
    const val = obj[rawKey];
    encoded[encKey] = encodeURIComponent(String(val)).replace(/%20/g, "+");
  }
  return encoded;
}

function hmacSHA512(secret, data) {
  return crypto
    .createHmac("sha512", secret)
    .update(data, "utf-8")
    .digest("hex");
}

/**
 * IPN handler:
 * - Verify chữ ký (đúng mẫu VNPAY)
 * - Đối soát số tiền
 * - Idempotent
 * - Transaction + row-lock
 * - (Nếu SUCCESS) cập nhật thanh toán & đơn
 */
async function ipn(req, res) {
  try {
    console.log("[VNPAY][IPN] HIT", new Date().toISOString(), req.originalUrl);
    if (req.query.ping) {
      return res.json({ RspCode: "00", Message: "pong" });
    }
    if (!VNP_HASHSECRET) {
      console.error("[VNPAY][IPN] Missing VNP_HASHSECRET env");
      return res.json({ RspCode: "99", Message: "Missing secret" });
    }
    // 1) Verify chữ ký
    const params = { ...req.query };
    const secureHash = params.vnp_SecureHash;
    delete params.vnp_SecureHash;
    if ("vnp_SecureHashType" in params) delete params.vnp_SecureHashType;
    if (!secureHash) {
      return res.json({ RspCode: "97", Message: "Missing SecureHash" });
    }
    const signData = qs.stringify(sortObjectForVnp(params), { encode: false });
    const check = hmacSHA512(VNP_HASHSECRET, signData);
    if (check !== secureHash) {
      return res.json({ RspCode: "97", Message: "Invalid Checksum" });
    }

    // 2) Trích thông tin quan trọng
    const txnRef = params.vnp_TxnRef;
    const amount = Number(params.vnp_Amount || 0) / 100; // đổi về VND
    const rspCode = params.vnp_ResponseCode;
    const txnStatus = params.vnp_TransactionStatus;
    const isSuccess = rspCode === "00" && txnStatus === "00";

    // 3) Transaction + row-lock
    await sequelize.transaction(async (t) => {
      const payment = await Payment.findOne({
        where: { provider: "VNPAY", txn_ref: txnRef },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!payment) throw new Error("Payment not found");

      // Idempotent
      if (payment.payment_status === "completed") {
        return;
      }

      // Đối soát số tiền
      if (Number(payment.amount) !== amount) {
        payment.payment_status = "failed";
        payment.raw_ipn = req.query;
        await payment.save({ transaction: t });

        const order = await Order.findOne({
          where: { order_id: payment.order_id },
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        if (order) {
          order.status = "cancelled";
          await order.save({ transaction: t });
        }
        return;
      }

      // Lấy order
      const order = await Order.findOne({
        where: { order_id: payment.order_id },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!order) throw new Error("Order not found");

      if (isSuccess) {
        // Thành công
        payment.payment_status = "completed";
        payment.transaction_id = params.vnp_TransactionNo || null;
        payment.raw_ipn = req.query;
        payment.paid_at = new Date();
        await payment.save({ transaction: t });

        order.status = "PAID";
        await order.save({ transaction: t });
      } else {
        // Thất bại → nếu bạn có cơ chế reserve trước đó, hoàn kho ở đây
        // (Bạn đã bổ sung hoàn kho ở nhánh failed – giữ nguyên)
        const items = await OrderItem.findAll({
          where: { order_id: order.order_id },
          transaction: t,
        });
        for (const it of items) {
          const v = await ProductVariation.findOne({
            where: { variation_id: it.variation_id },
            transaction: t,
            lock: t.LOCK.UPDATE,
            skipLocked: true,
          });
          if (v) {
            await v.increment("stock_quantity", {
              by: it.quantity,
              transaction: t,
            });
          }
        }

        payment.payment_status = "failed";
        payment.raw_ipn = req.query;
        await payment.save({ transaction: t });

        order.status = "pending";
        await order.save({ transaction: t });
      }
    });

    return res.json({ RspCode: "00", Message: "Confirm Success" });
  } catch (e) {
    // lỗi hệ thống → để VNPAY retry
    console.error("[VNPAY][IPN] ERROR:", e && e.stack ? e.stack : e);
    return res.json({ RspCode: "99", Message: "Unknown error" });
  }
}

module.exports = { ipn };
