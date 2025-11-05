const express = require("express")
const router = express.Router()
const orderController = require("../controllers/orderController")
const { authenticateToken } = require("../middleware/auth")

// All order routes require authentication
router.use(authenticateToken)

router.post("/", orderController.createOrder)
router.get("/", orderController.getUserOrders)
router.get("/:order_id", orderController.getOrderDetail)
router.put("/:order_id/cancel", orderController.cancelOrder)
router.post("/preview", orderController.previewOrder);

module.exports = router
