const express = require("express")
const router = express.Router()
const productController = require("../controllers/productController")

// Public routes
router.get("/", productController.getProducts)
router.get("/categories", productController.getCategories)
router.get("/brands", productController.getBrands)
router.get("/:id", productController.getProductDetail)
router.get("/:product_id/recommendations", productController.getRecommendedProducts)

module.exports = router
