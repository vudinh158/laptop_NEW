const { Product, ProductVariation, ProductImage, Category, Brand, Order, User, Role } = require("../models")
const sequelize = require("../config/database")

// Product Management
exports.createProduct = async (req, res, next) => {
  const transaction = await sequelize.transaction()

  try {
    const {
      product_name,
      slug,
      description,
      category_id,
      brand_id,
      base_price,
      discount_percentage,
      thumbnail_url,
      variations,
      images,
    } = req.body

    // Create product
    const product = await Product.create(
      {
        product_name,
        slug,
        description,
        category_id,
        brand_id,
        base_price,
        discount_percentage,
        thumbnail_url,
        is_active: true,
      },
      { transaction },
    )

    // Create variations
    if (variations && variations.length > 0) {
      const variationData = variations.map((v) => ({
        ...v,
        product_id: product.product_id,
      }))
      await ProductVariation.bulkCreate(variationData, { transaction })
    }

    // Create images
    if (images && images.length > 0) {
      const imageData = images.map((img, index) => ({
        ...img,
        product_id: product.product_id,
        display_order: index,
      }))
      await ProductImage.bulkCreate(imageData, { transaction })
    }

    await transaction.commit()

    res.status(201).json({
      message: "Product created successfully",
      product,
    })
  } catch (error) {
    await transaction.rollback()
    next(error)
  }
}

exports.updateProduct = async (req, res, next) => {
  try {
    const { product_id } = req.params
    const updateData = req.body

    const product = await Product.findByPk(product_id)
    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    await product.update(updateData)

    res.json({
      message: "Product updated successfully",
      product,
    })
  } catch (error) {
    next(error)
  }
}

exports.deleteProduct = async (req, res, next) => {
  try {
    const { product_id } = req.params

    const product = await Product.findByPk(product_id)
    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    // Soft delete
    await product.update({ is_active: false })

    res.json({ message: "Product deleted successfully" })
  } catch (error) {
    next(error)
  }
}

// Variation Management
exports.createVariation = async (req, res, next) => {
  try {
    const { product_id } = req.params
    const variationData = req.body

    const product = await Product.findByPk(product_id)
    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    const variation = await ProductVariation.create({
      ...variationData,
      product_id,
    })

    res.status(201).json({
      message: "Variation created successfully",
      variation,
    })
  } catch (error) {
    next(error)
  }
}

exports.updateVariation = async (req, res, next) => {
  try {
    const { variation_id } = req.params
    const updateData = req.body

    const variation = await ProductVariation.findByPk(variation_id)
    if (!variation) {
      return res.status(404).json({ message: "Variation not found" })
    }

    await variation.update(updateData)

    res.json({
      message: "Variation updated successfully",
      variation,
    })
  } catch (error) {
    next(error)
  }
}

// Order Management
exports.getAllOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query
    const offset = (page - 1) * limit

    const where = {}
    if (status) where.status = status

    const { count, rows } = await Order.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["user_id", "username", "email", "full_name", "phone_number"],
        },
      ],
      limit: Number.parseInt(limit),
      offset: Number.parseInt(offset),
      order: [["created_at", "DESC"]],
    })

    res.json({
      orders: rows,
      pagination: {
        total: count,
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    })
  } catch (error) {
    next(error)
  }
}

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { order_id } = req.params
    const { status } = req.body

    const order = await Order.findByPk(order_id)
    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    await order.update({ status })

    res.json({
      message: "Order status updated successfully",
      order,
    })
  } catch (error) {
    next(error)
  }
}

// User Management
exports.getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const offset = (page - 1) * limit

    const { count, rows } = await User.findAndCountAll({
      include: [
        {
          model: Role,
          through: { attributes: [] },
        },
      ],
      attributes: { exclude: ["password_hash"] },
      limit: Number.parseInt(limit),
      offset: Number.parseInt(offset),
      order: [["created_at", "DESC"]],
    })

    res.json({
      users: rows,
      pagination: {
        total: count,
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    })
  } catch (error) {
    next(error)
  }
}

exports.updateUserStatus = async (req, res, next) => {
  try {
    const { user_id } = req.params
    const { is_active } = req.body

    const user = await User.findByPk(user_id)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    await user.update({ is_active })

    res.json({
      message: "User status updated successfully",
      user,
    })
  } catch (error) {
    next(error)
  }
}

// Category Management

exports.getAllCategories = async (req, res, next) => {
  try {
    const categories = await Category.findAll({
      order: [["display_order", "ASC"]],
    })

    res.json({ categories })
  } catch (error) {
    next(error)
  }
}

exports.createCategory = async (req, res, next) => {
  try {
    const category = await Category.create(req.body)

    res.status(201).json({
      message: "Category created successfully",
      category,
    })
  } catch (error) {
    next(error)
  }
}

exports.updateCategory = async (req, res, next) => {
  try {
    const { category_id } = req.params

    const category = await Category.findByPk(category_id)
    if (!category) {
      return res.status(404).json({ message: "Category not found" })
    }

    await category.update(req.body)

    res.json({
      message: "Category updated successfully",
      category,
    })
  } catch (error) {
    next(error)
  }
}

exports.deleteCategory = async (req, res, next) => {
  try {
    const { category_id } = req.params

    const category = await Category.findByPk(category_id)
    if (!category) {
      return res.status(404).json({ message: "Category not found" })
    }

    // Kiểm tra xem có sản phẩm nào thuộc category này không (Nếu có, bạn nên ngăn chặn hoặc chuyển sản phẩm)
    const productCount = await category.countProducts()
    if (productCount > 0) {
        return res.status(400).json({ message: "Cannot delete category with associated products" })
    }

    await category.destroy()

    res.json({ message: "Category deleted successfully" })
  } catch (error) {
    next(error)
  }
}

// Brand Management
exports.createBrand = async (req, res, next) => {
  try {
    const brand = await Brand.create(req.body)

    res.status(201).json({
      message: "Brand created successfully",
      brand,
    })
  } catch (error) {
    next(error)
  }
}

exports.updateBrand = async (req, res, next) => {
  try {
    const { brand_id } = req.params

    const brand = await Brand.findByPk(brand_id)
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" })
    }

    await brand.update(req.body)

    res.json({
      message: "Brand updated successfully",
      brand,
    })
  } catch (error) {
    next(error)
  }
}
