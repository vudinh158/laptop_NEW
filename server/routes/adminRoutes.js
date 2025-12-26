const express = require("express")
const router = express.Router()
const adminController = require("../controllers/adminController")
const { authenticateToken, authorizeRoles } = require("../middleware/auth")

// All admin routes require authentication and admin role
router.use(authenticateToken)
router.use(authorizeRoles("admin", "manager"))

// Product management
router.post("/products", adminController.createProduct)
router.put('/products/:product_id', adminController.updateProduct);
router.delete("/products/:product_id", adminController.deleteProduct)

// Variation management
router.post("/products/:product_id/variations", adminController.createVariation)
router.put("/variations/:variation_id", adminController.updateVariation)

// Order management
router.get("/orders", adminController.getAllOrders)
router.get("/orders/:order_id", adminController.getOrderDetail)
router.put("/orders/:order_id/status", adminController.updateOrderStatus)
router.post("/orders/:order_id/ship", adminController.shipOrder)
router.post("/orders/:order_id/deliver", adminController.deliverOrder)
router.post("/orders/:order_id/refund", adminController.refundOrder)

// User management
router.get("/users", adminController.getAllUsers)
router.put("/users/:user_id/status", adminController.updateUserStatus)

// Category management
router.get("/categories", adminController.getAllCategories) // DÒNG MỚI: Get all categories
router.post("/categories", adminController.createCategory)
router.put("/categories/:category_id", adminController.updateCategory)
router.delete("/categories/:category_id", adminController.deleteCategory)

// Brand management
router.get("/brands", adminController.getAllBrands)
router.get("/brands/:brand_id", adminController.getBrandById)
router.post("/brands", adminController.createBrand)
router.put("/brands/:brand_id", adminController.updateBrand)
router.delete("/brands/:brand_id", adminController.deleteBrand)

// Role management
router.get("/roles", adminController.getAllRoles)
router.post("/roles", adminController.createRole)
router.put("/roles/:role_id", adminController.updateRole)
router.delete("/roles/:role_id", adminController.deleteRole)
router.put("/users/:user_id/roles", adminController.updateUserRoles)

// Analytics & Dashboard
router.get("/analytics/dashboard", adminController.getDashboardAnalytics)
router.get("/analytics/sales", adminController.getSalesAnalytics)

module.exports = router
