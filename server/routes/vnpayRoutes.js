const express = require("express");
const router = express.Router();
const vnpayController = require("../controllers/vnpayController");

// API tạo link: POST /api/vnpay/create_payment_url
router.post("/vnpay/create_payment_url", vnpayController.createPayment);

// API nhận kết quả trả về từ VNPAY: GET /api/vnpay/return
// Đây chính là link bạn cấu hình vào 'vnp_ReturnUrl'
router.get("/vnpay/return", vnpayController.vnpayReturn);

module.exports = router;
