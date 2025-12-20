// server/controllers/orderController.js
const {
  Order,
  OrderItem,
  Cart,
  CartItem,
  ProductVariation,
  Payment,
  Product,
} = require("../models");
const sequelize = require("../config/database");
const { Op } = require("sequelize");
const { getPaymentUrl } = require("../services/vnpayService");

const { quoteShipping } = require("../services/shippingService");
const toVnd = (x) => Math.max(0, Math.round(Number(x) || 0));

// Generate unique order code
const generateOrderCode = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
};
// Gộp thêm ghi chú hủy (nếu có)
function appendNote(oldNote, reason) {
  const r = (reason || "").trim();
  if (!r) return oldNote || "";
  const head = `[Cancel @${new Date().toISOString()}] ${r}`;
  return oldNote ? `${oldNote}\n${head}` : head;
}
// Create order from cart
exports.createOrder = async (req, res, next) => {
  // Guard auth (nếu bạn đã có middleware set req.user)
  if (!req.user || !req.user.user_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const t = await sequelize.transaction();
  try {
    const {
      shipping_address,
      shipping_phone,
      shipping_name,
      note,
      payment_provider, // "COD" | "VNPAY"
      payment_method, // "COD" | "VNPAYQR" | "VNBANK" | "INTCARD" | "INSTALLMENT"
      items, // OPTIONAL: [{ variation_id, quantity }]
      province_id,
      ward_id,
      geo_lat,
      geo_lng,
    } = req.body;

    // 0) Validate provider/method
    const VALID = {
      COD: ["COD"],
      VNPAY: ["VNPAYQR", "VNBANK", "INTCARD", "INSTALLMENT"],
    };
    if (!payment_provider || !VALID[payment_provider]) {
      await t.rollback();
      return res
        .status(400)
        .json({ message: `Unsupported payment_provider: ${payment_provider}` });
    }
    if (!payment_method || !VALID[payment_provider].includes(payment_method)) {
      await t.rollback();
      return res.status(400).json({
        message: `Invalid payment_method for provider ${payment_provider}`,
      });
    }
    if (!province_id || !ward_id) {
      await t.rollback();
      return res
        .status(400)
        .json({ message: "Vui lòng chọn Tỉnh/Thành và Phường/Xã" });
    }
    if (geo_lat == null || geo_lng == null) {
      await t.rollback();
      return res
        .status(400)
        .json({ message: "Vui lòng xác nhận vị trí trên bản đồ" });
    }
    const isVnpay = payment_provider === "VNPAY";
    let txnRef = null;

    // const { shipping_fee } = await quoteShipping({ province_id, ward_id, subtotal: items_subtotal });

    // 1) Chuẩn bị itemsForOrder
    let itemsForOrder = [];

    if (Array.isArray(items) && items.length > 0) {
      // a) Dùng items từ body (KHÔNG lock ở đây vì có include)
      for (const it of items) {
        const variation = await ProductVariation.findByPk(it.variation_id, {
          include: [{ model: Product, as: "product" }],
          transaction: t,
          // ❌ KHÔNG lock / skipLocked ở truy vấn có include
        });
        if (!variation) {
          await t.rollback();
          return res
            .status(400)
            .json({ message: `Variation ${it.variation_id} not found` });
        }
        itemsForOrder.push({
          variation,
          variation_id: variation.variation_id,
          quantity: Number(it.quantity || 1),
        });
      }
    } else {
      // b) Lấy từ Cart theo 2 bước: Cart -> CartItem+Variation (không lock trong include)
      const cart = await Cart.findOne({
        where: { user_id: req.user.user_id },
        transaction: t,
      });
      if (!cart) {
        await t.rollback();
        return res.status(400).json({ message: "Cart is empty" });
      }
      ``;

      const cartItems = await CartItem.findAll({
        where: { cart_id: cart.cart_id },
        include: [
          {
            model: ProductVariation,
            as: "variation",
            include: [{ model: Product, as: "product" }], // ✅ alias đúng
          },
        ],
        transaction: t,
      });
      if (cartItems.length === 0) {
        await t.rollback();
        return res.status(400).json({ message: "Cart is empty" });
      }

      itemsForOrder = cartItems.map((ci) => ({
        variation: ci.variation,
        variation_id: ci.variation_id,
        quantity: ci.quantity,
      }));
    }

    // 2) Kiểm tra kho + tính tiền (giá lấy từ DB)
    let totalAmount = 0;
    let discountAmount = 0;

    for (const it of itemsForOrder) {
      const v = it.variation;
      const available = Number(v.stock_quantity || 0);
      if (!v.is_available || available < it.quantity) {
        await t.rollback();
        return res.status(400).json({
          message: `Insufficient stock for ${
            v.product?.product_name || `variation ${it.variation_id}`
          }`,
        });
      }

      const price = Number(v.price);
      const pct = Math.max(0, Number(v.product?.discount_percentage || 0)); // %
      const itemTotal = price * it.quantity;
      const itemDiscount = Math.round(((price * pct) / 100) * it.quantity);

      totalAmount += itemTotal;
      discountAmount += itemDiscount;
    }

    const items_breakdown = itemsForOrder.map((it) => {
      const v = it.variation;
      const price = Number(v.price);
      const pct = Math.max(0, Number(v.product?.discount_percentage || 0)); // %
      const unit_discount_amount = Math.round((price * pct) / 100);
      const unit_final_price = Math.max(0, price - unit_discount_amount);

      const itemTotal = price * it.quantity;
      const itemDiscount = Math.round(unit_discount_amount * it.quantity);

      return {
        variation_id: it.variation_id,
        product_name: v.product?.product_name || null, // ✅ alias đúng
        quantity: it.quantity,

        unit_price: Math.round(price),
        unit_discount_amount,
        unit_final_price,

        item_total: Math.round(itemTotal),
        item_discount: itemDiscount,
        item_subtotal_after_discount: Math.max(
          0,
          Math.round(itemTotal - itemDiscount)
        ),
      };
    });

    const subtotalAfterDiscount = toVnd(totalAmount - discountAmount);
    const { shipping_fee } = await quoteShipping({
      province_id,
      ward_id,
      subtotal: subtotalAfterDiscount, // nếu service có ngưỡng freeship
    });

    const finalAmount = toVnd(
      subtotalAfterDiscount + Number(shipping_fee || 0)
    );

    // console.log("[amounts]", { totalAmount, discountAmount, finalAmount });
    // 3) Tạo Order
    const holdMs = isVnpay ? 24 * 60 * 60 * 1000 : 0; // VNPAY 24h, COD = 0
    const order = await Order.create(
      {
        user_id: req.user.user_id,
        order_code: generateOrderCode(),
        total_amount: totalAmount,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        status: isVnpay ? "AWAITING_PAYMENT" : "processing",
        shipping_address,
        shipping_fee,
        shipping_phone,
        shipping_name,
        note: note || "",
        reserve_expires_at: holdMs ? new Date(Date.now() + holdMs) : null,
        province_id: province_id || null,
        ward_id: ward_id || null,
        geo_lat: geo_lat ?? null,
        geo_lng: geo_lng ?? null,
      },
      { transaction: t }
    );

    if (isVnpay) {
      txnRef = `${order.order_id}-${Date.now()}`;
    }

    // 4) Reserve: KHÓA & trừ kho, tạo OrderItem
    for (const it of itemsForOrder) {
      // ✅ KHÓA ở đây, KHÔNG include
      const v = await ProductVariation.findOne({
        where: { variation_id: it.variation_id },
        transaction: t,
        lock: t.LOCK.UPDATE,
        skipLocked: true,
      });
      if (!v) {
        await t.rollback();
        return res.status(400).json({
          message: `Variation ${it.variation_id} not found during reserve`,
        });
      }
      if (Number(v.stock_quantity || 0) < it.quantity) {
        await t.rollback();
        return res.status(400).json({
          message: `Out of stock during reserve for ${it.variation_id}`,
        });
      }

      await v.decrement("stock_quantity", { by: it.quantity, transaction: t });

      const price = Number(it.variation.price);
      const pct = Math.max(
        0,
        Number(it.variation.product?.discount_percentage || 0)
      ); // %
      const itemTotal = price * it.quantity;
      const itemDiscount = Math.round(((price * pct) / 100) * it.quantity);

      await OrderItem.create(
        {
          order_id: order.order_id,
          variation_id: it.variation_id,
          quantity: it.quantity,
          price, // giá gốc / unit
          discount_amount: itemDiscount, // tổng giảm cho dòng
          subtotal: Math.max(0, Math.round(itemTotal - itemDiscount)),
        },
        { transaction: t }
      );
    }

    // 5) Payment record

    await Payment.create(
      {
        order_id: order.order_id,
        provider: payment_provider,
        payment_method,
        payment_status: "pending",
        amount: finalAmount,
        txn_ref: txnRef,
      },
      { transaction: t }
    );

    // 6) Clear cart (xoá các món đã chọn; nếu không truyền items → xoá toàn bộ)
    if (Array.isArray(items) && items.length > 0) {
      const cart = await Cart.findOne({
        where: { user_id: req.user.user_id },
        transaction: t,
      });

      if (cart) {
        const selectedVariationIds = items
          .map((it) => Number(it.variation_id))
          .filter(Boolean);

        if (selectedVariationIds.length > 0) {
          await CartItem.destroy({
            where: {
              cart_id: cart.cart_id,
              variation_id: selectedVariationIds, // IN (...)
            },
            transaction: t,
          });
        }
      }
    } else {
      // Không truyền items → checkout toàn bộ giỏ
      const cart = await Cart.findOne({
        where: { user_id: req.user.user_id },
        transaction: t,
      });
      if (cart) {
        await CartItem.destroy({
          where: { cart_id: cart.cart_id },
          transaction: t,
        });
      }
    }

    // 7) VNPAY redirect (bọc lỗi cấu hình)
    let redirect = null;
    if (isVnpay) {
      try {
        const { getPaymentUrl } = require("../services/vnpayService");
        if (typeof getPaymentUrl !== "function")
          throw new Error("vnpayService.getPaymentUrl not found");
        const requiredEnv = [
          "VNP_TMN_CODE",
          "VNP_HASHSECRET",
          "VNP_RETURNURL",
          "VNP_PAYURL",
        ];
        const missing = requiredEnv.filter((k) => !process.env[k]);
        if (missing.length)
          throw new Error("Missing ENV: " + missing.join(", "));

        redirect = await getPaymentUrl({
          method: payment_method,
          amount: finalAmount,
          txnRef,
          orderDesc: `Thanh toan don hang ${order.order_code}`,
          ipAddr: req.headers["x-forwarded-for"] || req.socket.remoteAddress,
        });
      } catch (e) {
        await t.rollback();
        return res
          .status(502)
          .json({ message: "VNPAY configuration error", detail: e.message });
      }
    }

    await t.commit();

    // Gửi email xác nhận đơn hàng (không block response)
    try {
      const { sendOrderConfirmationEmail } = require("../services/emailService");
      sendOrderConfirmationEmail({
        order,
        items_breakdown,
        payment_provider: payment_provider,
        payment_method: payment_method,
      }).catch(err => console.error("Email send failed:", err));
    } catch (emailError) {
      console.error("Failed to queue order confirmation email:", emailError);
    }

    return res.status(201).json({
      message: "Order created successfully",
      order: {
        order_id: order.order_id,
        order_code: order.order_code,
        total_amount: order.total_amount,
        discount_amount: order.discount_amount,
        final_amount: order.final_amount,
        status: order.status,
        shipping_fee, // 👈 phí ship thực
        items_breakdown,
      },
      redirect,
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

exports.getUserOrdersV2 = async (req, res, next) => {
  try {
    const {
      tab = "all",
      page = 1,
      limit = 10,
      q = "",
      sort = "created_at:desc",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * perPage;

    const [, sortDirRaw] = String(sort).split(":");
    const sortDir =
      (sortDirRaw || "desc").toUpperCase() === "ASC" ? "ASC" : "DESC";
    const orderBy = [["created_at", sortDir]];

    const where = { user_id: req.user.user_id };

    let paymentInclude = {
      model: Payment,
      as: "payment",
      required: false,
    };

    switch (tab) {
      case "awaiting_payment":
        where.status = "AWAITING_PAYMENT";
        paymentInclude = {
          model: Payment,
          as: "payment",
          required: true,
          where: { provider: "VNPAY", payment_status: "pending" },
        };
        break;

      case "to_ship":
        where.status = "processing";
        paymentInclude = {
          model: Payment,
          as: "payment",
          required: true,
          where: {
            [Op.or]: [
              { provider: "COD", payment_status: "pending" },
              { provider: "VNPAY", payment_status: "completed" },
            ],
          },
        };
        break;

      case "shipping":
        where.status = "shipping";
        paymentInclude = {
          model: Payment,
          as: "payment",
          required: true,
          where: {
            [Op.or]: [
              { provider: "COD", payment_status: "pending" },
              { provider: "VNPAY", payment_status: "completed" },
            ],
          },
        };
        break;

      case "completed":
        where.status = "delivered";
        paymentInclude = {
          model: Payment,
          as: "payment",
          required: true,
          where: { payment_status: "completed" },
        };
        break;

      case "cancelled":
        where.status = { [Op.in]: ["cancelled", "FAILED"] };
        break;

      case "failed":
        where.status = "FAILED";
        break;

      case "all":
      default:
        break;
    }

    const query = String(q || "").trim();
    if (query) {
      where[Op.or] = [
        { order_code: { [Op.iLike]: `%${query}%` } },
        { "$items.variation.product.product_name$": { [Op.iLike]: `%${query}%` } },
      ];
    }

    const { count, rows } = await Order.findAndCountAll({
      where,
      include: [
        {
          model: OrderItem,
          as: "items",
          required: true,
          include: [
            {
              model: ProductVariation,
              as: "variation",
              include: [{ model: Product, as: "product" }],
            },
          ],
        },
        paymentInclude,
      ],
      limit: perPage,
      offset,
      order: orderBy,
      distinct: true,
      subQuery: false,
    });

    const orders = rows.map((o) => {
      const j = o.toJSON();
      const preview = (j.items || []).slice(0, 2).map((it) => ({
        variation_id: it.variation_id,
        quantity: it.quantity,
        product_name: it.variation?.product?.product_name || null,
        thumbnail_url:
          it.variation?.product?.images?.[0]?.image_url ||
          it.variation?.product?.thumbnail_url ||
          null,
      }));

      return {
        order_id: j.order_id,
        order_code: j.order_code,
        status: j.status,
        final_amount: Number(j.final_amount || 0),
        shipping_fee: Number(j.shipping_fee || 0),
        created_at: j.created_at,
        reserve_expires_at: j.reserve_expires_at,
        payment: j.payment
          ? {
              provider: j.payment.provider,
              payment_method: j.payment.payment_method,
              payment_status: j.payment.payment_status,
              txn_ref: j.payment.txn_ref,
            }
          : null,
        items_preview: preview,
        items_count: (j.items || []).length,
      };
    });

    return res.json({
      orders,
      pagination: {
        total: count,
        page: pageNum,
        limit: perPage,
        totalPages: Math.ceil(count / perPage),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get user orders
// controllers/orderController.js
exports.getUserOrders = async (req, res, next) => {
  try {
    const {
      tab = "all",
      page = 1,
      limit = 10,
      q = "",
      sort = "created_at:desc",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * perPage;

    // sort: "created_at:desc" | "created_at:asc"
    const [sortField, sortDirRaw] = String(sort).split(":");
    const sortDir =
      (sortDirRaw || "desc").toUpperCase() === "ASC" ? "ASC" : "DESC";
    const orderBy = [["created_at", sortDir]]; // chỉ cho phép created_at để tránh SQLi

    // base filter (đơn của user hiện tại)
    const where = { user_id: req.user.user_id };

    // lọc theo tab: ánh xạ đúng logic bạn yêu cầu
    // - AWAITING_PAYMENT: VNPAY -> order.AWAITING_PAYMENT + payment.pending
    // - TO_SHIP: order.processing (COD: payment.pending | VNPAY: payment.completed)
    // - SHIPPING: order.shipping (COD pending | VNPAY completed)
    // - COMPLETED: order.delivered + payment.completed
    // - CANCELLED: COD order.cancelled + payment.failed  | VNPAY order.FAILED + payment.failed
    // - FAILED: (để tách riêng trường hợp thất bại có thể thanh toán lại)
    const paymentWhere = {}; // sẽ tinh chỉnh sau khi switch tab

    switch (tab) {
      case "awaiting_payment":
        where.status = "AWAITING_PAYMENT";
        paymentWhere.provider = "VNPAY";
        paymentWhere.payment_status = "pending";
        break;

      case "to_ship":
        where.status = "processing";
        // (COD + pending) OR (VNPAY + completed) — ta không thể OR ngay trong include duy nhất,
        // nên để include rộng rồi lọc sau bằng JS (hoặc dùng subQuery phức tạp).
        // Ở đây: chỉ include tất cả, sau map sẽ filter theo điều kiện nhìn/hiển thị ở FE.
        break;

      case "shipping":
        where.status = "shipping";
        break;

      case "completed":
        where.status = "delivered";
        paymentWhere.payment_status = "completed";
        break;

      case "cancelled":
        // Gom cả "cancelled" và "FAILED"
        where.status = { [Op.in]: ["cancelled", "FAILED"] };
        break;

      case "failed":
        // Tab tách riêng để “thanh toán lại”: ví dụ order.FAILED (hoặc pending + failed ipn tuỳ bạn),
        // ở đây dùng order.FAILED cho rõ ràng:
        where.status = "FAILED";
        break;

      case "all":
      default:
        // không thêm gì
        break;
    }

    // Tìm kiếm theo q (order_code hoặc tên sản phẩm)
    // Cách đơn giản: q trên order_code ở SQL; phần tìm theo tên sp filter ở FE (hoặc viết subquery).
    if (q) {
      where.order_code = { [Op.iLike]: `%${q}%` }; // dùng iLike trên Postgres
    }

    const { count, rows } = await Order.findAndCountAll({
      where,
      include: [
        // items -> variation -> product (để preview)
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
        // payment
        {
          model: Payment,
          as: "payment",
          // nếu paymentWhere rỗng thì đừng ép where (để không loại mất case OR như "to_ship")
          ...(Object.keys(paymentWhere).length ? { where: paymentWhere } : {}),
          required: false,
        },
      ],
      limit: perPage,
      offset,
      order: orderBy,
      distinct: true, // để count đúng khi có join
    });

    // Chuẩn hoá response: items_preview (tối đa 2), items_count
    const orders = rows.map((o) => {
      const j = o.toJSON();
      const preview = (j.items || []).slice(0, 2).map((it) => ({
        variation_id: it.variation_id,
        quantity: it.quantity,
        product_name: it.variation?.product?.product_name || null,
        thumbnail_url:
          it.variation?.product?.images?.[0]?.image_url ||
          it.variation?.product?.thumbnail_url ||
          null,
      }));

      return {
        order_id: j.order_id,
        order_code: j.order_code,
        status: j.status,
        final_amount: Number(j.final_amount || 0),
        shipping_fee: Number(j.shipping_fee || 0),
        created_at: j.created_at,
        reserve_expires_at: j.reserve_expires_at,
        payment: j.payment
          ? {
              provider: j.payment.provider,
              payment_method: j.payment.payment_method,
              payment_status: j.payment.payment_status,
              txn_ref: j.payment.txn_ref,
            }
          : null,
        items_preview: preview,
        items_count: (j.items || []).length,
      };
    });

    return res.json({
      orders,
      pagination: {
        total: count,
        page: pageNum,
        limit: perPage,
        totalPages: Math.ceil(count / perPage),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get order detail
exports.getOrderDetail = async (req, res, next) => {
  try {
    const { order_id } = req.params;

    const order = await Order.findOne({
      where: {
        order_id,
        user_id: req.user.user_id,
      },
      include: [
        {
          model: OrderItem,
          as: "items",
          include: [
            {
              model: ProductVariation,
              as: "variation",
              include: [{ model: Product, as: "product" }], // ✅ alias đúng
            },
          ],
        },
        {
          model: Payment,
          as: "payment",
        },
      ],
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ order });
  } catch (error) {
    next(error);
  }
};

// Cancel order
exports.cancelOrder = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { order_id } = req.params;
    const reason = (req.body?.reason || "").slice(0, 500);

    // 1) KHÓA CHỈ BẢNG orders (KHÔNG include)
    const order = await Order.findOne({
      where: { order_id, user_id: req.user.user_id },
      transaction: t,
      lock: t.LOCK.UPDATE, // SELECT ... FOR UPDATE
      skipLocked: true,
    });

    if (!order) {
      await t.rollback();
      return res.status(404).json({ message: "Order not found" });
    }

    // 2) Lấy payment & items bằng TRUY VẤN RIÊNG (không lock outer join)
    const payment = await Payment.findOne({
      where: { order_id: order.order_id },
      transaction: t,
    });

    const items = await OrderItem.findAll({
      where: { order_id: order.order_id },
      transaction: t,
    });

    // Guard: với flow của bạn, Payment gần như luôn có.
    // Nếu đề phòng thiếu, có thể xử lý thêm:
    if (!payment) {
      // Vẫn cho hủy COD (edge case), nhưng set logic tối giản.
    }

    const prov = payment?.provider || "COD"; // 'COD' | 'VNPAY'
    const pstat = payment?.payment_status; // 'pending' | 'completed' | 'failed' | 'refunded' | undefined
    const ostat = order.status; // theo enum

    // ====== Kiểm tra điều kiện được hủy ======
    // 1) Chờ thanh toán:
    //    - VNPAY: order.AWAITING_PAYMENT + payment.pending
    const isAwaitingVnpay =
      prov === "VNPAY" && ostat === "AWAITING_PAYMENT" && pstat === "pending";

    // 2) Chờ giao hàng:
    //    - COD:   order.processing + payment.pending
    //    - VNPAY: order.processing + payment.completed
    const isToShipCOD =
      prov === "COD" && ostat === "processing" && pstat === "pending";
    const isToShipVNPAY =
      prov === "VNPAY" && ostat === "processing" && pstat === "completed";

    if (!(isAwaitingVnpay || isToShipCOD || isToShipVNPAY)) {
      await t.rollback();
      return res
        .status(400)
        .json({ message: "Order cannot be cancelled in current state." });
    }

    // ====== Hoàn kho (đơn nào tạo cũng đã reserve kho) ======
    for (const it of items) {
      const v = await ProductVariation.findOne({
        where: { variation_id: it.variation_id },
        transaction: t,
        lock: t.LOCK.UPDATE,
        skipLocked: true,
      });
      if (!v) continue;
      await v.increment("stock_quantity", { by: it.quantity, transaction: t });
    }

    // ====== Cập nhật trạng thái theo case ======
    // Order → cancelled
    await order.update(
      { status: "cancelled", note: appendNote(order.note, reason) },
      { transaction: t }
    );

    // Payment:
    // - AWAITING_PAYMENT (VNPAY pending): set payment.failed
    // - To-ship COD (pending):            set payment.failed
    // - To-ship VNPAY (completed):        set payment.pending (đánh dấu chờ hoàn)
    if (payment) {
      if (isAwaitingVnpay || isToShipCOD) {
        await payment.update(
          { payment_status: "failed", paid_at: null },
          { transaction: t }
        );
      } else if (isToShipVNPAY) {
        // Chờ admin hoàn tiền → để "pending" biểu thị refund pending
        await payment.update({ payment_status: "pending" }, { transaction: t });
        // Nếu muốn rõ ràng hơn, bạn có thể bổ sung cột riêng như refund_requested_at, refund_note,...
      }
    }

    await t.commit();
    return res.json({
      message: "Order cancelled successfully",
      order: {
        order_id: order.order_id,
        status: "cancelled",
        payment_status: payment?.payment_status || null,
      },
    });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

function appendNote(oldNote = "", reason = "") {
  if (!reason) return oldNote;
  const line = `[USER_CANCEL ${new Date().toISOString()}] ${reason}`;
  return oldNote ? `${oldNote}\n${line}` : line;
}

// controllers/orderController.js (thêm vào file bạn đang có)
exports.previewOrder = async (req, res, next) => {
  try {
    const { items = [], province_id, ward_id } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No items" });
    }
    if (!province_id) {
      return res.status(400).json({ message: "Missing province_id" });
    }

    const rows = [];
    for (const it of items) {
      const v = await ProductVariation.findByPk(it.variation_id, {
        include: [{ model: Product, as: "product" }], // ✅ alias đúng
      });
      if (!v)
        return res
          .status(400)
          .json({ message: `Variation ${it.variation_id} not found` });
      rows.push({ v, qty: Math.max(1, Number(it.quantity || 1)) });
    }

    let total_amount = 0; // tổng gốc
    let discount_amount = 0; // tổng giảm (tiền)
    const stock_warnings = [];

    const items_breakdown = rows.map(({ v, qty }) => {
      const available = Number(v.stock_quantity || 0);
      if (!v.is_available || available < qty) {
        stock_warnings.push({
          variation_id: v.variation_id,
          message: `Only ${available} left in stock`,
        });
      }

      const unit_price = Number(v.price);
      const unit_discount_amount = Math.max(
        0,
        Math.round(
          Number((unit_price * v.product?.discount_percentage) / 100 || 0)
        )
      );
      const unit_final_price = Math.max(
        0,
        Math.round(unit_price - unit_discount_amount)
      );

      const item_total = Math.round(unit_price * qty);
      const item_discount = Math.round(unit_discount_amount * qty);
      const item_subtotal_after_discount = Math.max(
        0,
        Math.round(unit_final_price * qty)
      );

      total_amount += item_total;
      discount_amount += item_discount;

      return {
        variation_id: v.variation_id,
        product_name: v.product?.product_name || null,
        quantity: qty,

        unit_price: Math.round(unit_price),
        unit_discount_amount, // tiền giảm / unit
        unit_final_price, // giá sau giảm / unit

        item_total, // gốc * qty
        item_discount, // giảm * qty
        item_subtotal_after_discount, // sau giảm * qty

        thumbnail_url: v.product?.thumbnail_url || null,
        slug: v.product?.slug || null,
      };
    });

    const subtotal_after_discount = Math.max(
      0,
      Math.round(total_amount - discount_amount)
    );

    const { shipping_fee, reason } = await quoteShipping({
      province_id: Number(province_id),
      ward_id: ward_id ? Number(ward_id) : null,
      subtotal: subtotal_after_discount,
    });

    const final_amount = subtotal_after_discount + Number(shipping_fee || 0);

    return res.json({
      total_amount,
      discount_amount,
      subtotal_after_discount,
      shipping_fee,
      shipping_reason: reason || null,
      final_amount,
      items_breakdown,
      stock_warnings,
    });
  } catch (error) {
    next(error);
  }
};

exports.getOrderDetailSlim = async (req, res, next) => {
  try {
    const { order_id } = req.params;

    const orderRow = await Order.findOne({
      where: { order_id, user_id: req.user.user_id },
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
        { model: Payment, as: "payment" },
      ],
      order: [[{ model: OrderItem, as: "items" }, "order_item_id", "ASC"]],
    });

    if (!orderRow) return res.status(404).json({ message: "Order not found" });

    const o = orderRow.toJSON();

    // Chuẩn hóa items
    const items = (o.items || []).map((it) => {
      const p = it.variation?.product || {};
      // thumbnail ưu tiên ảnh primary nếu bạn có; ở đây lấy thumbnail_url đã có
      const thumb = p.images?.[0]?.image_url || p.thumbnail_url || null;

      return {
        order_item_id: it.order_item_id,
        variation_id: it.variation_id,
        quantity: Number(it.quantity || 0),
        price: Number(it.price || 0),
        discount_amount: Number(it.discount_amount || 0),
        subtotal: Number(it.subtotal || 0),
        product: {
          product_id: p.product_id || null,
          product_name: p.product_name || null,
          thumbnail_url: thumb,
          slug: p.slug || null,
        },
      };
    });

    // Chuẩn hóa payment
    const pay = o.payment
      ? {
          provider: o.payment.provider,
          payment_method: o.payment.payment_method,
          payment_status: o.payment.payment_status,
          amount: Number(o.payment.amount || 0),
          txn_ref: o.payment.txn_ref,
          paid_at: o.payment.paid_at,
        }
      : null;

    const payload = {
      order: {
        order_id: o.order_id,
        order_code: o.order_code,
        status: o.status,
        total_amount: Number(o.total_amount || 0),
        discount_amount: Number(o.discount_amount || 0),
        final_amount: Number(o.final_amount || 0),
        shipping_fee: Number(o.shipping_fee || 0),
        shipping_name: o.shipping_name,
        shipping_phone: o.shipping_phone,
        shipping_address: o.shipping_address,
        province_id: o.province_id,
        ward_id: o.ward_id,
        geo_lat: o.geo_lat ? Number(o.geo_lat) : null,
        geo_lng: o.geo_lng ? Number(o.geo_lng) : null,
        created_at: o.created_at,
        payment: pay,
        items,
      },
    };

    return res.json(payload);
  } catch (err) {
    next(err);
  }
};

exports.retryVnpayPayment = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { order_id } = req.params;
    const { method = "VNPAYQR" } = req.body || {}; // VNPAYQR | VNBANK | INTCARD

    // 1) Lấy order & payment
    const order = await Order.findOne({
      where: { order_id, user_id: req.user.user_id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ message: "Order not found" });
    }

    const payment = await Payment.findOne({
      where: { order_id: order.order_id, provider: "VNPAY" },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!payment) {
      await t.rollback();
      return res
        .status(400)
        .json({ message: "Payment record not found or not VNPAY" });
    }

    // 2) Điều kiện cho phép retry
    const allow =
      payment.payment_status === "pending" &&
      (order.status === "AWAITING_PAYMENT" || order.status === "FAILED");

    if (!allow) {
      await t.rollback();
      return res
        .status(400)
        .json({ message: "Order not eligible for retry payment" });
    }

    // 3) Tạo txn_ref mới (khuyến nghị tạo mới)
    const newTxnRef = `${order.order_id}-${Date.now()}`;
    await payment.update({ txn_ref: newTxnRef }, { transaction: t });

    // 4) Build URL thanh toán
    const redirect = await getPaymentUrl({
      method,
      amount: Number(payment.amount || order.final_amount || 0),
      txnRef: newTxnRef,
      orderDesc: `Thanh toan don hang ${order.order_code}`,
      ipAddr: req.headers["x-forwarded-for"] || req.socket.remoteAddress,
    });

    // (tuỳ chọn) set thời hạn link để FE hiển thị
    const expires_at = new Date(Date.now() + 15 * 60 * 1000); // 15 phút

    await t.commit();
    return res.json({
      redirect,
      order_id: order.order_id,
      txn_ref: newTxnRef,
      expires_at: expires_at.toISOString(),
    });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

exports.getOrderCounters = async (req, res, next) => {
  try {
    const rows = await Order.findAll({
      where: { user_id: req.user.user_id },
      include: [{ model: Payment, as: "payment", required: false }],
      attributes: ["order_id", "status"], // tối giản select
    });

    const counters = {
      all: 0,
      awaiting_payment: 0,
      processing: 0, // BE native
      to_ship: 0, // thêm để FE map trực tiếp tab "to_ship"
      shipping: 0,
      delivered: 0,
      cancelled: 0,
      failed: 0,
    };

    for (const o of rows) {
      counters.all += 1;
      const p = o.payment;

      if (
        o.status === "AWAITING_PAYMENT" &&
        p?.provider === "VNPAY" &&
        p?.payment_status === "pending"
      ) {
        counters.awaiting_payment += 1;
      }

      if (o.status === "processing") {
        counters.processing += 1;
        counters.to_ship += 1; // alias cho FE tab "to_ship"
      }

      if (o.status === "shipping") counters.shipping += 1;

      if (o.status === "delivered" && p?.payment_status === "completed") {
        counters.delivered += 1;
      }

      if (o.status === "cancelled" || o.status === "FAILED") {
        counters.cancelled += 1;
      }

      if (o.status === "FAILED") counters.failed += 1;
    }

    return res.json(counters);
  } catch (err) {
    next(err);
  }
};

exports.getOrderCountersV2 = async (req, res, next) => {
  try {
    const rows = await Order.findAll({
      where: { user_id: req.user.user_id },
      include: [{ model: Payment, as: "payment", required: false }],
      attributes: ["order_id", "status"],
    });

    const counters = {
      all: 0,
      awaiting_payment: 0,
      processing: 0,
      to_ship: 0,
      shipping: 0,
      delivered: 0,
      cancelled: 0,
      failed: 0,
    };

    for (const o of rows) {
      counters.all += 1;
      const p = o.payment;
      const prov = p?.provider;
      const pstatus = p?.payment_status;

      if (
        o.status === "AWAITING_PAYMENT" &&
        prov === "VNPAY" &&
        pstatus === "pending"
      ) {
        counters.awaiting_payment += 1;
      }

      if (o.status === "processing") {
        counters.processing += 1;
        if (
          (prov === "COD" && pstatus === "pending") ||
          (prov === "VNPAY" && pstatus === "completed")
        ) {
          counters.to_ship += 1;
        }
      }

      if (
        o.status === "shipping" &&
        ((prov === "COD" && pstatus === "pending") ||
          (prov === "VNPAY" && pstatus === "completed"))
      ) {
        counters.shipping += 1;
      }

      if (o.status === "delivered" && pstatus === "completed") {
        counters.delivered += 1;
      }

      if (o.status === "cancelled" || o.status === "FAILED") {
        counters.cancelled += 1;
      }

      if (o.status === "FAILED") counters.failed += 1;
    }

    return res.json(counters);
  } catch (err) {
    next(err);
  }
};

exports.changePaymentMethod = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { order_id } = req.params;
    const { provider, method } = req.body || {};

    const VALID = {
      COD: ["COD"],
      VNPAY: ["VNPAYQR", "VNBANK", "INTCARD", "INSTALLMENT"],
    };

    if (!provider || !VALID[provider]) {
      await t.rollback();
      return res.status(400).json({ message: `Unsupported provider: ${provider}` });
    }
    if (!method || !VALID[provider].includes(method)) {
      await t.rollback();
      return res.status(400).json({ message: `Invalid method for provider ${provider}` });
    }

    // Lock order & payment
    const order = await Order.findOne({
      where: { order_id, user_id: req.user.user_id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ message: "Order not found" });
    }

    // chặn các trạng thái không cho đổi
    if (["shipping", "delivered", "cancelled"].includes(order.status)) {
      await t.rollback();
      return res.status(400).json({ message: "Cannot change payment in current state." });
    }

    const payment = await Payment.findOne({
      where: { order_id: order.order_id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!payment) {
      await t.rollback();
      return res.status(400).json({ message: "Payment record not found" });
    }

    if (payment.payment_status === "completed") {
      await t.rollback();
      return res.status(400).json({ message: "Payment already completed; cannot change method." });
    }

    let redirect = null;

    if (provider === "COD") {
      // chuyển sang COD
      await payment.update(
        {
          provider: "COD",
          payment_method: "COD",
          payment_status: "pending",
          amount: Number(order.final_amount || 0),
          transaction_id: null,
          txn_ref: null,
          raw_return: null,
          raw_ipn: null,
          paid_at: null,
        },
        { transaction: t }
      );

      // đơn COD ở flow của bạn = "processing"
      await order.update({ status: "processing" }, { transaction: t });
    } else {
      // chuyển sang VNPAY
      const newTxnRef = `${order.order_id}-${Date.now()}`;

      await payment.update(
        {
          provider: "VNPAY",
          payment_method: method,
          payment_status: "pending",
          amount: Number(order.final_amount || 0),
          transaction_id: null,
          txn_ref: newTxnRef,
          raw_return: null,
          raw_ipn: null,
          paid_at: null,
        },
        { transaction: t }
      );

      await order.update({ status: "AWAITING_PAYMENT" }, { transaction: t });

      // build URL thanh toán
      try {
        const { getPaymentUrl } = require("../services/vnpayService");
        const requiredEnv = ["VNP_TMN_CODE", "VNP_HASHSECRET", "VNP_RETURNURL", "VNP_PAYURL"];
        const missing = requiredEnv.filter((k) => !process.env[k]);
        if (missing.length) throw new Error("Missing ENV: " + missing.join(", "));

        redirect = await getPaymentUrl({
          method,
          amount: Number(payment.amount || order.final_amount || 0),
          txnRef: newTxnRef,
          orderDesc: `Thanh toan don hang ${order.order_code}`,
          ipAddr: req.headers["x-forwarded-for"] || req.socket.remoteAddress,
        });
      } catch (e) {
        await t.rollback();
        return res.status(502).json({ message: "VNPAY configuration error", detail: e.message });
      }
    }

    await t.commit();
    return res.json({
      message: "Payment method updated",
      order: {
        order_id: order.order_id,
        status: order.status,
      },
      payment: {
        provider: provider,
        method,
        status: provider === "COD" ? "pending" : "pending",
      },
      redirect, // chỉ có khi VNPAY
    });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

exports.updateShippingAddress = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { order_id } = req.params;
    const {
      shipping_name,
      shipping_phone,
      shipping_address,
      province_id,
      ward_id,
      geo_lat,
      geo_lng,
    } = req.body || {};

    const order = await Order.findOne({
      where: { order_id, user_id: req.user.user_id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ message: "Order not found" });
    }

    if (["shipping", "delivered", "cancelled"].includes(order.status)) {
      await t.rollback();
      return res.status(400).json({ message: "Cannot change shipping address in current state." });
    }

    const payment = await Payment.findOne({
      where: { order_id: order.order_id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    // Tính lại phí ship nếu có province/ward mới (nếu không truyền, dùng cũ)
    const newProvinceId = province_id ?? order.province_id;
    const newWardId = ward_id ?? order.ward_id;

    if (!newProvinceId) {
      await t.rollback();
      return res.status(400).json({ message: "province_id is required (current or new)" });
    }

    const subtotal = Math.max(
      0,
      Number(order.total_amount || 0) - Number(order.discount_amount || 0)
    );

    const { shipping_fee: newShipFee } = await quoteShipping({
      province_id: Number(newProvinceId),
      ward_id: newWardId ? Number(newWardId) : null,
      subtotal,
    });

    const oldShipFee = Number(order.shipping_fee || 0);
    const willChangeAmount = Number(newShipFee) !== oldShipFee;

    if (payment?.payment_status === "completed" && willChangeAmount) {
      await t.rollback();
      return res.status(400).json({
        message:
          "Order already paid; cannot change address that alters shipping fee. Contact support for refund/extra-charge flow.",
      });
    }

    // Cập nhật đơn
    const patch = {
      shipping_name: shipping_name ?? order.shipping_name,
      shipping_phone: shipping_phone ?? order.shipping_phone,
      shipping_address: shipping_address ?? order.shipping_address,
      province_id: newProvinceId,
      ward_id: newWardId,
      geo_lat: geo_lat ?? order.geo_lat,
      geo_lng: geo_lng ?? order.geo_lng,
      shipping_fee: newShipFee,
      final_amount: Math.max(0, subtotal + Number(newShipFee || 0)),
    };

    await order.update(patch, { transaction: t });

    // Đồng bộ số tiền ở Payment nếu chưa paid (pending/failed/refunded)
    if (payment && payment.payment_status !== "completed") {
      await payment.update(
        { amount: Number(order.final_amount || patch.final_amount || 0) },
        { transaction: t }
      );
    }

    await t.commit();
    return res.json({
      message: "Shipping address updated",
      order: {
        order_id: order.order_id,
        shipping_name: order.shipping_name,
        shipping_phone: order.shipping_phone,
        shipping_address: order.shipping_address,
        province_id: order.province_id,
        ward_id: order.ward_id,
        geo_lat: order.geo_lat,
        geo_lng: order.geo_lng,
        shipping_fee: Number(order.shipping_fee || newShipFee || 0),
        final_amount: Number(order.final_amount || patch.final_amount || 0),
      },
    });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};
