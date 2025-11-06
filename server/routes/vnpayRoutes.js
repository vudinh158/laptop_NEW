// routes/vnpayRoutes.js
const express = require("express");
const router = express.Router();
const vnpayController = require("../controllers/vnpayController");

// VNPAY IPN (server-to-server)
router.get("/vnpay_ipn", vnpayController.ipn);
router.get("/vnpay/repay", vnpayController.verifyRepay);
module.exports = router;
