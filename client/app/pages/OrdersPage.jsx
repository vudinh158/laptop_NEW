import { useOrders } from "../hooks/useOrders"
import LoadingSpinner from "../components/LoadingSpinner"
import { Package, Clock, CheckCircle, XCircle } from "lucide-react"
import { formatPrice } from "../utils/formatters"

export default function OrdersPage() {
  const { data: orders, isLoading, error } = useOrders()

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-500" />
      case "confirmed":
      case "shipping":
        return <Package className="w-5 h-5 text-blue-500" />
      case "delivered":
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case "cancelled":
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <Package className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusText = (status) => {
    const statusMap = {
      pending: "Chờ xác nhận",
      confirmed: "Đã xác nhận",
      shipping: "Đang giao hàng",
      delivered: "Đã giao hàng",
      cancelled: "Đã hủy",
    }
    return statusMap[status] || status
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center text-red-600">Có lỗi xảy ra khi tải đơn hàng</div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Đơn hàng của tôi</h1>

        {orders?.orders?.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">Bạn chưa có đơn hàng nào</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders?.orders?.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(order.status)}
                    <div>
                      <div className="font-semibold text-gray-900">Đơn hàng #{order.id}</div>
                      <div className="text-sm text-gray-600">
                        {new Date(order.created_at).toLocaleDateString("vi-VN")}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Trạng thái</div>
                    <div className="font-semibold text-gray-900">{getStatusText(order.status)}</div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="space-y-3">
                    {order.items?.map((item) => (
                      <div key={item.id} className="flex gap-4">
                        <img
                          src={
                            item.variation?.product?.images?.[0]?.image_url ||
                            "/placeholder.svg?height=80&width=80&query=laptop"
                          }
                          alt={item.variation?.product?.name}
                          className="w-20 h-20 object-cover rounded"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{item.variation?.product?.name}</div>
                          <div className="text-sm text-gray-600">Số lượng: {item.quantity}</div>
                          <div className="text-sm font-semibold text-blue-600">
                            {formatPrice(item.price * item.quantity)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                    <div className="text-gray-600">Tổng cộng:</div>
                    <div className="text-xl font-bold text-blue-600">{formatPrice(order.total_amount)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
