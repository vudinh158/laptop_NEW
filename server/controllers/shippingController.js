// server/controllers/shippingController.js
const { quoteShipping } = require("../services/shippingService");

exports.getQuote = async (req, res) => {
  try {
    const { province_id, ward_id, subtotal } = req.query;
    const q = await quoteShipping({
      province_id: Number(province_id),
      ward_id: ward_id ? Number(ward_id) : null,
      subtotal: Number(subtotal || 0)
    });
    res.json(q);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "QUOTE_FAILED" });
  }
};
