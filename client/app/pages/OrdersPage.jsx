import { useMemo, useState, useEffect } from "react";
import { useOrders, useOrderCounters } from "../hooks/useOrders";
import { matchTab } from "../utils/orderTabs";
import { formatPrice } from "../utils/formatters";
import LoadingSpinner from "../components/LoadingSpinner";
import { Link, useSearchParams } from "react-router-dom";
import { canCancel } from "../utils/orderCanCancel";
import { useCancelOrder, useRetryVnpayPayment } from "../hooks/useOrders";

const TABS = [
  { key: "all", label: "Tất cả" },
  { key: "awaiting_payment", label: "Chờ thanh toán" },
  { key: "to_ship", label: "Chờ giao hàng" },
  { key: "shipping", label: "Vận chuyển" },
  { key: "completed", label: "Hoàn thành" },
  { key: "cancelled", label: "Đã hủy" },
  { key: "failed", label: "Thanh toán thất bại" },
];

export default function OrdersPage() {
  // ✅ đọc/ghi query params
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "all";
  const initialPage = Number(searchParams.get("page") || 1);
  const initialQ = searchParams.get("q") || "";

  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const limit = 10;

  // Khi tab/page/q đổi -> ghi lại vào URL (để có thể deep-link)
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    params.set("page", String(page));
    if (q) params.set("q", q);
    else params.delete("q");
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, page, q]);

  const { data, isLoading, error, isFetching } = useOrders({
    tab,
    page,
    limit,
    q,
    sort: "created_at:desc",
  });

  const cancelOrder = useCancelOrder();

  const orders = data?.orders || [];
  const pagination = data?.pagination;

  const visibleOrders = useMemo(
    () => orders.filter((o) => matchTab(o, tab)),
    [orders, tab]
  );

  const retryPay = useRetryVnpayPayment({ autoRedirect: true });

  const { data: counters } = useOrderCounters();

  // Map key của tab -> key trong counters trả về từ BE
  const counterKeyMap = {
    all: "all",
    awaiting_payment: "awaiting_payment",
    to_ship: "to_ship", // BE đã trả sẵn alias
    shipping: "shipping",
    completed: "delivered", // tab 'completed' trên FE tương ứng delivered+completed
    cancelled: "cancelled",
    failed: "failed",
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold mb-4">Đơn hàng của tôi</h1>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto">
           {TABS.map((t) => {
            const countKey = counterKeyMap[t.key];
            const badge = counters?.[countKey] ?? 0;
             return (
               <button
                 key={t.key}
                 onClick={() => {
                   setTab(t.key);
                   setPage(1);
                 }}
                 className={`px-4 py-2 rounded-full border text-sm ${
                   tab === t.key
                     ? "bg-blue-600 text-white border-blue-600"
                     : "bg-white text-gray-700 border-gray-200"
                 }`}
               >
                <span className="inline-flex items-center gap-2">
                  <span>{t.label}</span>
                  <span className={`min-w-6 h-6 px-2 inline-flex items-center justify-center rounded-full text-xs
                    ${tab === t.key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"}`}>
                    {badge}
                  </span>
                </span>
               </button>
             );
           })}
         </div>

        {/* Search */}
        <div className="mt-4">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm mã đơn hoặc sản phẩm"
            className="w-full md:w-96 px-3 py-2 border rounded"
          />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="py-16 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <div className="text-red-600 py-8">Không tải được danh sách đơn.</div>
        ) : visibleOrders.length === 0 ? (
          <div className="bg-white rounded mt-6 p-10 text-center text-gray-600">
            Không có đơn nào.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {visibleOrders.map((o) => (
              <div key={o.order_id} className="bg-white rounded border p-4">
                {/* Header → link sang chi tiết */}
                <Link
                  to={`/orders/${o.order_id}`}
                  className="flex items-center justify-between hover:opacity-95 transition"
                >
                  <div className="font-semibold">
                    #{o.order_code} •{" "}
                    {new Date(o.created_at).toLocaleString("vi-VN")}
                  </div>
                  <div className="text-sm text-gray-600">
                    {o.payment?.provider || "COD"} •{" "}
                    {o.payment?.payment_status || "-"}
                  </div>
                </Link>

                {/* Preview items → cũng là link */}
                <Link
                  to={`/orders/${o.order_id}`}
                  className="mt-3 flex gap-3 block"
                >
                  {o.items_preview.map((it) => (
                    <div
                      key={it.variation_id}
                      className="flex items-center gap-3"
                    >
                      <img
                        src={
                          it.thumbnail_url ||
                          "/placeholder.svg?height=60&width=60"
                        }
                        alt={it.product_name || ""}
                        className="w-14 h-14 object-cover rounded"
                      />
                      <div className="text-sm">
                        <div className="font-medium line-clamp-1">
                          {it.product_name}
                        </div>
                        <div className="text-gray-500">x{it.quantity}</div>
                      </div>
                    </div>
                  ))}
                  {o.items_count > o.items_preview.length && (
                    <div className="text-sm text-gray-500 self-center">
                      +{o.items_count - o.items_preview.length} sản phẩm
                    </div>
                  )}
                </Link>

                {/* Footer + CTA */}
                <div className="mt-3 flex items-center justify-between border-t pt-3">
                  <div className="text-sm text-gray-600">
                    Trạng thái: <b>{o.status}</b>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-lg font-bold text-blue-600">
                      {formatPrice(o.final_amount)}
                    </div>

                    {canCancel(o) && (
                      <button
                        onClick={() =>
                          cancelOrder.mutate({
                            orderId: o.order_id,
                            reason: "Khách tự hủy",
                          })
                        }
                        disabled={cancelOrder.isPending}
                        className="px-3 py-2 text-sm rounded border border-red-500 text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {cancelOrder.isPending ? "Đang hủy..." : "Hủy đơn"}
                      </button>
                    )}
                  </div>
                </div>

                {o.status === "AWAITING_PAYMENT" &&
                  o.payment?.provider === "VNPAY" && (
                    <div className="mt-3">
                      <button
                        onClick={() =>
                          retryPay.mutate({
                            orderId: o.order_id,
                            method: o.payment?.payment_method || "VNPAYQR",
                          })
                        }
                        disabled={retryPay.isPending}
                        className="inline-flex items-center px-3 py-2 rounded bg-emerald-600 text-white text-sm disabled:opacity-50"
                      >
                        {retryPay.isPending
                          ? "Đang tạo link..."
                          : "Thanh toán ngay"}
                      </button>
                    </div>
                  )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-2 border rounded disabled:opacity-50"
            >
              Trước
            </button>
            <div className="text-sm">
              Trang {page} / {pagination.totalPages}
              {isFetching && <span className="ml-2 text-gray-400">…</span>}
            </div>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() =>
                setPage((p) => Math.min(pagination.totalPages, p + 1))
              }
              className="px-3 py-2 border rounded disabled:opacity-50"
            >
              Sau
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
