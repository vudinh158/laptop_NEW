const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Order = sequelize.define(
  "Order",
  {
    order_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
    },
    order_code: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: false,
    },
    total_amount: {
      type: DataTypes.DECIMAL(16, 2),
      allowNull: false,
    },
    shipping_fee: {
      type: DataTypes.DECIMAL(16, 2),
      allowNull: false,
    },
    discount_amount: {
      type: DataTypes.DECIMAL(16, 2),
      defaultValue: 0,
    },
    final_amount: {
      type: DataTypes.DECIMAL(16, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(
        "pending",
        "confirmed",
        "processing",
        "shipping",
        "delivered",
        "cancelled",
        // thêm mới:
        "AWAITING_PAYMENT",
        "PAID",
        "FAILED"
      ),
      defaultValue: "pending",
    },
    shipping_address: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    shipping_phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    shipping_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    note: {
      type: DataTypes.TEXT,
    },
    reserve_expires_at: { type: DataTypes.DATE, allowNull: true },

    province_id: { type: DataTypes.INTEGER, allowNull: true },
    ward_id: { type: DataTypes.INTEGER, allowNull: true },
    geo_lat: { type: DataTypes.DECIMAL(10, 6), allowNull: true },
    geo_lng: { type: DataTypes.DECIMAL(10, 6), allowNull: true },
  },
  {
    tableName: "orders",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = Order;
