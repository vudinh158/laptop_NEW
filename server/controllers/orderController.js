const { Order, OrderItem, Cart, CartItem, ProductVariation, Payment, Product } = require("../models")
const sequelize = require("../config/database")

// Generate unique order code
const generateOrderCode = () => {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `ORD-${timestamp}-${random}`
}

// Create order from cart
exports.createOrder = async (req, res, next) => {
  const transaction = await sequelize.transaction()

  try {
    const { shipping_address, shipping_phone, shipping_name, payment_method, note } = req.body

    // Get cart with items
    const cart = await Cart.findOne({
      where: { user_id: req.user.user_id },
      include: [
        {
          model: CartItem,
          as: "items",
          include: [
            {
              model: ProductVariation,
              as: "variation",
              include: [Product],
            },
          ],
        },
      ],
    })

    if (!cart || cart.items.length === 0) {
      await transaction.rollback()
      return res.status(400).json({ message: "Cart is empty" })
    }

    // Validate stock and calculate totals
    let totalAmount = 0
    let discountAmount = 0

    for (const item of cart.items) {
      if (!item.variation.is_available || item.variation.stock_quantity < item.quantity) {
        await transaction.rollback()
        return res.status(400).json({
          message: `Insufficient stock for ${item.variation.Product.product_name}`,
        })
      }

      const itemPrice = Number.parseFloat(item.variation.price)
      const itemDiscount = Number.parseFloat(item.variation.Product.discount_percentage || 0)
      const itemTotal = itemPrice * item.quantity
      const itemDiscountAmount = (itemTotal * itemDiscount) / 100

      totalAmount += itemTotal
      discountAmount += itemDiscountAmount
    }

    const finalAmount = totalAmount - discountAmount

    // Create order
    const order = await Order.create(
      {
        user_id: req.user.user_id,
        order_code: generateOrderCode(),
        total_amount: totalAmount,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        status: "pending",
        shipping_address,
        shipping_phone,
        shipping_name,
        note,
      },
      { transaction },
    )

    // Create order items and update stock
    for (const item of cart.items) {
      const itemPrice = Number.parseFloat(item.variation.price)
      const itemDiscount = Number.parseFloat(item.variation.Product.discount_percentage || 0)
      const itemTotal = itemPrice * item.quantity
      const itemDiscountAmount = (itemTotal * itemDiscount) / 100

      await OrderItem.create(
        {
          order_id: order.order_id,
          variation_id: item.variation_id,
          quantity: item.quantity,
          price: itemPrice,
          discount_amount: itemDiscountAmount,
          subtotal: itemTotal - itemDiscountAmount,
        },
        { transaction },
      )

      // Update stock
      await item.variation.decrement("stock_quantity", {
        by: item.quantity,
        transaction,
      })
    }

    // Create payment record
    await Payment.create(
      {
        order_id: order.order_id,
        payment_method,
        payment_status: payment_method === "cod" ? "pending" : "pending",
        amount: finalAmount,
      },
      { transaction },
    )

    // Clear cart
    await CartItem.destroy({
      where: { cart_id: cart.cart_id },
      transaction,
    })

    await transaction.commit()

    res.status(201).json({
      message: "Order created successfully",
      order: {
        order_id: order.order_id,
        order_code: order.order_code,
        total_amount: order.total_amount,
        discount_amount: order.discount_amount,
        final_amount: order.final_amount,
        status: order.status,
      },
    })
  } catch (error) {
    await transaction.rollback()
    next(error)
  }
}

// Get user orders
exports.getUserOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query
    const offset = (page - 1) * limit

    const where = { user_id: req.user.user_id }
    if (status) where.status = status

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

// Get order detail
exports.getOrderDetail = async (req, res, next) => {
  try {
    const { order_id } = req.params

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
    })

    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    res.json({ order })
  } catch (error) {
    next(error)
  }
}

// Cancel order
exports.cancelOrder = async (req, res, next) => {
  const transaction = await sequelize.transaction()

  try {
    const { order_id } = req.params

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
    })

    if (!order) {
      await transaction.rollback()
      return res.status(404).json({ message: "Order not found" })
    }

    if (!["pending", "confirmed"].includes(order.status)) {
      await transaction.rollback()
      return res.status(400).json({ message: "Order cannot be cancelled" })
    }

    // Restore stock
    for (const item of order.items) {
      await ProductVariation.increment("stock_quantity", {
        by: item.quantity,
        where: { variation_id: item.variation_id },
        transaction,
      })
    }

    // Update order status
    await order.update({ status: "cancelled" }, { transaction })

    // Update payment status
    await Payment.update({ payment_status: "refunded" }, { where: { order_id: order.order_id }, transaction })

    await transaction.commit()

    res.json({ message: "Order cancelled successfully" })
  } catch (error) {
    await transaction.rollback()
    next(error)
  }
}
