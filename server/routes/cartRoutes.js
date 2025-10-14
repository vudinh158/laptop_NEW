const express = require("express")
const router = express.Router()
const cartController = require("../controllers/cartController")
const { authenticateToken } = require("../middleware/auth")

// All cart routes require authentication
router.use(authenticateToken)

router.get("/", cartController.getCart)
router.post("/items", cartController.addToCart)
router.put("/items/:cart_item_id", cartController.updateCartItem)
router.delete("/items/:cart_item_id", cartController.removeCartItem)
router.delete("/clear", cartController.clearCart)

module.exports = router
