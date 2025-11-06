// utils/orderCanCancel.js
export function canCancel(order) {
  const p = order.payment || {};
  const prov = p.provider;
  const ps   = p.payment_status;
  const os   = order.status;

  const awaitingVnpay = (prov === "VNPAY" && os === "AWAITING_PAYMENT" && ps === "pending");
  const toShipCOD     = (prov === "COD"   && os === "processing"       && ps === "pending");
  const toShipVNPAY   = (prov === "VNPAY" && os === "processing"       && ps === "completed");
  return awaitingVnpay || toShipCOD || toShipVNPAY;
}
