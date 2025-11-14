// server/controllers/authController.js
const jwt = require("jsonwebtoken")
const { User, Role, Cart } = require("../models")
const { validationResult } = require("express-validator")
const { Op } = require("sequelize")

// Generate JWT token
const generateToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET || "your-secret-key", { expiresIn: "7d" })


// Register new user
exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { username, email, password, full_name, phone_number } = req.body

    // Check if user exists
    const existing = await User.findOne({
      where: {
        [Op.or]: [
          { username },
          { email },
          { phone_number },
        ],
      },
      attributes: ["username", "email", "phone_number"],
    })

    if (existing) {
      const dupErrors = []
      if (existing.username === username) {
        dupErrors.push({ field: "username", code: "DUPLICATE_USERNAME", message: "Username already taken" })
      }
      if (existing.email === email) {
        dupErrors.push({ field: "email", code: "DUPLICATE_EMAIL", message: "Email already registered" })
      }
      if (existing.phone_number === phone_number) {
        dupErrors.push({ field: "phone_number", code: "DUPLICATE_PHONE", message: "Phone number already registered" })
      }
      return res.status(409).json({ message: "Duplicate entry", errors: dupErrors })
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password_hash: password,
      full_name,
      phone_number,
    })

    // Assign default role (customer)
    const customerRole = await Role.findOne({ where: { role_name: "customer" } })
    if (customerRole) {
      await user.addRole(customerRole)
    }

    // Create cart for user
    await Cart.create({ user_id: user.user_id })

    // Generate token
    const token = generateToken(user.user_id)
    const roles = [ "customer" ]; // hoặc truy DB nếu muốn chắc chắn

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        phone_number: user.phone_number,
        roles,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Login user
exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { username, password } = req.body

    // Find user
    const user = await User.findOne({
      where: { username },
      include: [
        {
          model: Role,
          through: { attributes: [] },
        },
      ],
    })

    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" })
    }

    // Check password
    const isValidPassword = await user.comparePassword(password)
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid username or password" })
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({ message: "Account is inactive" })
    }

    // Update last login
    await user.update({ last_login: new Date() })

    // Generate token
    const token = generateToken(user.user_id)

    res.json({
      message: "Login successful",
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        phone_number: user.phone_number,
        avatar_url: user.avatar_url,
        roles: user.Roles.map((r) => r.role_name),
      },
    })
  } catch (error) {
    next(error)
  }
}

// Get current user
exports.getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.user_id, {
      include: [
        {
          model: Role,
          through: { attributes: [] },
        },
      ],
      attributes: { exclude: ["password_hash"] },
    })

    res.json({
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        phone_number: user.phone_number,
        address: user.address,
        avatar_url: user.avatar_url,
        roles: user.Roles.map((role) => role.role_name),
      },
    })
  } catch (error) {
    next(error)
  }
}

// Update profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { full_name, phone_number, address, avatar_url } = req.body

    await req.user.update({
      full_name,
      phone_number,
      address,
      avatar_url,
    })

    res.json({
      message: "Profile updated successfully",
      user: {
        user_id: req.user.user_id,
        username: req.user.username,
        email: req.user.email,
        full_name: req.user.full_name,
        phone_number: req.user.phone_number,
        address: req.user.address,
        avatar_url: req.user.avatar_url,
      },
    })
  } catch (error) {
    next(error)
  }
}
