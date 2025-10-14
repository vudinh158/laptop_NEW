const { DataTypes } = require("sequelize")
const sequelize = require("../config/database")

const Payment = sequelize.define(
  "Payment",
  {
    payment_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: "orders",
        key: "order_id",
      },
    },
    payment_method: {
      type: DataTypes.ENUM("cod", "bank_transfer", "credit_card", "e_wallet"),
      allowNull: false,
    },
    payment_status: {
      type: DataTypes.ENUM("pending", "completed", "failed", "refunded"),
      defaultValue: "pending",
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    transaction_id: {
      type: DataTypes.STRING(100),
    },
    paid_at: {
      type: DataTypes.DATE,
    },
  },
  {
    tableName: "payments",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
)

module.exports = Payment
