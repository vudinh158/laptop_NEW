const {
  Product,
  ProductVariation,
  ProductImage,
  Category,
  Brand,
  Tag,
  Question,
  Answer,
  User,
} = require("../models");
const { Op, Sequelize } = require("sequelize");

// helper: nhận string CSV, array, hoặc single → trả về mảng số
const parseIdList = (input) => {
  if (!input) return [];
  if (Array.isArray(input)) return input.map((x) => Number(x)).filter(Boolean);
  return String(input)
    .split(",")
    .map((x) => Number(x.trim()))
    .filter(Boolean);
};
// Get all products with filters
exports.getProducts = async (req, res, next) => {
  try {
    // Ép kiểu và giá trị mặc định cho phân trang và sắp xếp
    const page = Math.max(1, Number.parseInt(req.query.page ?? 1));
    const limit = Math.max(1, Number.parseInt(req.query.limit ?? 12));
    const offset = (page - 1) * limit;

    // Whitelist sort/order để chống SQL Injection
    const allowedSort = new Set([
      "created_at",
      "base_price",
      "rating_average",
      "view_count",
      "product_name",
    ]);
    const allowedOrder = new Set(["ASC", "DESC"]);
    const sort = allowedSort.has(req.query.sort)
      ? req.query.sort
      : "created_at";
    const order = allowedOrder.has((req.query.order ?? "").toUpperCase())
      ? req.query.order.toUpperCase()
      : "DESC";

    // Lấy các tham số lọc
    const categoryIds = parseIdList(
      req.query.category_id || req.query["category_id[]"]
    );
    const brandIds = parseIdList(req.query.brand_id || req.query["brand_id[]"]);

    const minPrice =
      req.query.min_price != null ? Number(req.query.min_price) : undefined;
    const maxPrice =
      req.query.max_price != null ? Number(req.query.max_price) : undefined;
    
    // ĐỌC THAM SỐ TÌM KIẾM TỪ HEADER (search query)
    const search = (req.query.search || "").trim();

    const where = { is_active: true };

    // Lọc theo Danh mục
    if (categoryIds.length === 1) where.category_id = categoryIds[0];
    else if (categoryIds.length > 1)
      where.category_id = { [Op.in]: categoryIds };

    // Lọc theo Thương hiệu
    if (brandIds.length === 1) where.brand_id = brandIds[0];
    else if (brandIds.length > 1) where.brand_id = { [Op.in]: brandIds };

    // LỌC THEO TỪ KHÓA TÌM KIẾM
    if (search) {
      // Sử dụng Op.iLike (case-insensitive LIKE cho PostgreSQL) để tìm kiếm
      where.product_name = { [Op.iLike]: `%${search}%` };
    }

    // Lọc theo khoảng giá
    if (minPrice != null || maxPrice != null) {
      where.base_price = {};
      if (minPrice != null) where.base_price[Op.gte] = minPrice;
      if (maxPrice != null) where.base_price[Op.lte] = maxPrice;
    }

    const { count, rows } = await Product.findAndCountAll({
      where, // Áp dụng tất cả các điều kiện lọc (bao gồm tìm kiếm)
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["category_id", "category_name", "slug"],
        },
        {
          model: Brand,
          as: "brand",
          attributes: ["brand_id", "brand_name", "slug", "logo_url"],
        },
        {
          model: ProductVariation,
          as: "variations",
          attributes: ["variation_id", "price", "stock_quantity"],
        },
        {
          model: ProductImage,
          as: "images",
          where: { is_primary: true },
          required: false,
          attributes: ["image_url"],
        },
      ],
      limit,
      offset,
      order: [[sort, order]],
      distinct: true, 
    });

    res.json({
      products: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
      total: count,
      totalPages: Math.ceil(count / limit),
    });
  } catch (error) {
    next(error);
  }
};

