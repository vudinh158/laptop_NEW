// client/utils/orderTabs.js
export function matchTab(order, tab) {
  const p = order.payment || {};
  const prov = p.provider;
  const pstatus = p.payment_status;
  const ostatus = order.status;

  if (tab === "awaiting_payment") {
    return ostatus === "AWAITING_PAYMENT" && prov === "VNPAY" && pstatus === "pending";
  }
  if (tab === "to_ship") {
    if (ostatus !== "processing") return false;
    const codOk   = prov === "COD"   && pstatus === "pending";
    const vnpOk   = prov === "VNPAY" && pstatus === "completed";
    return codOk || vnpOk;
  }
  if (tab === "shipping") {
    if (ostatus !== "shipping") return false;
    const codOk   = prov === "COD"   && pstatus === "pending";
    const vnpOk   = prov === "VNPAY" && pstatus === "completed";
    return codOk || vnpOk;
  }
  if (tab === "completed") {
    return ostatus === "delivered" && pstatus === "completed";
  }
  if (tab === "cancelled") {
    return ostatus === "cancelled" || ostatus === "FAILED";
  }
  if (tab === "failed") {
    return ostatus === "FAILED";
  }
  // all
  return true;
}
