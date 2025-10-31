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
const geoRoutes = require('./routes/geo');
const vnpayRoutes = require("./routes/vnpayRoutes");
const shippingRoutes = require("./routes/shippingRoutes");
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
app.use('/api', geoRoutes);
app.use("/api", vnpayRoutes); // hoặc app.use("/api", vnpayRoutes);
app.use("/api", shippingRoutes);

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

    // Sẽ tạo các bảng trong Neon Postgres nếu chưa tồn tại
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
