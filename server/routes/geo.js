// routes/geo.js
const express = require('express');
const router = express.Router();
const { Province, Ward } = require('../models'); // đường dẫn theo dự án của bạn

// GET /provinces
router.get('/provinces', async (req, res) => {
  const provinces = await Province.findAll({
    order: [['name','ASC']],
    attributes: ['province_id','name','slug','is_hcm','base_shipping_fee','is_free_shipping','max_shipping_fee']
  });
  res.json(provinces);
});

// GET /provinces/:id/wards
router.get('/provinces/:id/wards', async (req, res) => {
  const wards = await Ward.findAll({
    where: { province_id: req.params.id },
    order: [['name','ASC']],
    attributes: ['ward_id','name','slug','extra_fee','province_id']
  });
  res.json(wards);
});

module.exports = router;
