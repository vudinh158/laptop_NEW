// routes/shipping.js
const router = require("express").Router();
const { getQuote } = require("../controllers/shippingController");
router.get("/quote", getQuote);
module.exports = router;
