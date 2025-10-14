const { DataTypes } = require("sequelize")
const sequelize = require("../config/database")

const ProductImage = sequelize.define(
  "ProductImage",
  {
    image_id: {
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
    image_url: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    alt_text: {
      type: DataTypes.STRING(255),
    },
    display_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    is_primary: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "product_images",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
)

module.exports = ProductImage
