// server/controllers/productController.js
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
const axios = require("axios");
const BASE = process.env.RECO_API_BASE || "http://127.0.0.1:8000";
const TIMEOUT = +(process.env.RECO_TIMEOUT_MS || 7000);

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

exports.getProductDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const whereKey = isNaN(Number(id)) ? { slug: id } : { product_id: id };

    const product = await Product.findOne({
      where: { ...whereKey },
      attributes: { include: ["specs", "is_active"] },

      include: [
        { model: Category, as: "category" },
        { model: Brand, as: "brand" },

        // ✔ variations: chọn các cột cần thiết + sắp xếp hợp lý
        {
          model: ProductVariation,
          as: "variations",
          required: false,
          // Nếu muốn chỉ trả về cấu hình còn bán, bật dòng dưới:
          // where: { is_available: true },
          attributes: [
            "variation_id",
            "price",
            "stock_quantity",
            "is_available",
            "is_primary",
            "processor",
            "ram",
            "storage",
            "graphics_card",
            "screen_size",
            "color",
          ],
        },

        // Ảnh: lấy theo thứ tự display_order
        {
          model: ProductImage,
          as: "images",
        },

        { model: Tag, through: { attributes: [] } },
        // trong include: [...]
        {
          model: Question,
          as: "questions",
          attributes: [
            "question_id",
            "question_text",
            "is_answered",
            "created_at",
            "parent_question_id",
          ],
          where: { parent_question_id: null }, 
          required: false,
          include: [
            {
              model: User,
              as: "user",
              attributes: ["user_id", "username", "full_name"],
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
            {
              model: Question, 
              as: "children",
              attributes: [
                "question_id",
                "question_text",
                "is_answered",
                "created_at",
                "parent_question_id",
              ],
              include: [
                {
                  model: User,
                  as: "user",
                  attributes: ["user_id", "username", "full_name"],
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
        },
      ],

      // ✔ sắp xếp: ảnh theo display_order, hỏi đáp theo thời gian,
      //   variations mình sẽ sort ở FE theo is_primary/stock/price nếu muốn
      order: [
        [{ model: ProductImage, as: "images" }, "display_order", "ASC"],
        [{ model: Question, as: "questions" }, "created_at", "DESC"], // gốc mới trước
        // câu trả lời của gốc
        [
          { model: Question, as: "questions" },
          { model: Answer, as: "answers" },
          "created_at",
          "ASC",
        ],
        // follow-up: cũ trước (thường chỉ 1)
        [
          { model: Question, as: "questions" },
          { model: Question, as: "children" },
          "created_at",
          "ASC",
        ],
        // trả lời của follow-up
        [
          { model: Question, as: "questions" },
          { model: Question, as: "children" },
          { model: Answer, as: "answers" },
          "created_at",
          "ASC",
        ],
      ],
    });

    if (!product) return res.status(404).json({ message: "Product not found" });

    // Tăng view count (best-effort)
    product.increment("view_count").catch(() => {});

    // Chuẩn hóa JSON trả ra
    const json = product.toJSON();
    if (json.specs == null) json.specs = {};

    // ✔ Phòng trường hợp subquery không tìm được primaryVariationId
    if (!json.primaryVariationId && Array.isArray(json.variations) && json.variations.length) {
      const sorted = [...json.variations].sort((a, b) => {
        // is_primary DESC, stock DESC, price ASC
        if (+b.is_primary !== +a.is_primary) return (+b.is_primary) - (+a.is_primary);
        if ((b.stock_quantity ?? 0) !== (a.stock_quantity ?? 0)) return (b.stock_quantity ?? 0) - (a.stock_quantity ?? 0);
        return (a.price ?? Number.MAX_SAFE_INTEGER) - (b.price ?? Number.MAX_SAFE_INTEGER);
      });
      json.primaryVariationId = sorted[0]?.variation_id;
    }

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
// exports.getRecommendedProducts = async (req, res, next) => {
//   try {
//     const { product_id } = req.params;
//     const { limit = 4 } = req.query;

//     const currentProduct = await Product.findByPk(product_id);
//     if (!currentProduct) {
//       return res.status(404).json({ message: "Product not found" });
//     }

//     // Get products from same category or brand
//     const products = await Product.findAll({
//       where: {
//         product_id: { [Op.ne]: product_id },
//         is_active: true,
//         [Op.or]: [
//           { category_id: currentProduct.category_id },
//           { brand_id: currentProduct.brand_id },
//         ],
//       },
//       include: [
//         {
//           model: Category,
//           as: "category",
//           attributes: ["category_id", "category_name"],
//         },
//         {
//           model: Brand,
//           as: "brand",
//           attributes: ["brand_id", "brand_name", "logo_url"],
//         },
//         // ĐÃ SỬA: BẮT BUỘC INCLUDE VARIATIONS VÀ IMAGES
//         {
//           model: ProductVariation,
//           as: "variations",
//           attributes: [
//             "variation_id",
//             "price",
//             "stock_quantity",
//           ],
//           limit: 1,
//         },
//         {
//           model: ProductImage,
//           as: "images",
//           where: { is_primary: true },
//           required: false,
//           attributes: ["image_url"],
//         },
//       ],
//       limit: Number.parseInt(limit),
//       order: [
//         ["rating_average", "DESC"],
//         ["view_count", "DESC"],
//       ],
//     });

//     res.json({ products });
//   } catch (error) {
//     next(error);
//   }
// };

// Get recommend
async function fetchProductMeta(productIds = []) {
  if (!productIds.length) return {};

  const rows = await Product.findAll({
    where: { product_id: { [Op.in]: productIds } },
    attributes: [
      "product_id",
      // đổi "product_name" thành "name" nếu model của bạn map field -> name
      "product_name",
      "slug",
      "rating_average",
      "thumbnail_url",
    ],
    include: [
      {
        model: ProductImage,
        as: "images",
        required: false,
        attributes: ["image_url", "is_primary", "display_order"],
      },
    ],
    order: [
      [{ model: ProductImage, as: "images" }, "is_primary", "DESC"],
      [{ model: ProductImage, as: "images" }, "display_order", "ASC"],
    ],
  });

  const map = {};
  for (const r of rows) {
    const j = r.toJSON();
    const img = j.images?.[0];
    map[j.product_id] = {
      product_name: j.product_name,              // hoặc j.name nếu model đặt alias
      slug: j.slug,
      thumbnail_url: j.thumbnail_url || null,    // ← ưu tiên thumbnail_url từ products
      image: j.thumbnail_url || img?.image_url || null, // fallback sang ảnh primary
      rating_average: j.rating_average || null,
    };
  }
  return map;
}

exports.getRecommendedByVariation = async (req, res) => {
  const variationId = Number(req.params.variation_id);
  if (!variationId) return res.status(400).json({ products: [], error: "invalid variation_id" });

  try {
    const resp = await axios.get(`${BASE}/recommend`, {
      params: { variation_id: variationId },
      timeout: TIMEOUT,
      validateStatus: () => true, // nhận cả 4xx/5xx để đọc body
    });

    if (resp.status >= 400) {
      return res.status(502).json({
        products: [],
        basedOn: { variationId },
        source: "knn",
        error: `upstream_${resp.status}`,
        upstream: resp.data,
      });
    }

    const payload = resp.data;

    // ---- HỖ TRỢ NHIỀU KIỂU SHAPE ----
    // 1) Chuẩn: { items: [...] }
    // 2) Debug mode bạn đang có: { debug: [...] }
    // 3) Hiếm gặp: payload là một mảng luôn
    let raw = Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.debug)
      ? payload.debug
      : Array.isArray(payload)
      ? payload
      : [];

    // (tuỳ chọn) Gộp trùng theo product_id → giữ biến thể có score cao nhất
    // score mặc định lấy performance_score nếu có, rơi về 0
    const bestByProduct = new Map();
    for (const it of raw) {
      const pid = it.product_id ?? it.id;
      const score =
        it.score ??
        it.performance_score ??
        it.rank_score ??
        0;

      const prev = bestByProduct.get(pid);
      if (!prev || score > prev._score) {
        bestByProduct.set(pid, { ...it, _score: score });
      }
    }
    raw = Array.from(bestByProduct.values());

    // Lấy meta từ DB cho các product_id (ảnh, slug, name)
    const productIds = raw.map((x) => x.product_id).filter(Boolean);
    const metaMap = await fetchProductMeta(productIds);

    // Map về shape FE cần
    const products = raw.map((it) => {
      const meta = metaMap[it.product_id] || {};
      return {
        id: it.product_id,                    // FE card link theo product
        variation_id: it.variation_id,        // để deep-link ?v= nếu muốn
        name: meta.product_name || it.product_name,   // ưu tiên DB -> rơi về từ Flask
        image: meta.thumbnail_url,                    // ưu tiên ảnh DB (ổn định)
        slug: meta.slug,
        price: it.price,
        score: it.score ?? it.performance_score ?? null,
        rating_average: meta.rating_average,
        // (tuỳ) thêm nguồn giải thích:
        explain: {
          source: it.source,                  // "fresh" / "indexed"
          score_source: it.score_source,      // "fresh:benchmark", ...
          cpu_source: it.cpu_source,
          gpu_source: it.gpu_source,
        },
      };
    });

    // Sắp xếp theo score giảm dần (nếu có)
    products.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

    return res.json({
      products,
      basedOn: { variationId },
      generated_at: payload.generated_at || new Date().toISOString(),
      source: "knn",
    });
  } catch (e) {
    console.error("getRecommendedByVariation EX:", e);
    return res.status(502).json({
      products: [],
      basedOn: { variationId },
      source: "knn",
      error: "adapter_exception",
      detail: { message: e.message, code: e.code, base: BASE },
    });
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
// === TẠO CÂU HỎI (SỬA: dùng req.user.user_id) ===
exports.createQuestion = async (req, res, next) => {
  try {
    const { id } = req.params; // product_id hoặc slug
    const { question_text, parent_question_id } = req.body;

    if (!question_text || !question_text.trim()) {
      return res.status(400).json({ message: "question_text is required" });
    }

    const whereKey = /^\d+$/.test(String(id))
      ? { product_id: id }
      : { slug: id };
    const product = await Product.findOne({
      where: whereKey,
      attributes: ["product_id"],
    });
    if (!product) return res.status(404).json({ message: "Product not found" });

    let parent = null;
    if (parent_question_id) {
      parent = await Question.findByPk(parent_question_id, {
        attributes: ["question_id", "product_id", "parent_question_id"],
      });
      if (!parent) {
        return res.status(404).json({ message: "Parent question not found" });
      }
      // parent phải là câu gốc
      if (parent.parent_question_id) {
        return res
          .status(400)
          .json({ message: "Only one follow-up level is allowed" });
      }
      // cùng sản phẩm
      if (parent.product_id !== product.product_id) {
        return res
          .status(400)
          .json({ message: "Parent question does not belong to this product" });
      }
      // parent đã được trả lời bởi admin?
      const answered = await Answer.findOne({
        where: { question_id: parent.question_id },
      });
      if (!answered) {
        return res
          .status(400)
          .json({ message: "Parent must be answered before follow-up" });
      }
      // (tuỳ chọn) chỉ chủ sở hữu parent mới được follow-up
      // const owner = await Question.findByPk(parent_question_id, { attributes: ["user_id"] });
      // if (owner && owner.user_id !== req.user.user_id) {
      //   return res.status(403).json({ message: "Only the original asker can follow up" });
      // }
    }

    // Tạo mới
    const q = await Question.create({
      product_id: product.product_id,
      user_id: req.user.user_id,
      question_text: question_text.trim(),
      is_answered: false,
      parent_question_id: parent_question_id || null,
    });

    // Trả về kèm user
    const withUser = await Question.findByPk(q.question_id, {
      attributes: [
        "question_id",
        "question_text",
        "is_answered",
        "created_at",
        "parent_question_id",
      ],
      include: [
        {
          model: User,
          as: "user",
          attributes: ["user_id", "username", "full_name"],
        },
      ],
    });

    return res.status(201).json({ question: withUser });
  } catch (err) {
    // Nếu vi phạm unique (đã có follow-up cho parent), báo 409
    if (err?.name === "SequelizeUniqueConstraintError") {
      return res
        .status(409)
        .json({ message: "This question already has a follow-up" });
    }
    next(err);
  }
};

// === TRẢ LỜI CÂU HỎI (SỬA: dùng req.user.user_id) ===
exports.createAnswer = async (req, res, next) => {
  try {
    const { question_id } = req.params;
    const { answer_text } = req.body;

    if (!answer_text || !answer_text.trim()) {
      return res.status(400).json({ message: "answer_text is required" });
    }

    // role check
    const roles = (req.user.Roles || []).map((r) => r.role_name);
    const isStaff = roles.includes("admin") || roles.includes("staff");
    if (!isStaff) {
      return res.status(403).json({ message: "Only staff can answer" });
    }

    const q = await Question.findByPk(question_id);
    if (!q) return res.status(404).json({ message: "Question not found" });

    const existed = await Answer.findOne({
      where: { question_id: q.question_id },
    });
    if (existed) {
      return res
        .status(409)
        .json({ message: "This question already has an answer" });
    }

    const a = await Answer.create({
      question_id: q.question_id,
      user_id: req.user.user_id,
      answer_text: answer_text.trim(),
    });

    if (!q.is_answered) await q.update({ is_answered: true });

    const withUser = await Answer.findByPk(a.answer_id, {
      attributes: ["answer_id", "answer_text", "created_at"],
      include: [
        {
          model: User,
          as: "user",
          attributes: ["user_id", "username", "full_name"],
        },
      ],
    });

    return res.status(201).json({ answer: withUser });
  } catch (err) {
    if (err?.name === "SequelizeUniqueConstraintError") {
      return res
        .status(409)
        .json({ message: "This question already has an answer" });
    }
    next(err);
  }
};

// === DANH SÁCH CÂU HỎI CỦA 1 PRODUCT (tuỳ bạn dùng hay không; FE bạn đang lấy qua getProductDetail rồi) ===
exports.getProductQuestions = async (req, res, next) => {
  try {
    const { id } = req.params; // product_id hoặc slug
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit || "10", 10))
    );
    const offset = (page - 1) * limit;

    const whereKey = /^\d+$/.test(String(id))
      ? { product_id: id }
      : { slug: id };
    const product = await Product.findOne({
      where: whereKey,
      attributes: ["product_id"],
    });
    if (!product) return res.status(404).json({ message: "Product not found" });

    const { count, rows } = await Question.findAndCountAll({
      where: { product_id: product.product_id },
      attributes: ["question_id", "question_text", "is_answered", "created_at"],
      include: [
        {
          model: User,
          as: "user",
          attributes: ["user_id", "username", "full_name"],
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
      order: [
        ["created_at", "DESC"],
        [{ model: Answer, as: "answers" }, "created_at", "ASC"],
      ],
      limit,
      offset,
    });

    res.json({
      questions: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (e) {
    next(e);
  }
};

// === SỬA CÂU HỎI (chỉ chủ sở hữu hoặc admin/staff) ===
exports.updateQuestion = async (req, res, next) => {
  try {
    const { question_id } = req.params;
    const { question_text } = req.body;
    if (!question_text || !question_text.trim()) {
      return res.status(400).json({ message: "question_text is required" });
    }

    const q = await Question.findByPk(question_id);
    if (!q) return res.status(404).json({ message: "Question not found" });

    const isOwner = q.user_id === req.user.user_id;
    const userRoles = (req.user.Roles || []).map((r) => r.role_name);
    const isStaff = userRoles.includes("admin") || userRoles.includes("staff");
    if (!isOwner && !isStaff) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    await q.update({ question_text: question_text.trim() });
    res.json({ question: q });
  } catch (e) {
    next(e);
  }
};

// === XOÁ CÂU HỎI (chỉ chủ sở hữu hoặc admin/staff); xoá kèm answer ===
exports.deleteQuestion = async (req, res, next) => {
  try {
    const { question_id } = req.params;
    const q = await Question.findByPk(question_id);
    if (!q) return res.status(404).json({ message: "Question not found" });

    const isOwner = q.user_id === req.user.user_id;
    const userRoles = (req.user.Roles || []).map((r) => r.role_name);
    const isStaff = userRoles.includes("admin") || userRoles.includes("staff");
    if (!isOwner && !isStaff) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    await Answer.destroy({ where: { question_id: q.question_id } });
    await q.destroy();
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
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
