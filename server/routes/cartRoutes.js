const express = require("express")
const router = express.Router()
const cartController = require("../controllers/cartController")
const { authenticateToken } = require("../middleware/auth")

// All cart routes require authentication
router.use(authenticateToken)

router.get("/", cartController.getCart)
router.post("/", cartController.addToCart)
router.put("/:cart_item_id", cartController.updateCartItem)
router.delete("/:cart_item_id", cartController.removeCartItem)
router.delete("/", cartController.clearCart)

module.exports = router
