const { Product, ProductVariation, ProductImage, Category, Brand, Tag } = require("../models")
const { Op } = require("sequelize")

// helper: nhận string CSV, array, hoặc single → trả về mảng số
const parseIdList = (input) => {
  if (!input) return []
  if (Array.isArray(input)) return input.map((x) => Number(x)).filter(Boolean)
  return String(input)
    .split(",")
    .map((x) => Number(x.trim()))
    .filter(Boolean)
}
// Get all products with filters
exports.getProducts = async (req, res, next) => {
  try {
    // ép kiểu & mặc định an toàn
    const page = Math.max(1, Number.parseInt(req.query.page ?? 1))
    const limit = Math.max(1, Number.parseInt(req.query.limit ?? 12))
    const offset = (page - 1) * limit

    // whitelist sort/order để tránh SQL injection
    const allowedSort = new Set(["created_at", "base_price", "rating_average", "view_count", "product_name"])
    const allowedOrder = new Set(["ASC", "DESC"])
    const sort = allowedSort.has(req.query.sort) ? req.query.sort : "created_at"
    const order = allowedOrder.has((req.query.order ?? "").toUpperCase()) ? req.query.order.toUpperCase() : "DESC"

    // nhận đa giá trị: chấp nhận "id1,id2" hoặc "id[]=1&id[]=2"
    const categoryIds = parseIdList(req.query.category_id || req.query["category_id[]"])
    const brandIds    = parseIdList(req.query.brand_id   || req.query["brand_id[]"])

    const minPrice = req.query.min_price != null ? Number(req.query.min_price) : undefined
    const maxPrice = req.query.max_price != null ? Number(req.query.max_price) : undefined
    const search   = (req.query.search || "").trim()

    const where = { is_active: true }

    // category filter
    if (categoryIds.length === 1) where.category_id = categoryIds[0]
    else if (categoryIds.length > 1) where.category_id = { [Op.in]: categoryIds }

    // brand filter
    if (brandIds.length === 1) where.brand_id = brandIds[0]
    else if (brandIds.length > 1) where.brand_id = { [Op.in]: brandIds }

    // search (Postgres → iLike; nếu MySQL dùng Op.like)
    if (search) {
      where.product_name = { [Op.iLike]: `%${search}%` }
    }

    // price range
    if (minPrice != null || maxPrice != null) {
      where.base_price = {}
      if (minPrice != null) where.base_price[Op.gte] = minPrice
      if (maxPrice != null) where.base_price[Op.lte] = maxPrice
    }

    const { count, rows } = await Product.findAndCountAll({
      where,
      include: [
        { model: Category, as: "category", attributes: ["category_id", "category_name", "slug"] },
        { model: Brand,    as: "brand",    attributes: ["brand_id", "brand_name", "slug", "logo_url"] },
        { model: ProductVariation, as: "variations", attributes: ["variation_id", "price", "stock_quantity"] },
        { model: ProductImage,     as: "images", where: { is_primary: true }, required: false, attributes: ["image_url"] },
      ],
      limit,
      offset,
      order: [[sort, order]],
      distinct: true, // count đúng khi có include
    })

    res.json({
      products: rows,
      // GIỮ NGUYÊN format bạn đang dùng
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
      // (tuỳ chọn) thêm alias để FE nào đọc thẳng cũng ok
      total: count,
      totalPages: Math.ceil(count / limit),
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
