import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
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
import { useProvinces } from "../hooks/useProvinces";
import { useWards } from "../hooks/useWards";
import { Clock, AlertTriangle } from "lucide-react";

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

function PaymentCountdown({ expiresAt, onExpired }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        onExpired && onExpired();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
      setIsExpired(false);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000); // Update every second

    return () => clearInterval(interval);
  }, [expiresAt, onExpired]);

  const isWarning = timeLeft.hours === 0 && timeLeft.minutes <= 10;

  return (
    <div className="mt-4 p-4 rounded-lg border bg-orange-50 border-orange-200">
      <div className="flex items-center gap-2 mb-2">
        {isExpired ? (
          <AlertTriangle className="w-5 h-5 text-red-600" />
        ) : (
          <Clock className="w-5 h-5 text-orange-600" />
        )}
        <span className="font-medium text-orange-800">
          {isExpired ? "Đã hết thời gian thanh toán" : "Thời gian còn lại để thanh toán"}
        </span>
      </div>

      {!isExpired && (
        <div className="text-2xl font-mono font-bold text-center">
          <span className={isWarning ? "text-red-600" : "text-orange-800"}>
            {String(timeLeft.hours).padStart(2, '0')}:
            {String(timeLeft.minutes).padStart(2, '0')}:
            {String(timeLeft.seconds).padStart(2, '0')}
          </span>
        </div>
      )}

      {isWarning && !isExpired && (
        <p className="text-sm text-red-600 text-center mt-2">
          ⚠️ Chỉ còn ít thời gian! Vui lòng thanh toán ngay để tránh đơn hàng bị hủy.
        </p>
      )}

      {isExpired && (
        <p className="text-sm text-red-600 text-center mt-2">
          Đơn hàng đã hết thời gian thanh toán và có thể bị hủy.
        </p>
      )}
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams(); // route: /orders/:id
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useOrder(id);
  const cancelOrder = useCancelOrder();
  const navigate = useNavigate();
  const [openChangePM, setOpenChangePM] = useState(false);
  const [openEditShip, setOpenEditShip] = useState(false);
  const retryPay = useRetryVnpayPayment({ autoRedirect: true });
  const changePM = useChangePaymentMethod({ autoRedirect: true });
  const updateAddr = useUpdateShippingAddress();

  // Preload provinces data to avoid modal timing issues
  const { data: provincesData } = useProvinces();
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

        {/* Refund Notification for Cancelled Orders */}
        {o.status === "cancelled" && pay.payment_status === "refunded" && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Đã hoàn tiền
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>Số tiền {formatPrice(o.final_amount)} đã được hoàn lại vào tài khoản của bạn.</p>
                  <p className="mt-1">Thời gian xử lý hoàn tiền có thể mất 3-5 ngày làm việc tùy thuộc vào ngân hàng.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Countdown for AWAITING_PAYMENT */}
        {o.status === "AWAITING_PAYMENT" && o.reserve_expires_at && (
          <PaymentCountdown
            expiresAt={o.reserve_expires_at}
            onExpired={() => {
              // Optional: could trigger a refetch or show a message
            }}
          />
        )}

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

              {/* Thanh toán Status */}
              {(() => {
                // Đã thanh toán (VNPAY completed)
                if (pay?.provider === "VNPAY" && pay?.payment_status === "completed") {
                  return (
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
                  );
                }

                // Đang chờ thanh toán (AWAITING_PAYMENT + VNPAY pending)
                if (o.status === "AWAITING_PAYMENT" && pay?.provider === "VNPAY" && pay?.payment_status === "pending") {
                  return (
                    <div className="relative flex items-start gap-4">
                      <div className="relative z-10 flex items-center justify-center w-8 h-8 bg-yellow-500 rounded-full text-white text-sm font-bold">
                        ⏳
                      </div>
                      <div className="flex-1 pt-1">
                        <div className="font-semibold text-gray-900">Đang chờ thanh toán</div>
                        <div className="text-sm text-gray-500">
                          Chờ khách hàng thanh toán qua VNPAY
                        </div>
                      </div>
                    </div>
                  );
                }

                // Thanh toán thất bại
                if (pay?.payment_status === "failed") {
                  return (
                    <div className="relative flex items-start gap-4">
                      <div className="relative z-10 flex items-center justify-center w-8 h-8 bg-red-500 rounded-full text-white text-sm font-bold">
                        ✗
                      </div>
                      <div className="flex-1 pt-1">
                        <div className="font-semibold text-gray-900">Thanh toán thất bại</div>
                        <div className="text-sm text-gray-500">
                          Thanh toán không thành công
                        </div>
                      </div>
                    </div>
                  );
                }

                return null;
              })()}

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

              {/* Đã hoàn tiền */}
              {o.status === "cancelled" && pay.payment_status === "refunded" && (
                <div className="relative flex items-start gap-4">
                  <div className="relative z-10 flex items-center justify-center w-8 h-8 bg-green-500 rounded-full text-white text-sm font-bold">
                    💰
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="font-semibold text-gray-900 text-green-700">
                      Đã hoàn tiền
                    </div>
                    <div className="text-sm text-gray-500">
                      Số tiền {formatPrice(o.final_amount)} đã được hoàn lại
                      <div className="mt-1 text-green-600 text-xs">
                        Thời gian xử lý: 3-5 ngày làm việc
                      </div>
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
                {/* Chỉ cho phép sửa địa chỉ khi chưa thanh toán VNPAY */}
                {!["shipping", "delivered", "cancelled"].includes(o.status) &&
                 !(pay?.provider === "VNPAY" && pay?.payment_status === "completed") && (
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
                {/* Chỉ cho phép đổi từ COD sang VNPAY */}
                {!["shipping", "delivered", "cancelled"].includes(o.status) &&
                 pay?.provider === "COD" &&
                 (o.status === "AWAITING_PAYMENT" || o.status === "processing") && (
                    <button
                      onClick={() => setOpenChangePM(true)}
                      className="text-sm px-2 py-1 border rounded hover:bg-gray-50"
                    >
                      Đổi sang VNPAY
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
                  <b>Trạng thái:</b> {
                    pay.payment_status === "refunded" ? "Đã hoàn tiền" :
                    pay.payment_status === "completed" ? "Đã thanh toán" :
                    pay.payment_status === "pending" ? "Chờ thanh toán" :
                    pay.payment_status === "failed" ? "Thanh toán thất bại" :
                    pay.payment_status || "-"
                  }
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
          currentShippingFee={o.shipping_fee}
          provincesData={provincesData}
          subtotal={o.final_amount - o.shipping_fee} // subtotal sau discount = final_amount - shipping_fee
          disabled={updateAddr.isPending}
          onSubmit={(payload) => {
            updateAddr.mutate(
              { orderId: o.order_id, payload },
              {
                onSuccess: (data) => {
                  console.log('Update shipping address success:', data);
                  setOpenEditShip(false);

                  // Update cache immediately with new data
                  if (data?.order) {
                    queryClient.setQueryData(["order", o.order_id], (oldData) => ({
                      ...oldData,
                      order: {
                        ...oldData?.order,
                        ...data.order
                      }
                    }));
                  }

                  // Invalidate để đảm bảo consistency
                  queryClient.invalidateQueries({ queryKey: ["order", o.order_id] });
                  queryClient.invalidateQueries({ queryKey: ["orders"] });

                  // Force page reload để đảm bảo UI update
                  setTimeout(() => window.location.reload(), 500);
                },
                onError: (err) => {
                  console.error('Update shipping address error:', err);
                  alert(
                    err?.response?.data?.message ||
                      "Cập nhật địa chỉ thất bại. Vui lòng thử lại hoặc liên hệ hỗ trợ."
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
