// server/models/Answer.js
const { DataTypes } = require("sequelize")
const sequelize = require("../config/database")

const Answer = sequelize.define(
  "Answer",
  {
    answer_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    question_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "questions",
        key: "question_id",
      },
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
    },
    answer_text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    tableName: "answers",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
)

module.exports = Answer
