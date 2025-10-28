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

    // 1) Chuẩn bị itemsForOrder
    let itemsForOrder = [];

    if (Array.isArray(items) && items.length > 0) {
      // a) Dùng items từ body (KHÔNG lock ở đây vì có include)
      for (const it of items) {
        const variation = await ProductVariation.findByPk(it.variation_id, {
          include: [Product],
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
          { model: ProductVariation, as: "variation", include: [Product] },
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
            v.Product?.product_name || `variation ${it.variation_id}`
          }`,
        });
      }

      const price = Number(v.price);
      const pct = Number(v.Product?.discount_percentage || 0);
      const itemTotal = price * it.quantity;
      const itemDiscount = (itemTotal * pct) / 100;

      totalAmount += itemTotal;
      discountAmount += itemDiscount;
    }

    const finalAmount = totalAmount - discountAmount;

    // console.log("[amounts]", { totalAmount, discountAmount, finalAmount });
    // 3) Tạo Order
    const order = await Order.create(
      {
        user_id: req.user.user_id,
        order_code: generateOrderCode(),
        total_amount: totalAmount,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        status: isVnpay ? "AWAITING_PAYMENT" : "confirmed",
        shipping_address,
        shipping_phone,
        shipping_name,
        note: note || "",
        reserve_expires_at: new Date(Date.now() + 15 * 60 * 1000),
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
      const pct = Number(it.variation.Product?.discount_percentage || 0);
      const itemTotal = price * it.quantity;
      const itemDiscount = (itemTotal * pct) / 100;

      await OrderItem.create(
        {
          order_id: order.order_id,
          variation_id: it.variation_id,
          quantity: it.quantity,
          price,
          discount_amount: itemDiscount,
          subtotal: itemTotal - itemDiscount,
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

    // 6) Clear cart nếu dùng cart
    if (!(Array.isArray(items) && items.length > 0)) {
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
              include: [Product],
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
              include: [Product],
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
