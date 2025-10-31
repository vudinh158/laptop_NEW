// controllers/cartController.js
const { Cart, CartItem, ProductVariation, Product, ProductImage } = require("../models");

// helper: luôn có cart
async function getOrCreateCart(user_id) {
  let cart = await Cart.findOne({ where: { user_id } });
  if (!cart) cart = await Cart.create({ user_id });
  return cart;
}

// Chuẩn hoá 1 item để FE render
function normalizeItem(ci) {
  const pv = ci.variation;
  const p = pv?.product;
  const primaryImg = p?.images?.[0]?.image_url || null;
  const price = Number(pv?.price || 0);
  const discountPct = Number(p?.discount_percentage || 0);
  const priceAfterDiscount = Math.max(0, price * (1 - discountPct / 100));
  return {
    cart_item_id: ci.cart_item_id,
    variation_id: ci.variation_id,
    quantity: ci.quantity,
    // snapshot lưu lúc add (không giảm giá)
    price_at_add: Number(ci.price_at_add || 0),
    // để FE render:
    product: p
      ? {
          product_id: p.product_id,
          product_name: p.product_name,
          thumbnail_url: primaryImg,
          discount_percentage: discountPct,
          variation: { price },
          // có thể thêm thuộc tính khác nếu cần
        }
      : null,
    // tính sẵn cho UI (không dùng gửi sang BE khi tạo order)
    unit_price_after_discount: priceAfterDiscount,
    line_total_after_discount: priceAfterDiscount * ci.quantity,
  };
}

// GET /cart
exports.getCart = async (req, res, next) => {
  try {
    const user_id = req.user.user_id;
    const cart = await getOrCreateCart(user_id);

    const items = await CartItem.findAll({
      where: { cart_id: cart.cart_id },
      include: [
        {
          model: ProductVariation,
          as: "variation",
          include: [
            {
              model: Product,
              as: "product", // <<== QUAN TRỌNG: alias phải trùng model associations
              include: [
                {
                  model: ProductImage,
                  as: "images",
                  where: { is_primary: true },
                  required: false,
                },
              ],
            },
          ],
        },
      ],
      order: [["added_at", "DESC"]],
    });

    const norm = items.map(normalizeItem);

    // subtotal theo snapshot (price_at_add)
    const subtotal_snapshot = norm.reduce(
      (s, it) => s + Number(it.price_at_add || 0) * Number(it.quantity || 0),
      0
    );

    // subtotal “hiện hành” (áp discount theo Product.discount_percentage)
    const subtotal_live = norm.reduce(
      (s, it) => s + Number(it.line_total_after_discount || 0),
      0
    );

    return res.json({
      cart: {
        cart_id: cart.cart_id,
        item_count: norm.reduce((s, it) => s + Number(it.quantity || 0), 0),
        items: norm,
        subtotal_snapshot,
        subtotal_live,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /cart/items  (body: { variation_id, quantity })
exports.addToCart = async (req, res, next) => {
  try {
    const user_id = req.user.user_id;
    const { variation_id, quantity = 1 } = req.body;

    const variation = await ProductVariation.findByPk(variation_id, {
      include: [{ model: Product, as: "product" }],
    });
    if (!variation) return res.status(404).json({ message: "Product variation not found" });

    if (!variation.is_available || Number(variation.stock_quantity) < Number(quantity)) {
      return res.status(400).json({ message: "Product not available or insufficient stock" });
    }

    const cart = await getOrCreateCart(user_id);

    // Upsert theo (cart_id, variation_id)
    const [ci, created] = await CartItem.findOrCreate({
      where: { cart_id: cart.cart_id, variation_id },
      defaults: {
        quantity,
        price_at_add: variation.price, // snapshot
      },
    });

    if (!created) {
      const newQty = Number(ci.quantity) + Number(quantity);
      if (newQty > Number(variation.stock_quantity)) {
        return res.status(400).json({ message: "Insufficient stock" });
      }
      ci.quantity = newQty;
      // OPTIONAL: cập nhật snapshot nếu bạn muốn giá mới nhất
      // ci.price_at_add = variation.price;
      await ci.save();
    }

    return exports.getCart(req, res, next); // trả lại giỏ đã chuẩn hoá
  } catch (error) {
    next(error);
  }
};

// vẫn cho phép fallback theo variation_id nếu cần
exports.updateCartItem = async (req, res, next) => {
  try {
    const user_id = req.user.user_id;
    const cart_item_id_param = req.params.cart_item_id;   // ← lấy từ params
    const { variation_id, cart_item_id: cart_item_id_body, quantity } = req.body;

    if (quantity == null) return res.status(400).json({ message: "quantity is required" });

    const cart = await getOrCreateCart(user_id);

    const where = cart_item_id_param
      ? { cart_item_id: cart_item_id_param, cart_id: cart.cart_id }
      : (cart_item_id_body
          ? { cart_item_id: cart_item_id_body, cart_id: cart.cart_id }
          : { cart_id: cart.cart_id, variation_id });

    const cartItem = await CartItem.findOne({
      where,
      include: [
        { model: ProductVariation, as: "variation", include: [{ model: Product, as: "product" }] },
      ],
    });

    if (!cartItem) return res.status(404).json({ message: "Cart item not found" });

    if (Number(quantity) <= 0) {
      await cartItem.destroy();
      return exports.getCart(req, res, next);
    }

    if (Number(quantity) > Number(cartItem.variation.stock_quantity)) {
      return res.status(400).json({ message: "Insufficient stock" });
    }

    cartItem.quantity = Number(quantity);
    await cartItem.save();

    return exports.getCart(req, res, next);
  } catch (error) {
    next(error);
  }
};

// DELETE /cart/:cart_item_id
// (vẫn hỗ trợ xoá theo variation_id nếu cần)
exports.removeCartItem = async (req, res, next) => {
  try {
    const user_id = req.user.user_id;
    const { cart_item_id, variation_id } = req.params;
    const cart = await getOrCreateCart(user_id);

    if (cart_item_id) {
      await CartItem.destroy({ where: { cart_id: cart.cart_id, cart_item_id } });
    } else if (variation_id) {
      await CartItem.destroy({ where: { cart_id: cart.cart_id, variation_id } });
    }

    return exports.getCart(req, res, next);
  } catch (error) {
    next(error);
  }
};

// DELETE /cart  (xoá hết)
exports.clearCart = async (req, res, next) => {
  try {
    const user_id = req.user.user_id;
    const cart = await getOrCreateCart(user_id);
    await CartItem.destroy({ where: { cart_id: cart.cart_id } });
    return exports.getCart(req, res, next);
  } catch (error) {
    next(error);
  }
};