// Get product by ID or slug
exports.getProductDetail = async (req, res, next) => {
  try {
    const { id } = req.params;

    const where = isNaN(id) ? { slug: id } : { product_id: id };

    const product = await Product.findOne({
      where: { ...where, is_active: true },
      attributes: { include: ["specs"] },

      include: [
        { model: Category, as: "category" },
        { model: Brand, as: "brand" },
        { model: ProductVariation, as: "variations" },
        {
          model: ProductImage,
          as: "images",
          order: [["display_order", "ASC"]],
        },
        { model: Tag, through: { attributes: [] } },
        {
          model: Question,
          as: "questions",
          attributes: [
            "question_id",
            "question_text",
            "is_answered",
            "created_at",
          ],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["user_id", "username", "full_name"], // ẩn email/password
            },
            {
              model: Answer,
              as: "answers",
              attributes: ["answer_id", "answer_text", "created_at"],
              include: [
                {
                  model: User,
                  as: "user",
                  attributes: ["user_id", "username", "full_name"],
                },
              ],
            },
          ],
        },
      ],
      order: [
        [{ model: ProductImage, as: "images" }, "display_order", "ASC"],
        [{ model: Question, as: "questions" }, "created_at", "DESC"], // câu hỏi mới nhất trước
        [
          { model: Question, as: "questions" },
          { model: Answer, as: "answers" },
          "created_at",
          "ASC", // câu trả lời cũ trước
        ],
      ],
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Increment view count
    await product.increment("view_count");

    // Bảo vệ: nếu specs null thì trả về {}
    const json = product.toJSON();
    if (json.specs == null) json.specs = {};

    return res.json({ product: json });
  } catch (error) {
    next(error);
  }
};

exports.getSearchSuggestions = async (req, res, next) => {
  try {
    const search = (req.query.q || "").trim();
    if (search.length < 2) {
      return res.json({ products: [] });
    }

    const products = await Product.findAll({
      where: {
        is_active: true,
        product_name: { [Op.iLike]: `%${search}%` },
      },
      attributes: [
        "product_id",
        "product_name",
        "slug",
        "thumbnail_url",
        "base_price",
        "discount_percentage",
      ],
      include: [
        {
          model: ProductVariation,
          as: "variations",
          attributes: ["price"],
          limit: 1, // Lấy variation đầu tiên để tính giá
        },
        {
          model: ProductImage,
          as: "images",
          where: { is_primary: true },
          required: false,
          attributes: ["image_url"],
        },
      ],
      limit: 5, // Chỉ giới hạn 5 kết quả gợi ý
    });

    res.json({ products });
  } catch (error) {
    next(error);
  }
};

// Get recommended products
exports.getRecommendedProducts = async (req, res, next) => {
  try {
    const { product_id } = req.params;
    const { limit = 4 } = req.query;

    const currentProduct = await Product.findByPk(product_id);
    if (!currentProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Get products from same category or brand
    const products = await Product.findAll({
      where: {
        product_id: { [Op.ne]: product_id },
        is_active: true,
        [Op.or]: [
          { category_id: currentProduct.category_id },
          { brand_id: currentProduct.brand_id },
        ],
      },
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["category_id", "category_name"],
        },
        {
          model: Brand,
          as: "brand",
          attributes: ["brand_id", "brand_name", "logo_url"],
        },
        // ĐÃ SỬA: BẮT BUỘC INCLUDE VARIATIONS VÀ IMAGES
        {
          model: ProductVariation,
          as: "variations",
          attributes: [
            "variation_id",
            "price",
            "stock_quantity",
          ],
          limit: 1,
        },
        {
          model: ProductImage,
          as: "images",
          where: { is_primary: true },
          required: false,
          attributes: ["image_url"],
        },
      ],
      limit: Number.parseInt(limit),
      order: [
        ["rating_average", "DESC"],
        ["view_count", "DESC"],
      ],
    });

    res.json({ products });
  } catch (error) {
    next(error);
  }
};

