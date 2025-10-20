const express = require("express")
const router = express.Router()
const productController = require("../controllers/productController")
const { authenticateToken } = require("../middleware/auth")

// Public routes
router.get("/", productController.getProducts)
router.get("/categories", productController.getCategories)
router.get("/brands", productController.getBrands)
router.get("/:id", productController.getProductDetail)
router.get("/:product_id/recommendations", productController.getRecommendedProducts)
router.get("/compare", productController.compareProducts);  // GET ?ids=1,2,3
router.post("/compare", productController.compareProducts); // hoặc POST { ids: [1,2,3] }
router.post("/:id/questions", authenticateToken, productController.createQuestion);
router.post("/questions/:question_id/answers", authenticateToken, productController.createAnswer);
module.exports = router
