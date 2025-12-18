// server/middleware/auth.js
const jwt = require("jsonwebtoken")
const { User, Role } = require("../models")

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"]
    const token = authHeader && authHeader.split(" ")[1]

    if (!token) {
      return res.status(401).json({ message: "Access token required" })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key")

    const user = await User.findByPk(decoded.userId, {
      include: [
        {
          model: Role,
          through: { attributes: [] },
        },
      ],
      attributes: { exclude: ["password_hash"] },
    })

    if (!user || !user.is_active) {
      return res.status(403).json({ message: "User not found or inactive" })
    }

    req.user = user
    req.userId = user.user_id;              // ✅ thêm
    req.userRoles = user.Roles?.map(r=>r.role_name) || []; // ✅ thêm
    next()
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" })
  }
}

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" })
    }

    const userRoles = req.user.Roles.map((role) => role.role_name)
    const hasRole = roles.some((role) => userRoles.includes(role))

    if (!hasRole) {
      return res.status(403).json({ message: "Insufficient permissions" })
    }

    next()
  }
}

module.exports = { authenticateToken, authorizeRoles }