// Get all categories
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.findAll({
      order: [["display_order", "ASC"]],
    });

    res.json({ categories });
  } catch (error) {
    next(error);
  }
};

// Get all brands
exports.getBrands = async (req, res, next) => {
  try {
    const brands = await Brand.findAll({
      order: [["brand_name", "ASC"]],
    });

    res.json({ brands });
  } catch (error) {
    next(error);
  }
};

// Tạo câu hỏi
exports.createQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;                    // id hoặc slug
    const { question_text } = req.body;
    if (!question_text || !question_text.trim()) {
      return res.status(400).json({ message: "question_text is required" });
    }

    const whereKey = /^\d+$/.test(String(id)) ? { product_id: id } : { slug: id };
    const product = await Product.findOne({ where: whereKey });
    if (!product) return res.status(404).json({ message: "Product not found" });

    const q = await Question.create({
      product_id: product.product_id,
      user_id: req.userId,          // lấy từ middleware authenticateToken
      question_text: question_text.trim(),
      is_answered: false,
    });

    return res.status(201).json({ question: q });
  } catch (err) { next(err); }
};

// Trả lời câu hỏi
exports.createAnswer = async (req, res, next) => {
  try {
    const { question_id } = req.params;
    const { answer_text } = req.body;

    if (!answer_text || !answer_text.trim()) {
      return res.status(400).json({ message: "answer_text is required" });
    }

    const q = await Question.findByPk(question_id);
    if (!q) return res.status(404).json({ message: "Question not found" });

    const a = await Answer.create({
      question_id: q.question_id,
      user_id: req.userId,          // người trả lời (có thể là admin/staff)
      answer_text: answer_text.trim(),
    });

    // cập nhật cờ đã có trả lời (nếu muốn)
    if (!q.is_answered) {
      await q.update({ is_answered: true });
    }

    return res.status(201).json({ answer: a });
  } catch (err) { next(err); }
};


exports.compareProducts = async (req, res, next) => {
  try {
    // nhận ids: [1,2,3] hoặc query '1,2,3'
    const ids = Array.isArray(req.body.ids)
      ? req.body.ids
      : String(req.query.ids || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

    if (!ids.length) {
      return res
        .status(400)
        .json({ message: "ids is required (array or comma-separated)" });
    }

    const products = await Product.findAll({
      where: { product_id: { [Op.in]: ids } },
      attributes: [
        "product_id",
        "product_name",
        "thumbnail_url",
        "base_price",
        "discount_percentage",
        "specs",
      ],
      include: [
        // tuỳ: brand/category nếu muốn show kèm
      ],
    });

    // Chuẩn hoá: hợp nhất danh sách group và label → tạo khung ma trận
    const allGroups = new Set();
    const labelsByGroup = {}; // { group: Set<label> }

    for (const p of products) {
      const specs = p.specs || {};
      Object.keys(specs).forEach((group) => {
        allGroups.add(group);
        if (!labelsByGroup[group]) labelsByGroup[group] = new Set();
        specs[group].forEach((row) => labelsByGroup[group].add(row.label));
      });
    }

    // Biến Set -> Array & sắp xếp nhẹ cho ổn định
    const groups = [...allGroups];
    const normalized = groups.map((group) => {
      const labels = [...(labelsByGroup[group] || [])];
      return {
        group,
        rows: labels.map((label) => ({
          label,
          values: products.map((p) => {
            const list = p.specs?.[group] || [];
            const found = list.find((r) => r.label === label);
            return found?.value || "—";
          }),
        })),
      };
    });

    res.json({
      products: products.map((p) => ({
        id: p.product_id,
        name: p.product_name,
        thumbnail_url: p.thumbnail_url,
        base_price: p.base_price,
        discount_percentage: p.discount_percentage,
      })),
      compare: normalized,
    });
  } catch (err) {
    next(err);
  }
};
