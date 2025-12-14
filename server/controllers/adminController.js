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
  // Bắt đầu transaction để đảm bảo dữ liệu nhất quán
  const t = await sequelize.transaction();

  try {
    const { product_id } = req.params;
    
    // Tìm sản phẩm
    const product = await Product.findByPk(product_id);
    if (!product) {
      await t.rollback();
      return res.status(404).json({ message: "Product not found" });
    }

    // 1. Chuẩn bị dữ liệu update từ text fields
    const updateData = { ...req.body };

    // 2. Xử lý THUMBNAIL (Ảnh đại diện)
    // Nếu có file 'thumbnail' gửi lên, cập nhật URL vào bảng Product
    if (req.files && req.files['thumbnail'] && req.files['thumbnail'][0]) {
        updateData.thumbnail_url = req.files['thumbnail'][0].path; 
    }

    // 3. Xử lý GALLERY IMAGES (Ảnh chi tiết)
    // Nếu có file 'images' gửi lên, thêm vào bảng ProductImage
    if (req.files && req.files['images']) {
        const newImages = req.files['images'].map(file => ({
            product_id: product.product_id,
            image_url: file.path, // URL từ Cloudinary
            is_primary: false     // Mặc định là ảnh phụ
        }));
        
        await ProductImage.bulkCreate(newImages, { transaction: t });
    }

    // 4. Xử lý XÓA ẢNH CŨ (Nếu có)
    if (req.body.deleted_image_ids) {
        // req.body.deleted_image_ids có thể là string hoặc array tùy cách gửi của FormData
        // Nếu chỉ có 1 ID, nó là string. Nếu nhiều, multer có thể gộp hoặc ta cần xử lý.
        // Cách an toàn nhất là ép về mảng.
        let idsToDelete = req.body.deleted_image_ids;
        if (!Array.isArray(idsToDelete)) {
            idsToDelete = [idsToDelete];
        }
        
        await ProductImage.destroy({
            where: { 
                image_id: idsToDelete,
                product_id: product_id // Chỉ xóa ảnh của sản phẩm này để an toàn
            },
            transaction: t
        });
    }

    // 5. Thực hiện update thông tin sản phẩm
    await product.update(updateData, { transaction: t });

    // Commit transaction
    await t.commit();

    // 6. Lấy lại dữ liệu mới nhất để trả về cho Client
    const updatedProduct = await Product.findByPk(product_id, {
      include: [{ model: ProductImage, as: 'images' }]
    });

    res.json({
      message: "Product updated successfully",
      product: updatedProduct,
    });

  } catch (error) {
    // Nếu lỗi, rollback mọi thay đổi
    await t.rollback();
    next(error);
  }
};

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
