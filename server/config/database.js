const { Sequelize } = require("sequelize")
require("dotenv").config()

// Lấy chuỗi kết nối PostgreSQL từ Neon (NEON_DATABASE_URL là tên biến bạn đã dùng)
const connectionUrl = process.env.NEON_DATABASE_URL 

// Bổ sung kiểm tra để ngăn lỗi "undefined" khi chuỗi kết nối bị thiếu
if (!connectionUrl) {
    console.error("=========================================================================")
    console.error("LỖI CẤU HÌNH DB: Biến môi trường NEON_DATABASE_URL không được định nghĩa.")
    console.error("Vui lòng thiết lập biến này trong file .env.")
    console.error("=========================================================================")
    // Thoát ứng dụng nếu không có chuỗi kết nối hợp lệ
    process.exit(1) 
}

// Khởi tạo Sequelize bằng chuỗi kết nối URL
const sequelize = new Sequelize(
  connectionUrl, // Truyền trực tiếp chuỗi URL đầy đủ
  {
    // FIX: Thay thế 'mysql' bằng 'postgres'
    dialect: "postgres",
    // Cấu hình SSL/TLS, cần thiết cho kết nối Neon (vì chuỗi URL đã có sslmode=require)
    dialectOptions: {
        ssl: {
            require: true,
            // Thường không cần thiết, nhưng có thể giúp giải quyết lỗi chứng chỉ
            rejectUnauthorized: false 
        }
    },
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
)

module.exports = sequelize