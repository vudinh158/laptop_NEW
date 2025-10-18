const { Product, ProductVariation, ProductImage, Category, Brand, Tag } = require("../models")
const { Op } = require("sequelize")

// Get all products with filters
exports.getProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 12,
      category_id,
      brand_id,
      min_price,
      max_price,
      search,
      sort = "created_at",
      order = "DESC",
    } = req.query

    const offset = (page - 1) * limit
    const where = { is_active: true }

    // Filters
    if (category_id) where.category_id = category_id
    if (brand_id) where.brand_id = brand_id
    if (search) {
      where.product_name = { [Op.like]: `%${search}%` }
    }
    if (min_price || max_price) {
      where.base_price = {}
      if (min_price) where.base_price[Op.gte] = min_price
      if (max_price) where.base_price[Op.lte] = max_price
    }

    const { count, rows } = await Product.findAndCountAll({
      where,
      include: [
        { model: Category, as: "category", attributes: ["category_id", "category_name", "slug"] },
        { model: Brand, as: "brand", attributes: ["brand_id", "brand_name", "slug", "logo_url"] },
        { model: ProductVariation, as: "variations", attributes: ["variation_id", "price", "stock_quantity"] },
        { model: ProductImage, as: "images", where: { is_primary: true }, required: false },
      ],
      limit: Number.parseInt(limit),
      offset: Number.parseInt(offset),
      order: [[sort, order]],
      distinct: true,
    })

    res.json({
      products: rows,
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

// Get product by ID or slug
exports.getProductDetail = async (req, res, next) => {
  try {
    const { id } = req.params

    const where = isNaN(id) ? { slug: id } : { product_id: id }

    const product = await Product.findOne({
      where: { ...where, is_active: true },
      include: [
        { model: Category, as: "category" },
        { model: Brand, as: "brand" },
        { model: ProductVariation, as: "variations" },
        { model: ProductImage, as: "images", order: [["display_order", "ASC"]] },
        { model: Tag, through: { attributes: [] } },
      ],
    })

    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    // Increment view count
    await product.increment("view_count")

    res.json({ product })
  } catch (error) {
    next(error)
  }
}

// Get recommended products
exports.getRecommendedProducts = async (req, res, next) => {
  try {
    const { product_id } = req.params
    const { limit = 4 } = req.query

    const currentProduct = await Product.findByPk(product_id)
    if (!currentProduct) {
      return res.status(404).json({ message: "Product not found" })
    }

    // Get products from same category or brand
    const products = await Product.findAll({
      where: {
        product_id: { [Op.ne]: product_id },
        is_active: true,
        [Op.or]: [{ category_id: currentProduct.category_id }, { brand_id: currentProduct.brand_id }],
      },
      include: [
        { model: Category, as: "category", attributes: ["category_id", "category_name"] },
        { model: Brand, as: "brand", attributes: ["brand_id", "brand_name", "logo_url"] },
        // ĐÃ SỬA: BẮT BUỘC INCLUDE VARIATIONS VÀ IMAGES
        { model: ProductVariation, as: "variations", attributes: ["variation_id", "price", "stock_quantity", "discount_percentage"], limit: 1 }, 
        { model: ProductImage, as: "images", where: { is_primary: true }, required: false, attributes: ["image_url"] },
      ],
      limit: Number.parseInt(limit),
      order: [
        ["rating_average", "DESC"],
        ["view_count", "DESC"],
      ],
    })

    res.json({ products })
  } catch (error) {
    next(error)
  }
}

// Get all categories
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.findAll({
      order: [["display_order", "ASC"]],
    })

    res.json({ categories })
  } catch (error) {
    next(error)
  }
}

// Get all brands
exports.getBrands = async (req, res, next) => {
  try {
    const brands = await Brand.findAll({
      order: [["brand_name", "ASC"]],
    })

    res.json({ brands })
  } catch (error) {
    next(error)
  }
}
