const { Product, ProductVariation, ProductImage, Category, Brand, Order, OrderItem, Payment, User, Role } = require("../models")
const { Op, Sequelize } = require("sequelize")
const sequelize = require("../config/database")
const { uploadProductFiles } = require("../middleware/upload")

// Product Management
exports.createProduct = [
  uploadProductFiles,
  async (req, res, next) => {
    const transaction = await sequelize.transaction()

    try {
      const {
        product_name,
        slug,
        description,
        category_id,
        brand_id,
        discount_percentage,
        variations: variationsString,
      } = req.body

      let variations
      try {
        variations = JSON.parse(variationsString)
      } catch (parseError) {
        await transaction.rollback()
        return res.status(400).json({ message: "Invalid variations data" })
      }

      // Validation: Ensure exactly one variation is marked as primary
      if (!variations || variations.length === 0) {
        await transaction.rollback()
        return res.status(400).json({ message: "At least one variation is required" })
      }

      const primaryVariations = variations.filter(v => v.is_primary === true)
      if (primaryVariations.length !== 1) {
        await transaction.rollback()
        return res.status(400).json({ message: "Exactly one variation must be marked as primary" })
      }

      // Handle thumbnail upload
      let thumbnail_url = null
      if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
        thumbnail_url = req.files.thumbnail[0].path
      }

      // Create product
      const product = await Product.create(
        {
          product_name,
          slug,
          description,
          category_id,
          brand_id,
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

      // Create product images
      if (req.files && req.files.product_images && req.files.product_images.length > 0) {
        const imageData = req.files.product_images.map((file, index) => ({
          product_id: product.product_id,
          image_url: file.path,
          is_primary: false,
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
]

// Update Product with Variations Sync
exports.updateProduct = [
  uploadProductFiles,
  async (req, res, next) => {
    const transaction = await sequelize.transaction();

    try {
      const { product_id } = req.params;
      const {
        product_name,
        slug,
        description,
        category_id,
        brand_id,
        discount_percentage,
        variations: variationsString,
      } = req.body;

      // Parse variations data
      let variations = [];
      try {
        variations = variationsString ? JSON.parse(variationsString) : [];
      } catch (parseError) {
        await transaction.rollback();
        return res.status(400).json({ message: "Invalid variations data" });
      }

      // Tìm sản phẩm
      const product = await Product.findByPk(product_id);
      if (!product) {
        await transaction.rollback();
        return res.status(404).json({ message: "Product not found" });
      }

      // Validation: Ensure exactly one variation is marked as primary
      if (variations.length > 0) {
        const primaryVariations = variations.filter(v => v.is_primary === true);
        if (primaryVariations.length !== 1) {
          await transaction.rollback();
          return res.status(400).json({ message: "Exactly one variation must be marked as primary" });
        }
      }

      // Prepare product update data
      const updateData = {
        product_name,
        slug,
        description,
        category_id,
        brand_id,
        discount_percentage,
        is_active: req.body.is_active !== undefined ? req.body.is_active : product.is_active,
      };

      // Handle thumbnail update
      if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
        updateData.thumbnail_url = req.files.thumbnail[0].path;
      }

      // Update product
      await product.update(updateData, { transaction });

      // Sync variations
      if (variations.length > 0) {
        // Get existing variations
        const existingVariations = await ProductVariation.findAll({
          where: { product_id: product_id },
          transaction
        });

        const existingVariationIds = existingVariations.map(v => v.variation_id);
        const incomingVariationIds = variations
          .filter(v => v.variation_id)
          .map(v => v.variation_id);

        // Variations to update (existing ones that are still in the list)
        const variationsToUpdate = variations.filter(v => v.variation_id);
        // Variations to create (new ones without variation_id)
        const variationsToCreate = variations.filter(v => !v.variation_id);
        // Variations to delete (existing ones not in the incoming list)
        const variationsToDelete = existingVariationIds.filter(
          id => !incomingVariationIds.includes(id)
        );

        // Update existing variations
        for (const variation of variationsToUpdate) {
          await ProductVariation.update(
            {
              processor: variation.processor,
              ram: variation.ram,
              storage: variation.storage,
              graphics_card: variation.graphics_card,
              screen_size: variation.screen_size,
              color: variation.color,
              price: variation.price,
              stock_quantity: variation.stock_quantity,
              is_primary: variation.is_primary,
              sku: variation.sku,
            },
            {
              where: { variation_id: variation.variation_id },
              transaction
            }
          );
        }

        // Create new variations
        if (variationsToCreate.length > 0) {
          const newVariationsData = variationsToCreate.map(v => ({
            product_id: product_id,
            processor: v.processor,
            ram: v.ram,
            storage: v.storage,
            graphics_card: v.graphics_card,
            screen_size: v.screen_size,
            color: v.color,
            price: v.price,
            stock_quantity: v.stock_quantity,
            is_primary: v.is_primary,
            sku: v.sku,
          }));

          await ProductVariation.bulkCreate(newVariationsData, { transaction });
        }

        // Delete removed variations
        if (variationsToDelete.length > 0) {
          await ProductVariation.destroy({
            where: {
              variation_id: variationsToDelete,
              product_id: product_id
            },
            transaction
          });
        }
      }

      // Handle image deletions
      if (req.body.deleted_image_ids) {
        let idsToDelete = req.body.deleted_image_ids;
        if (!Array.isArray(idsToDelete)) {
          idsToDelete = [idsToDelete];
        }

        await ProductImage.destroy({
          where: {
            image_id: idsToDelete,
            product_id: product_id
          },
          transaction
        });
      }

      // Handle new product images
      if (req.files && req.files.product_images && req.files.product_images.length > 0) {
        const newImages = req.files.product_images.map((file, index) => ({
          product_id: product_id,
          image_url: file.path,
          is_primary: false,
          display_order: index,
        }));

        await ProductImage.bulkCreate(newImages, { transaction });
      }

      // Commit transaction
      await transaction.commit();

      // Get updated product with all relations
      const updatedProduct = await Product.findByPk(product_id, {
        include: [
          { model: ProductImage, as: 'images' },
          { model: ProductVariation, as: 'variations' }
        ]
      });

      res.json({
        message: "Product updated successfully",
        product: updatedProduct,
      });

    } catch (error) {
      await transaction.rollback();
      next(error);
    }
  }
];

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
        {
          model: Payment,
          as: "payment",
          attributes: ["payment_id", "payment_method", "payment_status", "provider"],
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

exports.getOrderDetail = async (req, res, next) => {
  try {
    const { order_id } = req.params

    const order = await Order.findOne({
      where: { order_id },
      include: [
        {
          model: OrderItem,
          as: "items",
          include: [
            {
              model: ProductVariation,
              as: "variation",
              include: [{ model: Product, as: "product" }],
            },
          ],
        },
        {
          model: Payment,
          as: "payment",
        },
        {
          model: User,
          as: "user",
          attributes: ["user_id", "username", "email", "full_name", "phone_number"],
        },
      ],
    })

    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    res.json({ order })
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

    const oldStatus = order.status;
    await order.update({ status })

    // Gửi email thông báo cập nhật trạng thái
    try {
      const { sendOrderUpdateEmail } = require("../services/emailService");
      const { User } = require('../models');
      const user = await User.findByPk(order.user_id);

      if (user) {
        sendOrderUpdateEmail({
          order,
          changeType: 'ORDER_STATUS',
          oldData: { status: oldStatus },
          newData: { status: order.status },
          user
        }).catch(err => console.error("Order status update email failed:", err));
      }
    } catch (emailError) {
      console.error("Failed to queue order status update email:", emailError);
    }

    res.json({
      message: "Order status updated successfully",
      order,
    })
  } catch (error) {
    next(error)
  }
}

// Ship order (processing -> shipping)
exports.shipOrder = async (req, res, next) => {
  try {
    const { order_id } = req.params

    const order = await Order.findByPk(order_id)
    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    if (order.status !== 'processing') {
      return res.status(400).json({ message: "Order must be in processing status to ship" })
    }

    const oldStatus = order.status;
    await order.update({ status: 'shipping' })

    // Gửi email thông báo bắt đầu giao hàng
    try {
      const { sendOrderUpdateEmail } = require("../services/emailService");
      const { User } = require('../models');
      const user = await User.findByPk(order.user_id);

      if (user) {
        sendOrderUpdateEmail({
          order,
          changeType: 'ORDER_STATUS',
          oldData: { status: oldStatus },
          newData: { status: 'shipping' },
          user
        }).catch(err => console.error("Order shipping email failed:", err));
      }
    } catch (emailError) {
      console.error("Failed to queue order shipping email:", emailError);
    }

    res.json({
      message: "Order shipped successfully",
      order,
    })
  } catch (error) {
    next(error)
  }
}

// Deliver order (shipping -> delivered)
exports.deliverOrder = async (req, res, next) => {
  try {
    const { order_id } = req.params

    const order = await Order.findByPk(order_id)
    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    if (order.status !== 'shipping') {
      return res.status(400).json({ message: "Order must be in shipping status to deliver" })
    }

    const oldStatus = order.status;
    await order.update({ status: 'delivered' })

    // Gửi email thông báo giao hàng thành công
    try {
      const { sendOrderUpdateEmail } = require("../services/emailService");
      const { User } = require('../models');
      const user = await User.findByPk(order.user_id);

      if (user) {
        sendOrderUpdateEmail({
          order,
          changeType: 'ORDER_STATUS',
          oldData: { status: oldStatus },
          newData: { status: 'delivered' },
          user
        }).catch(err => console.error("Order delivery email failed:", err));
      }
    } catch (emailError) {
      console.error("Failed to queue order delivery email:", emailError);
    }

    res.json({
      message: "Order delivered successfully",
      order,
    })
  } catch (error) {
    next(error)
  }
}

// Refund order (for cancelled VNPAY orders)
exports.refundOrder = async (req, res, next) => {
  try {
    const { order_id } = req.params

    const order = await Order.findByPk(order_id, {
      include: [{ model: Payment, as: 'payment' }]
    })
    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    if (order.status !== 'cancelled') {
      return res.status(400).json({ message: "Order must be cancelled to refund" })
    }

    if (order.payment?.provider !== 'VNPAY') {
      return res.status(400).json({ message: "Only VNPAY orders can be refunded through admin" })
    }

    // Update payment status to indicate refund processed
    if (order.payment) {
      await order.payment.update({ payment_status: 'refunded' })
    }

    // Gửi email thông báo hoàn tiền
    try {
      const { sendOrderUpdateEmail } = require("../services/emailService");
      const { User } = require('../models');
      const user = await User.findByPk(order.user_id);

      if (user) {
        sendOrderUpdateEmail({
          order,
          changeType: 'ORDER_REFUND',
          oldData: {},
          newData: {
            amount: order.final_amount,
            provider: order.payment?.provider
          },
          user
        }).catch(err => console.error("Order refund email failed:", err));
      }
    } catch (emailError) {
      console.error("Failed to queue order refund email:", emailError);
    }

    res.json({
      message: "Order refunded successfully",
      order,
    })
  } catch (error) {
    next(error)
  }
}

// User Management
exports.getAllUsers = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20,
      // ĐỌC THÊM tham số sort và order từ query
      sort = "created_at", // Mặc định là created_at
      order = "DESC"      // Mặc định là DESC
    } = req.query

    const offset = (page - 1) * limit
    
    // Whitelist và kiểm tra các tham số sắp xếp
    const allowedSort = ["user_id", "username", "created_at", "last_login", "email"]
    const sortField = allowedSort.includes(sort) ? sort : "created_at"
    const sortOrder = ["ASC", "DESC"].includes(order.toUpperCase()) ? order.toUpperCase() : "DESC"

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
      
      // ÁP DỤNG SẮP XẾP MỚI
      order: [[sortField, sortOrder]], 

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

exports.createCategory = [
  uploadProductFiles,
  async (req, res, next) => {
    try {
      const { category_name, description, display_order } = req.body

      // Auto generate slug
      const slug = category_name.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-')

      // Check if slug already exists
      const existingCategory = await Category.findOne({ where: { slug } })
      if (existingCategory) {
        return res.status(400).json({ message: "Slug already exists. Please choose a different category name." })
      }

      // Handle icon upload
      let icon_url = null
      if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
        icon_url = req.files.thumbnail[0].path
      }

      const category = await Category.create({
        category_name,
        slug,
        description,
        display_order: display_order || 0,
        icon_url,
      })

      res.status(201).json({
        message: "Category created successfully",
        category,
      })
    } catch (error) {
      next(error)
    }
  }
]

exports.updateCategory = [
  uploadProductFiles,
  async (req, res, next) => {
    try {
      const { category_id } = req.params
      const { category_name, description, display_order } = req.body

      const category = await Category.findByPk(category_id)
      if (!category) {
        return res.status(404).json({ message: "Category not found" })
      }

      const updateData = {
        description,
        display_order: display_order || 0
      }

      // Update category_name and slug if changed
      if (category_name && category_name !== category.category_name) {
        const slug = category_name.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-')

        // Check if new slug conflicts with other categories
        const existingCategory = await Category.findOne({
          where: { slug, category_id: { [Op.ne]: category_id } }
        })
        if (existingCategory) {
          return res.status(400).json({ message: "Slug already exists. Please choose a different category name." })
        }

        updateData.category_name = category_name
        updateData.slug = slug
      }

      // Handle icon upload
      if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
        updateData.icon_url = req.files.thumbnail[0].path
      }

      await category.update(updateData)

      res.json({
        message: "Category updated successfully",
        category,
      })
    } catch (error) {
      next(error)
    }
  }
]

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

// Role Management
exports.getAllRoles = async (req, res, next) => {
  try {
    const roles = await Role.findAll({
      include: [
        {
          model: User,
          through: { attributes: [] },
        },
      ],
    })

    res.json({ roles })
  } catch (error) {
    next(error)
  }
}

exports.createRole = async (req, res, next) => {
  try {
    const { role_name, description } = req.body

    const role = await Role.create({ role_name, description })

    res.status(201).json({
      message: "Role created successfully",
      role,
    })
  } catch (error) {
    next(error)
  }
}

exports.updateRole = async (req, res, next) => {
  try {
    const { role_id } = req.params

    const role = await Role.findByPk(role_id)
    if (!role) {
      return res.status(404).json({ message: "Role not found" })
    }

    await role.update(req.body)

    res.json({
      message: "Role updated successfully",
      role,
    })
  } catch (error) {
    next(error)
  }
}

exports.deleteRole = async (req, res, next) => {
  try {
    const { role_id } = req.params

    const role = await Role.findByPk(role_id)
    if (!role) {
      return res.status(404).json({ message: "Role not found" })
    }

    // Check if role is assigned to users
    const userCount = await role.countUsers()
    if (userCount > 0) {
      return res.status(400).json({ message: "Cannot delete role with assigned users" })
    }

    await role.destroy()

    res.json({ message: "Role deleted successfully" })
  } catch (error) {
    next(error)
  }
}

exports.updateUserRoles = async (req, res, next) => {
  try {
    const { user_id } = req.params
    const { role_ids } = req.body

    const user = await User.findByPk(user_id)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    const roles = await Role.findAll({ where: { role_id: role_ids } })
    await user.setRoles(roles)

    res.json({
      message: "User roles updated successfully",
      user: {
        user_id: user.user_id,
        username: user.username,
        roles: roles.map(r => ({ role_id: r.role_id, role_name: r.role_name })),
      },
    })
  } catch (error) {
    next(error)
  }
}

// Analytics & Dashboard
exports.getDashboardAnalytics = async (req, res, next) => {
  try {
    const { period = '30' } = req.query
    const periodDays = parseInt(period)

    // Calculate date range for period
    const periodStartDate = new Date()
    periodStartDate.setDate(periodStartDate.getDate() - periodDays)

    // Get total counts (all time)
    const [totalUsers, totalProducts] = await Promise.all([
      User.count(),
      Product.count({ where: { is_active: true } }),
    ])

    // Get period-specific data
    const [totalOrders, totalRevenue, totalDiscount, deliveredOrders] = await Promise.all([
      Order.count({
        where: {
          created_at: { [Op.gte]: periodStartDate }
        }
      }),
      Order.sum('final_amount', {
        where: {
          status: 'delivered',
          created_at: { [Op.gte]: periodStartDate }
        }
      }),
      Order.sum('discount_amount', {
        where: {
          status: 'delivered',
          created_at: { [Op.gte]: periodStartDate }
        }
      }),
      Order.count({
        where: {
          status: 'delivered',
          created_at: { [Op.gte]: periodStartDate }
        }
      }),
    ])

    // Calculate AOV (Average Order Value) and success rate for period
    const aov = deliveredOrders > 0 ? (totalRevenue || 0) / deliveredOrders : 0
    const successRate = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0

    // Get recent orders (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentOrders = await Order.count({
      where: {
        created_at: { [Op.gte]: sevenDaysAgo },
      },
    })

    // Get sales data for the period (for line chart)
    const salesData = await Order.findAll({
      attributes: [
        [Sequelize.fn('DATE', Sequelize.col('created_at')), 'date'],
        [Sequelize.fn('COUNT', Sequelize.col('order_id')), 'order_count'],
        [Sequelize.fn('SUM', Sequelize.col('final_amount')), 'total_revenue'],
      ],
      where: {
        created_at: { [Op.gte]: periodStartDate },
        status: 'delivered'
      },
      group: [Sequelize.fn('DATE', Sequelize.col('created_at'))],
      order: [[Sequelize.fn('DATE', Sequelize.col('created_at')), 'ASC']],
      raw: true,
    })

    // Get order status breakdown
    const orderStatusStats = await Order.findAll({
      attributes: [
        'status',
        [Sequelize.fn('COUNT', Sequelize.col('order_id')), 'count'],
      ],
      group: ['status'],
      raw: true,
    })

    // Get low stock alerts (10 products/variations with lowest stock)
    const lowStockAlertsRaw = await sequelize.query(`
      SELECT
        pv.variation_id,
        pv.sku,
        pv.stock_quantity,
        p.product_name,
        p.thumbnail_url
      FROM product_variations pv
      JOIN products p ON pv.product_id = p.product_id
      WHERE pv.stock_quantity > 0
        AND pv.is_available = true
        AND p.is_active = true
      ORDER BY pv.stock_quantity ASC
      LIMIT 10
    `, {
      type: Sequelize.QueryTypes.SELECT,
      raw: true,
    })

    // Transform to match frontend expected format
    const lowStockAlerts = lowStockAlertsRaw.map(item => ({
      variation_id: item.variation_id,
      sku: item.sku,
      stock_quantity: item.stock_quantity,
      'product.product_name': item.product_name,
      'product.thumbnail_url': item.thumbnail_url,
    }))

    // Get sales by category (simplified query)
    const salesByCategory = await sequelize.query(`
      SELECT
        c.category_name,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.price * oi.quantity) as total_revenue
      FROM order_items oi
      JOIN product_variations pv ON oi.variation_id = pv.variation_id
      JOIN products p ON pv.product_id = p.product_id
      JOIN categories c ON p.category_id = c.category_id
      GROUP BY c.category_id, c.category_name
      ORDER BY total_revenue DESC
      LIMIT 5
    `, {
      type: Sequelize.QueryTypes.SELECT,
      raw: true,
    })

    // Get sales by brand (simplified query)
    const salesByBrand = await sequelize.query(`
      SELECT
        b.brand_name,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.price * oi.quantity) as total_revenue
      FROM order_items oi
      JOIN product_variations pv ON oi.variation_id = pv.variation_id
      JOIN products p ON pv.product_id = p.product_id
      JOIN brands b ON p.brand_id = b.brand_id
      GROUP BY b.brand_id, b.brand_name
      ORDER BY total_revenue DESC
      LIMIT 5
    `, {
      type: Sequelize.QueryTypes.SELECT,
      raw: true,
    })

    // Get top selling products with better details (simplified query)
    const topProducts = await sequelize.query(`
      SELECT
        pv.sku,
        pv.processor,
        pv.ram,
        pv.storage,
        p.product_name,
        p.thumbnail_url,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.price * oi.quantity) as total_revenue
      FROM order_items oi
      JOIN product_variations pv ON oi.variation_id = pv.variation_id
      JOIN products p ON pv.product_id = p.product_id
      GROUP BY pv.variation_id, pv.sku, pv.processor, pv.ram, pv.storage, p.product_id, p.product_name, p.thumbnail_url
      ORDER BY total_quantity DESC
      LIMIT 5
    `, {
      type: Sequelize.QueryTypes.SELECT,
      raw: true,
    })

    // Transform to match frontend expected format
    const formattedTopProducts = topProducts.map(product => ({
      sku: product.sku,
      processor: product.processor,
      ram: product.ram,
      storage: product.storage,
      total_quantity: product.total_quantity,
      total_revenue: product.total_revenue,
      'product.product_name': product.product_name,
      'product.thumbnail_url': product.thumbnail_url,
    }))

    res.json({
      totals: {
        users: totalUsers,
        products: totalProducts,
        orders: totalOrders,
        revenue: totalRevenue || 0,
        discount: totalDiscount || 0,
        aov: Math.round(aov),
        success_rate: Math.round(successRate * 100) / 100,
      },
      recent: {
        orders_last_7_days: recentOrders,
      },
      order_status_breakdown: orderStatusStats,
      low_stock_alerts: lowStockAlerts,
      sales_by_category: salesByCategory,
      sales_by_brand: salesByBrand,
      top_products: formattedTopProducts,
      sales_data: salesData,
    })
  } catch (error) {
    next(error)
  }
}

exports.getSalesAnalytics = async (req, res, next) => {
  try {
    const { period = '30' } = req.query // days
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(period))

    // Daily sales data
    const salesData = await Order.findAll({
      attributes: [
        [Sequelize.fn('DATE', Sequelize.col('created_at')), 'date'],
        [Sequelize.fn('COUNT', Sequelize.col('order_id')), 'order_count'],
        [Sequelize.fn('SUM', Sequelize.col('final_amount')), 'total_revenue'],
      ],
      where: {
        created_at: { [Op.gte]: startDate },
        status: 'delivered', // Only completed orders
      },
      group: [Sequelize.fn('DATE', Sequelize.col('created_at'))],
      order: [[Sequelize.fn('DATE', Sequelize.col('created_at')), 'ASC']],
      raw: true,
    })

    // Monthly comparison
    const currentMonth = new Date()
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)

    const [currentMonthSales, lastMonthSales] = await Promise.all([
      Order.sum('final_amount', {
        where: {
          created_at: {
            [Op.gte]: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
            [Op.lt]: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
          },
          status: 'delivered',
        },
      }),
      Order.sum('final_amount', {
        where: {
          created_at: {
            [Op.gte]: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
            [Op.lt]: new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 1),
          },
          status: 'delivered',
        },
      }),
    ])

    res.json({
      sales_data: salesData,
      comparison: {
        current_month: currentMonthSales || 0,
        last_month: lastMonthSales || 0,
        growth_percentage: lastMonthSales
          ? ((currentMonthSales - lastMonthSales) / lastMonthSales * 100).toFixed(2)
          : 0,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Brand Management
exports.getAllBrands = async (req, res, next) => {
  try {
    const brands = await Brand.findAll({
      order: [["brand_name", "ASC"]],
    })

    res.json({ brands })
  } catch (error) {
    next(error)
  }
}

exports.getBrandById = async (req, res, next) => {
  try {
    const { brand_id } = req.params

    const brand = await Brand.findByPk(brand_id)
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" })
    }

    res.json({ brand })
  } catch (error) {
    next(error)
  }
}

exports.createBrand = [
  uploadProductFiles,
  async (req, res, next) => {
    try {
      const { brand_name, description } = req.body

      // Auto generate slug
      const slug = brand_name.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-')

      // Check if slug already exists
      const existingBrand = await Brand.findOne({ where: { slug } })
      if (existingBrand) {
        return res.status(400).json({ message: "Slug already exists. Please choose a different brand name." })
      }

      // Handle logo upload
      let logo_url = null
      if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
        logo_url = req.files.thumbnail[0].path
      }

      const brand = await Brand.create({
        brand_name,
        slug,
        description,
        logo_url,
      })

      res.status(201).json({
        message: "Brand created successfully",
        brand,
      })
    } catch (error) {
      next(error)
    }
  }
]

exports.updateBrand = [
  uploadProductFiles,
  async (req, res, next) => {
    try {
      const { brand_id } = req.params
      const { brand_name, description } = req.body

      const brand = await Brand.findByPk(brand_id)
      if (!brand) {
        return res.status(404).json({ message: "Brand not found" })
      }

      const updateData = { description }

      // Update brand_name and slug if changed
      if (brand_name && brand_name !== brand.brand_name) {
        const slug = brand_name.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-')

        // Check if new slug conflicts with other brands
        const existingBrand = await Brand.findOne({
          where: { slug, brand_id: { [Op.ne]: brand_id } }
        })
        if (existingBrand) {
          return res.status(400).json({ message: "Slug already exists. Please choose a different brand name." })
        }

        updateData.brand_name = brand_name
        updateData.slug = slug
      }

      // Handle logo upload
      if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
        updateData.logo_url = req.files.thumbnail[0].path
      }

      await brand.update(updateData)

      res.json({
        message: "Brand updated successfully",
        brand,
      })
    } catch (error) {
      next(error)
    }
  }
]

exports.deleteBrand = async (req, res, next) => {
  try {
    const { brand_id } = req.params

    const brand = await Brand.findByPk(brand_id)
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" })
    }

    // Check if brand is being used by any products
    const productCount = await brand.countProducts()
    if (productCount > 0) {
      return res.status(400).json({
        message: `Cannot delete brand "${brand.brand_name}" because it is associated with ${productCount} product(s). Please reassign or remove these products first.`
      })
    }

    await brand.destroy()

    res.json({ message: "Brand deleted successfully" })
  } catch (error) {
    next(error)
  }
}
