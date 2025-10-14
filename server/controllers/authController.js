const jwt = require("jsonwebtoken")
const { User, Role, Cart } = require("../models")
const { validationResult } = require("express-validator")

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || "your-secret-key", { expiresIn: "7d" })
}

// Register new user
exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { username, email, password, full_name, phone_number } = req.body

    // Check if user exists
    const existingUser = await User.findOne({
      where: { email },
    })

    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" })
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

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
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

    const { email, password } = req.body

    // Find user
    const user = await User.findOne({
      where: { email },
      include: [
        {
          model: Role,
          through: { attributes: [] },
        },
      ],
    })

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    // Check password
    const isValidPassword = await user.comparePassword(password)
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid email or password" })
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
        avatar_url: user.avatar_url,
        roles: user.Roles.map((role) => role.role_name),
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
