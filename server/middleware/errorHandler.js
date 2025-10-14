const errorHandler = (err, req, res, next) => {
  console.error(err.stack)

  if (err.name === "SequelizeValidationError") {
    return res.status(400).json({
      message: "Validation error",
      errors: err.errors.map((e) => ({
        field: e.path,
        message: e.message,
      })),
    })
  }

  if (err.name === "SequelizeUniqueConstraintError") {
    return res.status(409).json({
      message: "Duplicate entry",
      errors: err.errors.map((e) => ({
        field: e.path,
        message: e.message,
      })),
    })
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ message: "Invalid token" })
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ message: "Token expired" })
  }

  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  })
}

module.exports = errorHandler
