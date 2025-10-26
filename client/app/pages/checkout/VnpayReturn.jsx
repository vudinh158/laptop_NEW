// app/pages/checkout/VnpayReturn.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function VnpayReturn() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  const qp = useMemo(() => new URLSearchParams(search), [search]);
  const code   = qp.get("vnp_ResponseCode");       // "00" nếu điều hướng OK
  const status = qp.get("vnp_TransactionStatus");  // "00" nếu giao dịch thành công
  const txnRef = qp.get("vnp_TxnRef");
  const transNo = qp.get("vnp_TransactionNo");
  const amount = Number(qp.get("vnp_Amount") || 0) / 100;

  const isSuccess = code === "00" && status === "00";

  // Đếm lùi rồi đẩy về trang đơn hàng của tôi (hoặc trang chi tiết đơn)
  useEffect(() => {
    const t = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (countdown === 0) {
      // tuỳ luồng của bạn: về trang /orders hoặc /account/orders
      navigate("/orders", { replace: true });
    }
  }, [countdown, navigate]);

  return (
    <div className="max-w-xl mx-auto py-16 px-4">
      <div className="rounded-2xl border p-6 shadow-sm">
        <div className={`text-2xl font-semibold ${isSuccess ? "text-green-600" : "text-red-600"}`}>
          {isSuccess ? "Thanh toán thành công" : "Thanh toán không thành công"}
        </div>

        <div className="mt-4 space-y-1 text-sm text-gray-700">
          <div><span className="font-medium">Mã tham chiếu (TxnRef):</span> {txnRef}</div>
          <div><span className="font-medium">Mã giao dịch VNPAY:</span> {transNo || "-"}</div>
          <div><span className="font-medium">Số tiền:</span> {amount.toLocaleString("vi-VN")} đ</div>
          <div><span className="font-medium">Mã phản hồi:</span> {code}</div>
          <div><span className="font-medium">Trạng thái:</span> {status}</div>
          <div className="text-gray-500 mt-2">
            * Lưu ý: trạng thái đơn hàng được cập nhật theo IPN từ VNPAY. Vui lòng đợi vài giây nếu chưa thấy đổi.
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => navigate("/orders", { replace: true })}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white"
          >
            Về đơn hàng của tôi
          </button>
          <button
            onClick={() => navigate("/", { replace: true })}
            className="px-4 py-2 rounded-lg border"
          >
            Về trang chủ
          </button>
        </div>

        <div className="mt-4 text-xs text-gray-500">
          Tự động chuyển về trang đơn hàng sau {countdown}s…
        </div>
      </div>
    </div>
  );
}
