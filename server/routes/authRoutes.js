const express = require("express")
const router = express.Router()
const { body } = require("express-validator")
const authController = require("../controllers/authController")
const { authenticateToken } = require("../middleware/auth")

// Validation rules
const registerValidation = [
  body("username").trim().isLength({ min: 3, max: 50 }).withMessage("Username must be 3-50 characters"),
  body("email").isEmail().normalizeEmail().withMessage("Invalid email"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("full_name").optional().trim().isLength({ max: 100 }),
]

const loginValidation = [
  body("email").isEmail().normalizeEmail().withMessage("Invalid email"),
  body("password").notEmpty().withMessage("Password is required"),
]

// Routes
router.post("/register", registerValidation, authController.register)
router.post("/login", loginValidation, authController.login)
router.get("/me", authenticateToken, authController.getCurrentUser)
router.put("/profile", authenticateToken, authController.updateProfile)

module.exports = router
