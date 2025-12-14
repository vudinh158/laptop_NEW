const { Payment, Order } = require("../models");
const { getPaymentUrl, verifyReturnUrl } = require("../services/vnpayService");

// 1. Tạo link thanh toán
exports.createPayment = async (req, res) => {
  try {
    const { orderId, amount } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({ message: "Thiếu orderId hoặc amount" });
    }

    // Lấy IP thật của user (ưu tiên x-forwarded-for nếu có proxy)
    const ipAddrRaw = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const ipAddr = Array.isArray(ipAddrRaw) ? ipAddrRaw[0] : String(ipAddrRaw).split(",")[0].trim();

    // TxnRef nên unique (orderId-timestamp)
    const txnRef = `${orderId}-${Date.now()}`;

    const url = await getPaymentUrl({
      amount,
      txnRef,
      orderDesc: `Thanh toan don hang #${orderId}`,
      ipAddr,
      // method: req.body.method, // (không khuyến nghị) - để VNPAY cho chọn
    });

    return res.json({ url });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi tạo link thanh toán" });
  }
};

// 2. Xử lý khi user quay lại từ VNPAY (Return URL)
exports.vnpayReturn = async (req, res) => {
  try {
    const { isSuccess, vnp_Params } = verifyReturnUrl({ ...req.query });

    // Lấy Order ID từ txnRef (format: orderId-timestamp)
    const txnRef = vnp_Params["vnp_TxnRef"] || "";
    const orderId = txnRef.split("-")[0];

    const frontendUrl = process.env.FE_APP_URL || "http://localhost:3000";

    if (!orderId) {
      return res.redirect(`${frontendUrl}/checkout/vnpay-return?status=failed&orderId=unknown`);
    }

    if (isSuccess) {
      // --- LOGIC CẬP NHẬT DB ---
      const order = await Order.findByPk(orderId);
      const payment = await Payment.findOne({ where: { order_id: orderId } });

      if (order && payment) {
        if (payment.payment_status !== "completed") {
          payment.payment_status = "completed";
          payment.txn_ref = txnRef;
          payment.transaction_id = vnp_Params["vnp_TransactionNo"] || null;
          payment.paid_at = new Date();
          await payment.save();

          order.status = "processing";
          await order.save();
        }
      }

      return res.redirect(
        `${frontendUrl}/checkout/vnpay-return?status=success&orderId=${encodeURIComponent(orderId)}`
      );
    } else {
      const payment = await Payment.findOne({ where: { order_id: orderId } });
      if (payment) {
        payment.payment_status = "failed";
        await payment.save();
      }

      return res.redirect(
        `${frontendUrl}/checkout/vnpay-return?status=failed&orderId=${encodeURIComponent(orderId)}`
      );
    }
  } catch (error) {
    console.error("VNPAY Return Error:", error);
    const frontendUrl = process.env.FE_APP_URL || "http://localhost:3000";
    return res.redirect(`${frontendUrl}/orders?error=unknown`);
  }
};
