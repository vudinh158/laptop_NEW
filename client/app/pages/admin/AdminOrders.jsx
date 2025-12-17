import { useState, useEffect } from "react";
import { useAdminOrders, useUpdateOrderStatus } from "../../hooks/useOrders";
import LoadingSpinner from "../../components/LoadingSpinner";
import { formatPrice } from "../../utils/formatters";

export default function AdminOrders() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useAdminOrders({page, limit: 20});
  const updateStatus = useUpdateOrderStatus();

  useEffect(() => {
    refetch();
  }, [refetch]);

  const orders = data?.orders || [];

  const handleStatusChange = (orderId, status) => {
    if (!orderId) {
      console.error("orderId is undefined");
      return;
    }

    updateStatus.mutate({ orderId, status });
  };

  if (isLoading) {
    return (
      <div className="py-20 flex justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 py-10 text-center">
        Không tải được danh sách đơn hàng
      </div>
    );
  }

  const pagination = data?.pagination || {};
  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <h1 className="text-2xl font-bold mb-6">Quản lý đơn hàng</h1>

      <div className="bg-white rounded border overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Mã đơn
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Khách hàng
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Tổng tiền
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Trạng thái
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Ngày đặt
              </th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {orders.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-8 text-center text-gray-500"
                >
                  Không có đơn hàng
                </td>
              </tr>
            )}

            {orders.map((order) => (
              <tr key={order.order_id}>
                {/* MÃ ĐƠN */}
                <td className="px-6 py-4 font-medium text-gray-900">
                  #{order.order_id}
                </td>

                {/* KHÁCH HÀNG */}
                <td className="px-6 py-4 text-sm text-gray-700">
                  {order.user?.full_name ||
                    order.user?.email ||
                    "—"}
                </td>

                {/* TỔNG TIỀN */}
                <td className="px-6 py-4 text-right font-semibold text-gray-900">
                  {formatPrice(order.final_amount)}
                </td>

                {/* TRẠNG THÁI */}
                <td className="px-6 py-4">
                  <select
                    value={order.status}
                    onChange={(e) =>
                      handleStatusChange(
                        order.order_id,   
                        e.target.value
                      )
                    }
                    disabled={updateStatus.isPending}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    <option value="pending">Chờ xác nhận</option>
                    <option value="confirmed">Đã xác nhận</option>
                    <option value="PAID">Đã thanh toán</option>
                    <option value="processing">Đang xử lý</option>
                    <option value="shipping">Đang giao hàng</option>
                    <option value="delivered">Đã giao hàng</option>
                    <option value="cancelled">Đã hủy</option>
                  </select>
                </td>

                {/* NGÀY ĐẶT */}
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(order.created_at).toLocaleDateString("vi-VN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Trước
            </button>
            {[...Array(pagination.totalPages)].map((_, i) => (
              <button
                key={i + 1}
                onClick={() => setPage(i + 1)}
                className={`px-4 py-2 rounded-lg ${
                  page === i + 1
                    ? "bg-blue-600 text-white"
                    : "border border-gray-300 hover:bg-gray-50"
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sau
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
