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

const { quoteShipping } = require("../services/shippingService");
const toVnd = (x) => Math.max(0, Math.round(Number(x) || 0));

// Generate unique order code
const generateOrderCode = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
};

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

// Get user orders
exports.getUserOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    const where = { user_id: req.user.user_id };
    if (status) where.status = status;

    const { count, rows } = await Order.findAndCountAll({
      where,
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
      limit: Number.parseInt(limit),
      offset: Number.parseInt(offset),
      order: [["created_at", "DESC"]],
    });

    res.json({
      orders: rows,
      pagination: {
        total: count,
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        totalPages: Math.ceil(count / limit),
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
  const transaction = await sequelize.transaction();

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
        },
      ],
    });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ message: "Order not found" });
    }

    if (!["pending", "confirmed", "AWAITING_PAYMENT"].includes(order.status)) {
      await transaction.rollback();
      return res.status(400).json({ message: "Order cannot be cancelled" });
    }

    // Restore stock
    for (const item of order.items) {
      const variation = await ProductVariation.findOne({
        where: { variation_id: item.variation_id },
        transaction,
        lock: transaction.LOCK.UPDATE,
        skipLocked: true,
      });
      if (!variation) continue;
      await variation.increment("stock_quantity", {
        by: item.quantity,
        transaction,
      });
    }

    // Update order status
    await order.update({ status: "cancelled" }, { transaction });

    // Update payment status
    await Payment.update(
      { payment_status: "refunded" },
      { where: { order_id: order.order_id }, transaction }
    );

    await transaction.commit();

    res.json({ message: "Order cancelled successfully" });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

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
