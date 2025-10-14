const express = require("express")
const cors = require("cors")
require("dotenv").config()

const sequelize = require("./config/database")
const errorHandler = require("./middleware/errorHandler")

// Import routes
const authRoutes = require("./routes/authRoutes")
const productRoutes = require("./routes/productRoutes")
const cartRoutes = require("./routes/cartRoutes")
const orderRoutes = require("./routes/orderRoutes")
const adminRoutes = require("./routes/adminRoutes")

const app = express()

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/products", productRoutes)
app.use("/api/cart", cartRoutes)
app.use("/api/orders", orderRoutes)
app.use("/api/admin", adminRoutes)

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running" })
})

// Error handler
app.use(errorHandler)

// Database connection and server start
const PORT = process.env.PORT || 5000

const startServer = async () => {
  try {
    await sequelize.authenticate()
    console.log("Database connection established successfully.")

    // Sync models (use { force: true } only in development to recreate tables)
    await sequelize.sync({ alter: true })
    console.log("Database models synchronized.")

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`)
    })
  } catch (error) {
    console.error("Unable to start server:", error)
    process.exit(1)
  }
}

startServer()
