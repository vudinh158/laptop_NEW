// server/controllers/authController.js
const jwt = require("jsonwebtoken")
let nodemailer = null
try {
  nodemailer = require("nodemailer")
} catch (_) {
  nodemailer = null
}
const { User, Role, Cart } = require("../models")
const { validationResult } = require("express-validator")
const { Op } = require("sequelize")

// Generate JWT token
const generateToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET || "your-secret-key", { expiresIn: "7d" })

const getFrontendBaseUrl = () =>
  (process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:3000").replace(/\/$/, "")

const getApiBaseUrl = () =>
  (process.env.API_PUBLIC_URL || "http://localhost:5000").replace(/\/$/, "")

const makeMailTransporter = () => {
  if (!nodemailer) {
    return null
  }
  const host = process.env.EMAIL_HOST
  const port = process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : undefined
  const secure = String(process.env.EMAIL_SECURE || "").toLowerCase() === "true"
  const user = process.env.EMAIL_USER
  const pass = process.env.EMAIL_PASS

  if (!host || !port || !user || !pass) {
    return null
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  })
}

const sendEmail = async ({ to, subject, text, html }) => {
  const transporter = makeMailTransporter()
  if (!transporter) {
    // Không có cấu hình mail → không throw để tránh làm hỏng flow dev,
    // nhưng log ra để bạn copy link test.
    console.log("[MAIL] Missing EMAIL_* env. Skip sending to:", to)
    console.log("[MAIL] Subject:", subject)
    if (text) console.log("[MAIL] Text:\n", text)
    return { skipped: true }
  }

  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER
  await transporter.sendMail({ from, to, subject, text, html })
  return { sent: true }
}

const signPurposeToken = ({ purpose, userId, email, expiresIn }) => {
  return jwt.sign(
    { purpose, userId, email },
    process.env.JWT_SECRET || "your-secret-key",
    { expiresIn }
  )
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
    const existing = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email }, { phone_number }],
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
    const roles = ["customer"] // hoặc truy DB nếu muốn chắc chắn

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

// Register new user with email verification (user is_active=false until verified)
exports.registerEmailVerification = async (req, res, next) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { username, email, password, full_name, phone_number } = req.body

    const existing = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email }, { phone_number }],
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

    const user = await User.create({
      username,
      email,
      password_hash: password,
      full_name,
      phone_number,
      is_active: false,
    })

    const customerRole = await Role.findOne({ where: { role_name: "customer" } })
    if (customerRole) {
      await user.addRole(customerRole)
    }

    await Cart.create({ user_id: user.user_id })

    const token = signPurposeToken({
      purpose: "email_verify",
      userId: user.user_id,
      email: user.email,
      expiresIn: process.env.EMAIL_VERIFY_EXPIRES_IN || "24h",
    })

    const verifyUrl = `${getApiBaseUrl()}/api/auth/verify-email?token=${encodeURIComponent(token)}`

    const subject = "Xác nhận tài khoản"
    const text = `Hệ thống đã nhận yêu cầu đăng ký tài khoản.\n\nVui lòng bấm link sau để xác nhận: ${verifyUrl}`
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <p>Hệ thống đã nhận yêu cầu đăng ký tài khoản.</p>
        <p>Vui lòng bấm nút bên dưới để xác nhận tạo tài khoản:</p>
        <p>
          <a href="${verifyUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">
            Xác nhận
          </a>
        </p>
        <p>Nếu bạn không yêu cầu đăng ký, vui lòng bỏ qua email này.</p>
      </div>
    `

    await sendEmail({ to: user.email, subject, text, html })

    res.status(201).json({
      message: "Verification email sent",
      email: user.email,
    })
  } catch (error) {
    next(error)
  }
}

// Verify email token -> activate user -> redirect to FE with login token
exports.verifyEmail = async (req, res) => {
  try {
    const token = String(req.query.token || "")
    if (!token) {
      return res.redirect(`${getFrontendBaseUrl()}/login?verify=missing`)
    }

    let decoded
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key")
    } catch (_) {
      return res.redirect(`${getFrontendBaseUrl()}/login?verify=invalid`)
    }

    if (decoded?.purpose !== "email_verify" || !decoded?.userId) {
      return res.redirect(`${getFrontendBaseUrl()}/login?verify=invalid`)
    }

    const user = await User.findByPk(decoded.userId)
    if (!user) {
      return res.redirect(`${getFrontendBaseUrl()}/login?verify=notfound`)
    }

    if (!user.is_active) {
      await user.update({ is_active: true })
    }

    const sessionToken = generateToken(user.user_id)
    return res.redirect(`${getFrontendBaseUrl()}/oauth/success?token=${encodeURIComponent(sessionToken)}`)
  } catch (_) {
    return res.redirect(`${getFrontendBaseUrl()}/login?verify=error`)
  }
}

// Forgot password: send reset link email (always returns 200)
exports.forgotPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const email = String(req.body.email || "").trim()
    const user = await User.findOne({ where: { email } })
    if (user) {
      const token = signPurposeToken({
        purpose: "password_reset",
        userId: user.user_id,
        email: user.email,
        expiresIn: process.env.PASSWORD_RESET_EXPIRES_IN || "15m",
      })

      const verifyUrl = `${getApiBaseUrl()}/api/auth/reset-password/verify?token=${encodeURIComponent(token)}`
      const subject = "Đặt lại mật khẩu"
      const text = `Bạn đã yêu cầu đặt lại mật khẩu.\n\nBấm link sau để tiếp tục: ${verifyUrl}`
      const html = `
        <div style="font-family:Arial,sans-serif;line-height:1.5">
          <p>Bạn đã yêu cầu đặt lại mật khẩu.</p>
          <p>Bấm nút bên dưới để đặt mật khẩu mới:</p>
          <p>
            <a href="${verifyUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">
              Xác nhận thay đổi mật khẩu
            </a>
          </p>
          <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
        </div>
      `
      await sendEmail({ to: user.email, subject, text, html })
    }

    return res.json({ message: "If the email exists, a reset link has been sent" })
  } catch (error) {
    next(error)
  }
}

// Verify reset token and redirect to FE reset password page
exports.resetPasswordRedirect = async (req, res) => {
  try {
    const token = String(req.query.token || "")
    if (!token) {
      return res.redirect(`${getFrontendBaseUrl()}/login?mode=reset&error=missing`)
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key")
      if (decoded?.purpose !== "password_reset" || !decoded?.userId) {
        return res.redirect(`${getFrontendBaseUrl()}/login?mode=reset&error=invalid`)
      }
    } catch (_) {
      return res.redirect(`${getFrontendBaseUrl()}/login?mode=reset&error=invalid`)
    }
    return res.redirect(`${getFrontendBaseUrl()}/login?mode=reset&token=${encodeURIComponent(token)}`)
  } catch (_) {
    return res.redirect(`${getFrontendBaseUrl()}/login?mode=reset&error=error`)
  }
}

// Reset password with token
exports.resetPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const token = String(req.body.token || "")
    const password = String(req.body.password || "")
    if (!token) {
      return res.status(400).json({ message: "Missing token" })
    }

    let decoded
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key")
    } catch (_) {
      return res.status(400).json({ message: "Invalid or expired token" })
    }

    if (decoded?.purpose !== "password_reset" || !decoded?.userId) {
      return res.status(400).json({ message: "Invalid token" })
    }

    const user = await User.findByPk(decoded.userId)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    await user.update({ password_hash: password })

    return res.json({ message: "Password updated successfully" })
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
