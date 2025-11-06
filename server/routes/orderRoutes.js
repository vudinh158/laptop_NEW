const express = require("express")
const router = express.Router()
const orderController = require("../controllers/orderController")
const { authenticateToken } = require("../middleware/auth")

// All order routes require authentication
router.use(authenticateToken)

router.post("/", orderController.createOrder)
router.get("/counters", orderController.getOrderCounters)
router.post("/:order_id/payment-method", orderController.changePaymentMethod);
router.put("/:order_id/shipping-address", orderController.updateShippingAddress);
router.get("/", orderController.getUserOrders)
router.get("/:order_id", orderController.getOrderDetail)
router.post("/:order_id/cancel", orderController.cancelOrder)
router.post("/preview", orderController.previewOrder);
router.get("/:order_id/slim", orderController.getOrderDetailSlim);
router.post("/:order_id/payments/retry", orderController.retryVnpayPayment);
module.exports = router
