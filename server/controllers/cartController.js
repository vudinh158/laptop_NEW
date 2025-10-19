const { Cart, CartItem, ProductVariation, Product, ProductImage } = require("../models")

// Get user cart
exports.getCart = async (req, res, next) => {
  try {
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
              include: [
                {
                  model: Product,
                  include: [{ model: ProductImage, as: "images", where: { is_primary: true }, required: false }],
                },
              ],
            },
          ],
        },
      ],
    })

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" })
    }

    // Calculate totals
    const subtotal = cart.items.reduce((sum, item) => {
      // Đảm bảo item.price_at_add là số, mặc dù nó nên có trong DB
      const price = Number.parseFloat(item.price_at_add) || 0
      return sum + price * item.quantity
    }, 0)

    res.json({
      cart: {
        cart_id: cart.cart_id,
        items: cart.items,
        subtotal,
        item_count: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      },
    })
  } catch (error) {
    next(error)
  }
}

// Add item to cart
exports.addToCart = async (req, res, next) => {
  try {
    const { variation_id, quantity = 1 } = req.body

    // Check if variation exists and has stock
    const variation = await ProductVariation.findByPk(variation_id)
    if (!variation) {
      return res.status(404).json({ message: "Product variation not found" })
    }

    if (!variation.is_available || variation.stock_quantity < quantity) {
      return res.status(400).json({ message: "Product not available or insufficient stock" })
    }

    // Get or create cart
    let cart = await Cart.findOne({ where: { user_id: req.user.user_id } })
    if (!cart) {
      cart = await Cart.create({ user_id: req.user.user_id })
    }

    // Check if item already in cart
    let cartItem = await CartItem.findOne({
      where: { cart_id: cart.cart_id, variation_id },
    })

    if (cartItem) {
      // Update quantity
      const newQuantity = cartItem.quantity + quantity
      if (newQuantity > variation.stock_quantity) {
        return res.status(400).json({ message: "Insufficient stock" })
      }
      await cartItem.update({ quantity: newQuantity })
    } else {
      // Create new cart item
      cartItem = await CartItem.create({
        cart_id: cart.cart_id,
        variation_id,
        quantity,
        price_at_add: variation.price,
      })
    }

    res.status(201).json({
      message: "Item added to cart",
      cart_item: cartItem,
    })
  } catch (error) {
    next(error)
  }
}

// Update cart item quantity
exports.updateCartItem = async (req, res, next) => {
  try {
    const { cart_item_id } = req.params
    const { quantity } = req.body

    const cartItem = await CartItem.findOne({
      where: { cart_item_id },
      include: [
        {
          model: Cart,
          where: { user_id: req.user.user_id },
        },
        {
          model: ProductVariation,
          as: "variation",
        },
      ],
    })

    if (!cartItem) {
      return res.status(404).json({ message: "Cart item not found" })
    }

    if (quantity > cartItem.variation.stock_quantity) {
      return res.status(400).json({ message: "Insufficient stock" })
    }

    if (quantity <= 0) {
      await cartItem.destroy()
      return res.json({ message: "Item removed from cart" })
    }

    await cartItem.update({ quantity })

    res.json({
      message: "Cart item updated",
      cart_item: cartItem,
    })
  } catch (error) {
    next(error)
  }
}

// Remove item from cart
exports.removeCartItem = async (req, res, next) => {
  try {
    const { cart_item_id } = req.params

    const cartItem = await CartItem.findOne({
      where: { cart_item_id },
      include: [
        {
          model: Cart,
          where: { user_id: req.user.user_id },
        },
      ],
    })

    if (!cartItem) {
      return res.status(404).json({ message: "Cart item not found" })
    }

    await cartItem.destroy()

    res.json({ message: "Item removed from cart" })
  } catch (error) {
    next(error)
  }
}

// Clear cart
exports.clearCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({
      where: { user_id: req.user.user_id },
    })

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" })
    }

    await CartItem.destroy({ where: { cart_id: cart.cart_id } })

    res.json({ message: "Cart cleared" })
  } catch (error) {
    next(error)
  }
}
