const express = require("express")
const router = express.Router()
const adminController = require("../controllers/adminController")
const { authenticateToken, authorizeRoles } = require("../middleware/auth")

// All admin routes require authentication and admin role
router.use(authenticateToken)
router.use(authorizeRoles("admin", "manager"))

// Product management
router.post("/products", adminController.createProduct)
router.put("/products/:product_id", adminController.updateProduct)
router.delete("/products/:product_id", adminController.deleteProduct)

// Variation management
router.post("/products/:product_id/variations", adminController.createVariation)
router.put("/variations/:variation_id", adminController.updateVariation)

// Order management
router.get("/orders", adminController.getAllOrders)
router.put("/orders/:order_id/status", adminController.updateOrderStatus)

// User management
router.get("/users", adminController.getAllUsers)
router.put("/users/:user_id/status", adminController.updateUserStatus)

// Category management
router.post("/categories", adminController.createCategory)
router.put("/categories/:category_id", adminController.updateCategory)

// Brand management
router.post("/brands", adminController.createBrand)
router.put("/brands/:brand_id", adminController.updateBrand)

module.exports = router
