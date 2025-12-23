const sequelize = require("../config/database")
const User = require("./User")
const Role = require("./Role")
const Permission = require("./Permission")
const Product = require("./Product")
const ProductVariation = require("./ProductVariation")
const ProductImage = require("./ProductImage")
const Category = require("./Category")
const Brand = require("./Brand")
const Tag = require("./Tag")
const Cart = require("./Cart")
const CartItem = require("./CartItem")
const Order = require("./Order")
const OrderItem = require("./OrderItem")
const Payment = require("./Payment")
const Question = require("./Question")
const Answer = require("./Answer")
const Notification = require("./Notification")
const Province = require("./Province")
const Ward = require("./Ward")

// User - Role (Many-to-Many)
User.belongsToMany(Role, { through: "user_roles", foreignKey: "user_id" })
Role.belongsToMany(User, { through: "user_roles", foreignKey: "role_id" })

// Role - Permission (Many-to-Many)
Role.belongsToMany(Permission, { through: "role_permissions", foreignKey: "role_id" })
Permission.belongsToMany(Role, { through: "role_permissions", foreignKey: "permission_id" })

// Product - Category (Many-to-One)
Product.belongsTo(Category, { foreignKey: "category_id", as: "category" })
Category.hasMany(Product, { foreignKey: "category_id" })

// Product - Brand (Many-to-One)
Product.belongsTo(Brand, { foreignKey: "brand_id", as: "brand" })
Brand.hasMany(Product, { foreignKey: "brand_id" })

// Product - Tag (Many-to-Many)
Product.belongsToMany(Tag, { through: "product_tags", foreignKey: "product_id" })
Tag.belongsToMany(Product, { through: "product_tags", foreignKey: "tag_id" })

// Product - ProductVariation (One-to-Many)
Product.hasMany(ProductVariation, { foreignKey: "product_id", as: "variations" })
ProductVariation.belongsTo(Product, { foreignKey: "product_id" , as: "product"})

// Product - ProductImage (One-to-Many)
Product.hasMany(ProductImage, { foreignKey: "product_id", as: "images" })
ProductImage.belongsTo(Product, { foreignKey: "product_id", as: "product" })

// User - Cart (One-to-One)
User.hasOne(Cart, { foreignKey: "user_id", as: "cart" })
Cart.belongsTo(User, { foreignKey: "user_id" })

// Cart - CartItem (One-to-Many)
Cart.hasMany(CartItem, { foreignKey: "cart_id", as: "items" })
CartItem.belongsTo(Cart, { foreignKey: "cart_id" })

// ProductVariation - CartItem (One-to-Many)
ProductVariation.hasMany(CartItem, { foreignKey: "variation_id" })
CartItem.belongsTo(ProductVariation, { foreignKey: "variation_id", as: "variation" })

// User - Order (One-to-Many)
User.hasMany(Order, { foreignKey: "user_id", as: "orders" })
Order.belongsTo(User, { foreignKey: "user_id", as: "user" })

// Order - OrderItem (One-to-Many)
Order.hasMany(OrderItem, { foreignKey: "order_id", as: "items" })
OrderItem.belongsTo(Order, { foreignKey: "order_id" })

// ProductVariation - OrderItem (One-to-Many)
ProductVariation.hasMany(OrderItem, { foreignKey: "variation_id" })
OrderItem.belongsTo(ProductVariation, { foreignKey: "variation_id", as: "variation" })

// Order - Payment (One-to-One)
Order.hasOne(Payment, { foreignKey: "order_id", as: "payment" })
Payment.belongsTo(Order, { foreignKey: "order_id" })

// Product - Question (One-to-Many)
Product.hasMany(Question, { foreignKey: "product_id", as: "questions" })
Question.belongsTo(Product, { foreignKey: "product_id", as: "product" })

// User - Question (One-to-Many)
User.hasMany(Question, { foreignKey: "user_id" })
Question.belongsTo(User, { foreignKey: "user_id", as: "user" })

// Question - Answer (One-to-Many)
Question.hasMany(Answer, { foreignKey: "question_id", as: "answers" })
Answer.belongsTo(Question, { foreignKey: "question_id" })

// ✅ tự liên kết
Question.belongsTo(Question, { as: "parent",   foreignKey: "parent_question_id" });
Question.hasMany(Question,   { as: "children", foreignKey: "parent_question_id" });

// User - Answer (One-to-Many)
User.hasMany(Answer, { foreignKey: "user_id" })
Answer.belongsTo(User, { foreignKey: "user_id", as: "user" })

// User - Notification (One-to-Many)
User.hasMany(Notification, { foreignKey: "user_id", as: "notifications" })
Notification.belongsTo(User, { foreignKey: "user_id" })

//Province - Ward (One-to-Many)
Province.hasMany(Ward, { foreignKey: "province_id", as: "wards" })
Ward.belongsTo(Province, { foreignKey: "province_id", as: "province" })

module.exports = {
  sequelize,
  User,
  Role,
  Permission,
  Product,
  ProductVariation,
  ProductImage,
  Category,
  Brand,
  Tag,
  Cart,
  CartItem,
  Order,
  OrderItem,
  Payment,
  Question,
  Answer,
  Notification,
  Province,
  Ward,
}
