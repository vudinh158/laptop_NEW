// models/Province.js
const { DataTypes } = require("sequelize")
const sequelize = require("../config/database")

const Province = sequelize.define("Province", {
  province_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(150), allowNull: false, unique: true },
  slug: { type: DataTypes.STRING(180), allowNull: false, unique: true },

  // BƯỚC A: tạm thời cho phép NULL và KHÔNG đặt default
  region: {
    type: DataTypes.ENUM("south", "central", "north", "highland", "island"),
    allowNull: false,           // <-- tạm thời cho phép null
    defaultValue: "south",  // <-- tạm thời bỏ default
  },

  base_shipping_fee: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  is_free_shipping: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  max_shipping_fee: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 150000 },
  is_hcm: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, {
  tableName: "provinces",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
})

module.exports = Province
