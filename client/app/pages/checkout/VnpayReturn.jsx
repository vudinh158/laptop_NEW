// app/pages/checkout/VnpayReturn.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../services/api";
import LoadingSpinner from "../../components/LoadingSpinner";

export default function VnpayReturn() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);
  const [msg, setMsg] = useState("Đang xác minh thanh toán...");
  const [verifying, setVerifying] = useState(true);

  const qp = useMemo(() => new URLSearchParams(search), [search]);
  const code = qp.get("vnp_ResponseCode"); // "00" nếu điều hướng OK
  const status = qp.get("vnp_TransactionStatus"); // "00" nếu giao dịch thành công
  const txnRef = qp.get("vnp_TxnRef");
  const transNo = qp.get("vnp_TransactionNo");
  const amount = Number(qp.get("vnp_Amount") || 0) / 100;

  const isSuccess = code === "00" && status === "00";

   // Poll verify endpoint vài lần nếu IPN chưa kịp đến
  useEffect(() => {
    let triesLeft = 5;
    let timer;

    const decideAndNav = (data) => {
      const pay = data?.payment_status;
      const ord = data?.order_status;

      if (pay === "completed" && ord === "processing") {
        // ✅ Thành công → Chờ giao hàng
        navigate("/orders?tab=to_ship", { replace: true });
        return true;
      }
      if (pay === "failed" || ord === "FAILED") {
        navigate("/orders?tab=failed", { replace: true });
        return true;
      }
      if (ord === "AWAITING_PAYMENT") {
        navigate("/orders?tab=awaiting_payment", { replace: true });
        return true;
      }
      return false; // chưa rõ → sẽ poll tiếp
    };

    const verifyOnce = async () => {
      try {
        const { data } = await api.get(`/vnpay/repay${location.search}`)
        if (data?.ok) {
          if (decideAndNav(data)) return;
          // IPN chưa kịp update → đợi rồi thử lại
          setMsg("Đang đợi xác nhận từ VNPAY…");
        } else {
          setMsg("Xác minh thất bại. Sẽ quay lại trang đơn hàng.");
        }
      } catch {
        setMsg("Có lỗi khi xác minh. Sẽ quay lại trang đơn hàng.");
      }

      triesLeft -= 1;
      if (triesLeft > 0) {
        timer = setTimeout(verifyOnce, 1500);
      } else {
        setVerifying(false);
      }
    };

    verifyOnce();
    return () => clearTimeout(timer);
  }, [navigate, search]);

  // Fallback đếm lùi để tự về /orders nếu không auto điều hướng ở trên
  useEffect(() => {
    if (!verifying) {
      const t = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
      return () => clearInterval(t);
    }
  }, [verifying]);

  useEffect(() => {
    if (!verifying && countdown === 0) {
      navigate("/orders", { replace: true });
    }
  }, [countdown, verifying, navigate]);

  return (
    <div className="max-w-xl mx-auto py-16 px-4">
      <div className="rounded-2xl border p-6 shadow-sm">
        <div className="text-2xl font-semibold">
          {verifying ? "Đang xác minh thanh toán" : "Kết quả thanh toán"}
        </div>

        {/* Thông tin tham khảo từ query (không quyết định điều hướng) */}
        <div className="mt-4 space-y-1 text-sm text-gray-700">
          <div><span className="font-medium">Mã tham chiếu (TxnRef):</span> {txnRef}</div>
          <div><span className="font-medium">Mã giao dịch VNPAY:</span> {transNo || "-"}</div>
          <div><span className="font-medium">Số tiền:</span> {amount.toLocaleString("vi-VN")} đ</div>
          <div><span className="font-medium">Mã phản hồi (redirect):</span> {code || "-"}</div>
          <div><span className="font-medium">Trạng thái (redirect):</span> {status || "-"}</div>
          <div className="text-gray-500 mt-2">
            * Trạng thái đơn hàng được chốt theo IPN & xác minh từ máy chủ.
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          {verifying ? (
            <div className="flex items-center gap-2 text-gray-700">
              <LoadingSpinner size="sm" /> <span>{msg}</span>
            </div>
          ) : (
            <>
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
              <div className="text-xs text-gray-500">
                Tự động chuyển về đơn hàng sau {countdown}s…
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
