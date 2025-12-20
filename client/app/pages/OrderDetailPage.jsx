import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useOrder } from "../hooks/useOrders";
import LoadingSpinner from "../components/LoadingSpinner";
import { formatPrice } from "../utils/formatters";
import { canCancel } from "../utils/orderCanCancel";
import { useCancelOrder, useRetryVnpayPayment } from "../hooks/useOrders";
import ChangePaymentMethodDialog from "../components/ChangePaymentMethodDialog";
import EditShippingAddressDialog from "../components/EditShippingAddressDialog";
import {
  useChangePaymentMethod,
  useUpdateShippingAddress,
} from "../hooks/useOrders";

function Badge({ children, tone = "gray" }) {
  const map = {
    gray: "bg-gray-100 text-gray-700",
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
    violet: "bg-violet-100 text-violet-700",
  };
  return (
    <span
      className={`px-2 py-1 rounded text-xs font-medium ${
        map[tone] || map.gray
      }`}
    >
      {children}
    </span>
  );
}

function statusTone(status) {
  switch (status) {
    case "AWAITING_PAYMENT":
      return "amber";
    case "processing":
      return "blue";
    case "shipping":
      return "violet";
    case "delivered":
      return "green";
    case "cancelled":
    case "FAILED":
      return "red";
    default:
      return "gray";
  }
}

