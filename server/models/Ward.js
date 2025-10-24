const { DataTypes } = require("sequelize")
const sequelize = require("../config/database")
const Province = require("./Province")

const Ward = sequelize.define("Ward", {
  ward_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  province_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "provinces", key: "province_id" },
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  },
  name: { type: DataTypes.STRING(150), allowNull: false },
  slug: { type: DataTypes.STRING(180), allowNull: false },
  // nếu 1 phường/xã đặc thù (đảo, vùng sâu…) cần phụ thu thêm
  extra_fee: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }, // VND
}, {
  tableName: "wards",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
})
module.exports = Ward
