const qs = require("qs");
const crypto = require("crypto");

const config = {
  tmnCode: process.env.VNPAY_TMN_CODE || "XGEX2VEC",
  secretKey: process.env.VNPAY_SECRET_KEY || "I78VLL6L131O3IPSOCKOZ0POZU8QJL47",
  vnpUrl: process.env.VNPAY_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
  // Redirect về backend xử lý xong mới về frontend
  returnUrl: process.env.VNPAY_RETURN_URL || "http://localhost:5000/api/vnpay/return",
};

function sortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, "+");
  }
  return sorted;
}

/**
 * Hàm tạo URL thanh toán
 * - KHÔNG ép vnp_BankCode (để VNPAY tự hiện màn hình chọn phương thức/ngân hàng)
 * - Nếu bạn thật sự muốn ép, hãy truyền "method" và chỉ set khi chắc chắn sandbox hỗ trợ
 */
exports.getPaymentUrl = async ({ method, amount, txnRef, orderDesc, ipAddr }) => {
  const date = new Date();
  const createDate = date.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);

  const vnp_Params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: config.tmnCode,
    vnp_Locale: "vn",
    vnp_CurrCode: "VND",
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: orderDesc || `Thanh toan don hang ${txnRef}`,
    vnp_OrderType: "other",
    vnp_Amount: Math.round(Number(amount) * 100), // VNPAY tính theo đơn vị đồng (x100)
    vnp_ReturnUrl: config.returnUrl,
    vnp_IpAddr: ipAddr || "127.0.0.1",
    vnp_CreateDate: createDate
  };

  // (không khuyến nghị) Nếu bạn muốn ép bankCode, mở lại đoạn này:
  // let bankCode = null;
  // if (method === "VNPAYQR") bankCode = "VNPAYQR";
  // else if (method === "VNBANK") bankCode = "VNBANK";
  // else if (method === "INTCARD") bankCode = "INTCARD";
  // if (bankCode) vnp_Params["vnp_BankCode"] = bankCode;

  // Sắp xếp và tạo chữ ký
  const sortedParams = sortObject(vnp_Params);
  const signData = qs.stringify(sortedParams, { encode: false });
  const hmac = crypto.createHmac("sha512", config.secretKey);
  const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  vnp_Params["vnp_SecureHash"] = signed;

  return `${config.vnpUrl}?${qs.stringify(vnp_Params, { encode: false })}`;
};

/**
 * Hàm xác minh dữ liệu trả về (Dùng cho vnpayController)
 */
exports.verifyReturnUrl = (vnp_Params) => {
  const params = { ...vnp_Params }; // tránh mutate input
  const secureHash = params["vnp_SecureHash"];

  // Xóa các key không tham gia ký
  delete params["vnp_SecureHash"];
  delete params["vnp_SecureHashType"];

  const sortedParams = sortObject(params);
  const signData = qs.stringify(sortedParams, { encode: false });
  const hmac = crypto.createHmac("sha512", config.secretKey);
  const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  return {
    isSuccess: secureHash === signed && params["vnp_ResponseCode"] === "00",
    vnp_Params: params,
  };
};
