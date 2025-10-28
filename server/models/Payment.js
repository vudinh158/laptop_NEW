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
      // ENUM hiện có: 'cod', 'bank_transfer', 'credit_card', 'e_wallet'
      // Thêm: 'VNPAYQR', 'VNBANK', 'INTCARD', 'INSTALLMENT'
      type: DataTypes.ENUM(
        "COD",
        "bank_transfer",
        "credit_card",
        "e_wallet",
        "VNPAYQR",
        "VNBANK",
        "INTCARD",
        "INSTALLMENT"
      ),
      allowNull: false,
    },
    payment_status: {
      type: DataTypes.ENUM("pending", "completed", "failed", "refunded"),
      defaultValue: "pending",
    },
    amount: {
      type: DataTypes.DECIMAL(16, 2),
      allowNull: false,
    },
    transaction_id: {
      type: DataTypes.STRING(100),
    },
    provider: {
      type: DataTypes.STRING(32), // ví dụ 'VNPAY'
      allowNull: true,
    },
    // vnp_TxnRef bạn sinh khi tạo URL
    txn_ref: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    // lưu nguyên payload return/ipn để trace
    raw_return: {
      type: DataTypes.JSONB, // nếu dùng MySQL: DataTypes.JSON
      allowNull: true,
    },
    raw_ipn: {
      type: DataTypes.JSONB,
      allowNull: true,
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
    indexes: [
      {
        name: "payments_provider_txnref_uk",
        unique: true,
        fields: ["provider", "txn_ref"],
        // Lưu ý: "where" chỉ hỗ trợ một số dialect;
        // index partial (WHERE txn_ref IS NOT NULL) sẽ tạo bằng SQL bên dưới.
      },
    ],
  },
)

module.exports = Payment
