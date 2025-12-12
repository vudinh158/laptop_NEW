import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import LoadingSpinner from "../../components/LoadingSpinner";

export default function VnpayReturn() {
  const { search } = useLocation();
  const navigate = useNavigate();

  const [countdown, setCountdown] = useState(5);

  const qp = useMemo(() => new URLSearchParams(search), [search]);
  const status = qp.get("status");     // "success" | "failed"
  const orderId = qp.get("orderId");   // orderId

  useEffect(() => {
    // Backend đã verify chữ ký + update DB rồi mới redirect về đây
    // -> FE chỉ cần điều hướng theo status
    if (status === "success") {
      navigate("/orders?tab=to_ship", { replace: true });
      return;
    }
    if (status === "failed") {
      navigate("/orders?tab=failed", { replace: true });
      return;
    }

    // fallback nếu thiếu param
    const t = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [status, navigate]);

  useEffect(() => {
    if (countdown === 0) navigate("/orders", { replace: true });
  }, [countdown, navigate]);

  return (
    <div className="max-w-xl mx-auto py-16 px-4">
      <div className="rounded-2xl border p-6 shadow-sm">
        <div className="text-2xl font-semibold">Đang xử lý kết quả thanh toán</div>

        <div className="mt-4 space-y-1 text-sm text-gray-700">
          <div><span className="font-medium">OrderId:</span> {orderId || "-"}</div>
          <div><span className="font-medium">Status:</span> {status || "-"}</div>
          {!status && (
            <div className="text-xs text-gray-500">
              Thiếu tham số trạng thái. Tự chuyển về đơn hàng sau {countdown}s…
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center gap-2 text-gray-700">
          <LoadingSpinner size="sm" />
          <span>Đang điều hướng…</span>
        </div>
      </div>
    </div>
  );
}