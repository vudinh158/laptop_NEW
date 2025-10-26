// services/vnpayService.js
const qs = require("qs");
const crypto = require("crypto");

/** Đọc ENV (chấp nhận cả 2 kiểu tên để tránh nhầm) */
function getEnv() {
  const VNP_TMN_CODE   = process.env.VNP_TMN_CODE;
  const VNP_HASHSECRET = process.env.VNP_HASHSECRET;
  const VNP_URL        = process.env.VNP_URL || process.env.VNP_PAYURL;
  const VNP_RETURN_URL = process.env.VNP_RETURN_URL || process.env.VNP_RETURNURL;
  if (!VNP_TMN_CODE || !VNP_HASHSECRET || !VNP_URL || !VNP_RETURN_URL) {
    throw new Error(
      "Missing ENV: " +
        JSON.stringify({
          VNP_TMN_CODE: !!VNP_TMN_CODE,
          VNP_HASHSECRET: !!VNP_HASHSECRET,
          VNP_URL: !!VNP_URL,
          VNP_RETURN_URL: !!VNP_RETURN_URL,
        })
    );
  }
  return { VNP_TMN_CODE, VNP_HASHSECRET, VNP_URL, VNP_RETURN_URL };
}

/** sort + URL-encode giống mẫu VNPAY (keys & values), space -> '+' */
function sortObjectForVnp(obj) {
  const encoded = {};
  const keys = [];
  for (const k in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      keys.push(encodeURIComponent(k));
    }
  }
  keys.sort();
  for (let i = 0; i < keys.length; i++) {
    const encKey = keys[i];
    const rawKey = decodeURIComponent(encKey);
    const val = obj[rawKey];
    encoded[encKey] = encodeURIComponent(String(val)).replace(/%20/g, "+");
  }
  return encoded;
}

function hmacSHA512(secret, data) {
  return crypto.createHmac("sha512", secret).update(data, "utf-8").digest("hex");
}

/** Build URL thanh toán VNPAY (QR/ATM/INTCARD) — theo đúng mẫu ký của VNPAY */
function buildRedirectUrl({ amount, orderDesc, txnRef, ipAddr, bankCode /* 'VNPAYQR'|'VNBANK'|'INTCARD' */ }) {
  const { VNP_TMN_CODE, VNP_HASHSECRET, VNP_URL, VNP_RETURN_URL } = getEnv();

  // Ép IP về IPv4 để tránh lệch chữ ký trên sandbox
  const rawIp  = ipAddr || "127.0.0.1";
  const safeIp = rawIp.includes(":") ? "127.0.0.1" : rawIp;

  const date = new Date();
  const createDate = date.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14); // YYYYMMDDHHmmss

  // Tham số thô (chưa encode)
  let vnp_Params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: VNP_TMN_CODE,
    vnp_Locale: "vn",
    vnp_CurrCode: "VND",
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: orderDesc || `Thanh toan cho ma GD: ${txnRef}`,
    vnp_OrderType: "other",
    vnp_Amount: Math.round(Number(amount) * 100),
    vnp_ReturnUrl: VNP_RETURN_URL,
    vnp_IpAddr: safeIp,
    vnp_CreateDate: createDate,
  };
  if (bankCode) vnp_Params.vnp_BankCode = bankCode;

  // Encode + sort theo mẫu VNPAY
  vnp_Params = sortObjectForVnp(vnp_Params);

  // Ký trên chuỗi đã encode + sort; KHÔNG encode thêm khi stringify để ký
  const signData  = qs.stringify(vnp_Params, { encode: false });
  const signed    = hmacSHA512(VNP_HASHSECRET, signData);

  // Gắn chữ ký (mẫu demo chỉ gắn vnp_SecureHash; có thể thêm vnp_SecureHashType nếu muốn)
  vnp_Params["vnp_SecureHash"] = signed;

  // Build URL: stringify với encode:false (đúng theo mẫu)
  const payUrl = `${VNP_URL}?${qs.stringify(vnp_Params, { encode: false })}`;

  // Debug nếu cần
  // console.log("[VNP] signData:", signData);
  // console.log("[VNP] hash:", signed);
  // console.log("[VNP] URL:", payUrl);

  return payUrl;
}

/** Facade chung để controller gọi */
async function getPaymentUrl({ method, amount, txnRef, orderDesc, ipAddr }) {
  // Map method -> BankCode giống FE đang gửi
  const bankCode = ({ VNPAYQR: "VNPAYQR", VNBANK: "VNBANK", INTCARD: "INTCARD" })[method];
  return buildRedirectUrl({ amount, orderDesc, txnRef, ipAddr, bankCode });
}

module.exports = { getPaymentUrl };
