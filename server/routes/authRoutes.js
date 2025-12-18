// server/routes/authRoutes.js
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
  body("phone_number").trim().notEmpty().withMessage("Phone number is required").matches(/^[+0-9][0-9\s\-()]{6,}$/).withMessage("Invalid phone number"),
]

const loginValidation = [
  body("username").trim().notEmpty().withMessage("Username is required"),
  body("password").notEmpty().withMessage("Password is required"),
]

const emailOnlyValidation = [
  body("email").isEmail().normalizeEmail().withMessage("Invalid email"),
]

const resetPasswordValidation = [
  body("token").notEmpty().withMessage("Token is required"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
]

// Routes
router.post("/register", registerValidation, authController.register)
router.post(
  "/register-email",
  registerValidation,
  authController.registerEmailVerification
)
router.get("/verify-email", authController.verifyEmail)
router.post("/login", loginValidation, authController.login)
router.post("/forgot-password", emailOnlyValidation, authController.forgotPassword)
router.get(
  "/reset-password/verify",
  authController.resetPasswordRedirect
)
router.post(
  "/reset-password",
  resetPasswordValidation,
  authController.resetPassword
)
router.get("/me", authenticateToken, authController.getCurrentUser)
router.put("/profile", authenticateToken, authController.updateProfile)

module.exports = router
