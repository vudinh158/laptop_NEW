const { DataTypes } = require("sequelize")
const sequelize = require("../config/database")

const ProductVariation = sequelize.define(
  "ProductVariation",
  {
    variation_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "products",
        key: "product_id",
      },
    },
    sku: {
      type: DataTypes.STRING(100),
      unique: true,
    },
    processor: {
      type: DataTypes.STRING(100),
    },
    ram: {
      type: DataTypes.STRING(50),
    },
    storage: {
      type: DataTypes.STRING(50),
    },
    graphics_card: {
      type: DataTypes.STRING(100),
    },
    screen_size: {
      type: DataTypes.STRING(50),
    },
    color: {
      type: DataTypes.STRING(50),
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    stock_quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    is_available: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "product_variations",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
)

module.exports = ProductVariation