export default function OrderDetailPage() {
  const { id } = useParams(); // route: /orders/:id
  const { data, isLoading, error } = useOrder(id);
  const cancelOrder = useCancelOrder();
  const navigate = useNavigate();
  const [openChangePM, setOpenChangePM] = useState(false);
  const [openEditShip, setOpenEditShip] = useState(false);
  const retryPay = useRetryVnpayPayment({ autoRedirect: true });
  const changePM = useChangePaymentMethod({ autoRedirect: true });
  const updateAddr = useUpdateShippingAddress();
  if (isLoading) {
    return (
      <div className="py-16 flex justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="py-12 text-center text-red-600">
        Không tải được chi tiết đơn.
      </div>
    );
  }

  const o = data?.order;
  if (!o) return null;

  const pay = o.payment || {};
  const canPayAgain =
    (o.status === "AWAITING_PAYMENT" &&
      pay.provider === "VNPAY" &&
      pay.payment_status === "pending") ||
    (o.status === "FAILED" && pay.provider === "VNPAY");

  const handleCancel = () => {
    cancelOrder.mutate(
      { orderId: o.order_id, reason: "Khách tự hủy" },
      {
        onSuccess: () => {
          // ✅ chuyển thẳng sang tab ĐÃ HỦY
          navigate("/orders?tab=cancelled", { replace: true });
        },
      }
    );
  };

  return (
    <div className="bg-gray-50 min-h-screen py-6">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Đơn hàng #{o.order_code}</h1>
            <p className="text-sm text-gray-500">
              Tạo lúc {new Date(o.created_at).toLocaleString("vi-VN")}
            </p>
          </div>
          <Badge tone={statusTone(o.status)}>{o.status}</Badge>
        </div>

        {/* Tổng tiền */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">Tổng thanh toán</div>
          <div className="flex items-center gap-3">
            {canCancel(o) && (
              <button
                onClick={handleCancel}
                className="px-3 py-2 text-sm rounded border border-red-500 text-red-600 hover:bg-red-50"
                disabled={cancelOrder.isPending}
              >
                {cancelOrder.isPending ? "Đang hủy..." : "Hủy đơn"}
              </button>
            )}
            <div className="text-2xl font-bold text-blue-600">
              {formatPrice(o.final_amount)}
            </div>
          </div>
        </div>

        {/* Order Timeline */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Dòng thời gian đơn hàng</h2>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
            <div className="space-y-6">
              {/* Đã đặt hàng */}
              <div className="relative flex items-start gap-4">
                <div className="relative z-10 flex items-center justify-center w-8 h-8 bg-blue-500 rounded-full text-white text-sm font-bold">
                  ✓
                </div>
                <div className="flex-1 pt-1">
                  <div className="font-semibold text-gray-900">Đã đặt hàng</div>
                  <div className="text-sm text-gray-500">
                    {new Date(o.created_at).toLocaleString("vi-VN")}
                  </div>
                </div>
              </div>

              {/* Đã thanh toán (nếu VNPAY completed) */}
              {pay?.provider === "VNPAY" && pay?.payment_status === "completed" && (
                <div className="relative flex items-start gap-4">
                  <div className="relative z-10 flex items-center justify-center w-8 h-8 bg-green-500 rounded-full text-white text-sm font-bold">
                    ✓
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="font-semibold text-gray-900">Đã thanh toán</div>
                    <div className="text-sm text-gray-500">
                      {pay.paid_at ? new Date(pay.paid_at).toLocaleString("vi-VN") : ""}
                    </div>
                  </div>
                </div>
              )}

              {/* Đang xử lý */}
              {["processing", "shipping", "delivered"].includes(o.status) && (
                <div className="relative flex items-start gap-4">
                  <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-bold ${
                    ["shipping", "delivered"].includes(o.status) ? "bg-blue-500" : "bg-blue-400"
                  }`}>
                    ✓
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="font-semibold text-gray-900">Đang xử lý</div>
                    <div className="text-sm text-gray-500">
                      Đơn hàng đang được chuẩn bị
                    </div>
                  </div>
                </div>
              )}

              {/* Đang vận chuyển */}
              {["shipping", "delivered"].includes(o.status) && (
                <div className="relative flex items-start gap-4">
                  <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-bold ${
                    o.status === "delivered" ? "bg-blue-500" : "bg-blue-400"
                  }`}>
                    {o.status === "delivered" ? "✓" : "🚚"}
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="font-semibold text-gray-900">Đang vận chuyển</div>
                    <div className="text-sm text-gray-500">
                      Đơn hàng đang trên đường giao đến bạn
                    </div>
                  </div>
                </div>
              )}

              {/* Đã giao */}
              {o.status === "delivered" && (
                <div className="relative flex items-start gap-4">
                  <div className="relative z-10 flex items-center justify-center w-8 h-8 bg-green-500 rounded-full text-white text-sm font-bold">
                    ✓
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="font-semibold text-gray-900">Đã giao hàng</div>
                    <div className="text-sm text-gray-500">
                      {o.updated_at ? new Date(o.updated_at).toLocaleString("vi-VN") : ""}
                    </div>
                  </div>
                </div>
              )}

              {/* Đã hủy */}
              {(o.status === "cancelled" || o.status === "FAILED") && (
                <div className="relative flex items-start gap-4">
                  <div className="relative z-10 flex items-center justify-center w-8 h-8 bg-red-500 rounded-full text-white text-sm font-bold">
                    ✕
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="font-semibold text-gray-900">
                      {o.status === "FAILED" ? "Thanh toán thất bại" : "Đã hủy"}
                    </div>
                    <div className="text-sm text-gray-500">
                      {o.updated_at ? new Date(o.updated_at).toLocaleString("vi-VN") : ""}
                      {o.note && (
                        <div className="mt-1 text-red-600">{o.note}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2 cột */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cột trái: items */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-lg font-semibold mb-3">Sản phẩm</h2>
            <div className="divide-y">
              {o.items.map((it) => (
                <div key={it.order_item_id} className="py-3 flex gap-3">
                  <img
                    src={
                      it.product?.thumbnail_url ||
                      "/placeholder.svg?height=80&width=80"
                    }
                    alt={it.product?.product_name || ""}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 line-clamp-2">
                      {it.product?.product_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      SL: {it.quantity}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    {it.discount_amount > 0 ? (
                      <>
                        <div className="line-through text-gray-400">
                          {formatPrice(Number(it.price) * it.quantity)}
                        </div>
                        <div className="font-semibold text-blue-600">
                          {formatPrice(it.subtotal)}
                        </div>
                      </>
                    ) : (
                      <div className="font-semibold text-blue-600">
                        {formatPrice(Number(it.price) * it.quantity)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Tổng hợp */}
            <div className="mt-4 border-t pt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Tạm tính</span>
                <span>{formatPrice(o.total_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Giảm giá</span>
                <span>-{formatPrice(o.discount_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Phí vận chuyển</span>
                <span>{formatPrice(o.shipping_fee)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-base font-bold">
                <span>Thành tiền</span>
                <span className="text-blue-600">
                  {formatPrice(o.final_amount)}
                </span>
              </div>
            </div>
          </div>

          {/* Cột phải: thông tin giao hàng + thanh toán */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold mb-2">
                  Thông tin giao hàng
                </h3>
                {!["shipping", "delivered", "cancelled"].includes(o.status) && (
                  <button
                    onClick={() => setOpenEditShip(true)}
                    className="text-sm px-2 py-1 border rounded hover:bg-gray-50"
                  >
                    Sửa địa chỉ
                  </button>
                )}
              </div>

              <div className="text-sm">
                <div>
                  <b>Người nhận:</b> {o.shipping_name}
                </div>
                <div>
                  <b>Điện thoại:</b> {o.shipping_phone}
                </div>
                <div className="mt-1">
                  <b>Địa chỉ:</b> {o.shipping_address}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold mb-2">Thanh toán</h3>
                {!["shipping", "delivered", "cancelled"].includes(o.status) &&
                  o.payment?.payment_status !== "completed" && (
                    <button
                      onClick={() => setOpenChangePM(true)}
                      className="text-sm px-2 py-1 border rounded hover:bg-gray-50"
                    >
                      Đổi phương thức
                    </button>
                  )}
              </div>
              <div className="text-sm space-y-1">
                <div>
                  <b>Nhà cung cấp:</b> {pay.provider || "COD"}
                </div>
                <div>
                  <b>Phương thức:</b> {pay.payment_method || "-"}
                </div>
                <div>
                  <b>Trạng thái:</b> {pay.payment_status || "-"}
                </div>
                {pay.paid_at && (
                  <div>
                    <b>Đã thanh toán lúc:</b>{" "}
                    {new Date(pay.paid_at).toLocaleString("vi-VN")}
                  </div>
                )}
                <div>
                  <b>Mã giao dịch:</b> {pay.txn_ref || "-"}
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                {canPayAgain && (
                  <div className="mt-3">
                    <button
                      onClick={() =>
                        retryPay.mutate({
                          orderId: o.order_id,
                          method: pay.payment_method || "VNPAYQR",
                        })
                      }
                      disabled={retryPay.isPending}
                      className="inline-flex items-center px-3 py-2 rounded bg-emerald-600 text-white text-sm disabled:opacity-50"
                    >
                      {retryPay.isPending
                        ? "Đang tạo link..."
                        : "Thanh toán lại"}
                    </button>
                  </div>
                )}
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

            <div>
              <Link
                to="/orders"
                className="text-sm text-blue-600 hover:underline"
              >
                ← Quay lại danh sách
              </Link>
            </div>
          </div>
        </div>

        <ChangePaymentMethodDialog
          open={openChangePM}
          onClose={() => setOpenChangePM(false)}
          initialProvider={
            pay.provider || (o.status === "AWAITING_PAYMENT" ? "VNPAY" : "COD")
          }
          initialMethod={
            pay.payment_method || (pay.provider === "VNPAY" ? "VNPAYQR" : "COD")
          }
          disabled={changePM.isPending}
          onSubmit={({ provider, method }) => {
            changePM.mutate(
              { orderId: o.order_id, provider, method },
              {
                onSuccess: () => {
                  setOpenChangePM(false);
                },
                onError: (err) => {
                  alert(
                    err?.response?.data?.message || "Đổi phương thức thất bại"
                  );
                },
              }
            );
          }}
        />

        <EditShippingAddressDialog
          open={openEditShip}
          onClose={() => setOpenEditShip(false)}
          initialValue={{
            shipping_name: o.shipping_name,
            shipping_phone: o.shipping_phone,
            shipping_address: o.shipping_address,
            province_id: o.province_id,
            ward_id: o.ward_id,
            geo_lat: o.geo_lat,
            geo_lng: o.geo_lng,
          }}
          disabled={updateAddr.isPending}
          onSubmit={(payload) => {
            updateAddr.mutate(
              { orderId: o.order_id, payload },
              {
                onSuccess: () => {
                  setOpenEditShip(false);
                },
                onError: (err) => {
                  alert(
                    err?.response?.data?.message ||
                      "Cập nhật địa chỉ thất bại. (Có thể đơn đã thanh toán và phí ship thay đổi)"
                  );
                },
              }
            );
          }}
        />
      </div>
    </div>
  );
}
