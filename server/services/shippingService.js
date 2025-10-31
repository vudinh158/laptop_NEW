// services/shippingService.js
const Province = require("../models/Province");
const Ward = require("../models/Ward");

/**
 * Tính phí ship dựa vào tỉnh/thành + phường/xã và tạm tính (subtotal).
 * Quy tắc ví dụ (tuỳ bạn chỉnh):
 *  - is_free_shipping => 0
 *  - base_shipping_fee + ward.extra_fee
 *  - nếu có max_shipping_fee => min(tổng phí, max_shipping_fee)
 */
async function quoteShipping({ province_id, ward_id, subtotal }) {
  const province = await Province.findByPk(province_id);
  if (!province) return { shipping_fee: 0, reason: "NO_PROVINCE" };

  let fee = Number(province.base_shipping_fee || 0);

  if (province.is_free_shipping) return { shipping_fee: 0, reason: "FREE_BY_PROVINCE" };

  if (ward_id) {
    const ward = await Ward.findByPk(ward_id);
    if (ward) fee += Number(ward.extra_fee || 0);
  }

  // ví dụ: freeship đơn nội HCM khi subtotal >= 1tr
  if (province.is_hcm && Number(subtotal) >= 1_000_000) return { shipping_fee: 0, reason: "HCM_SUBTOTAL_FREE" };

  if (province.max_shipping_fee != null) {
    fee = Math.min(fee, Number(province.max_shipping_fee));
  }

  return { shipping_fee: Math.max(0, Math.round(fee)) };
}

module.exports = { quoteShipping };
