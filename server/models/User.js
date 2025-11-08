// server/models/User.js
const { DataTypes } = require("sequelize")
const sequelize = require("../config/database")
const bcrypt = require("bcryptjs")

const User = sequelize.define(
  "User",
  {
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    full_name: {
      type: DataTypes.STRING(100),
    },
    phone_number: {
      type: DataTypes.STRING(20),
      allowNull : true,
      unique : true,
      vialidate : {
        is: /^[+0-9][0-9\s\-()]{6,}$/i,
      }
    },
    address: {
      type: DataTypes.TEXT,
    },
    avatar_url: {
      type: DataTypes.STRING(255),
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    last_login: {
      type: DataTypes.DATE,
    },
        oauth_provider: { type: DataTypes.STRING(20) }, // 'google' | 'facebook'
    oauth_id: { type: DataTypes.STRING(191) }, // sub/id từ provider
  },
  {
    tableName: "users",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    hooks: {
      beforeCreate: async (user) => {
        if (user.password_hash) {
          user.password_hash = await bcrypt.hash(user.password_hash, 10)
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed("password_hash")) {
          user.password_hash = await bcrypt.hash(user.password_hash, 10)
        }
      },
    },
  },
)

User.prototype.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password_hash)
}

module.exports = User
