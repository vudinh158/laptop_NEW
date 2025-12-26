import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminOrders, useAdminOrderDetail, useUpdateOrderStatus, useShipOrder, useDeliverOrder, useRefundOrder } from "../../hooks/useOrders";
import LoadingSpinner from "../../components/LoadingSpinner";
import { formatPrice } from "../../utils/formatters";
import { Eye, ArrowLeft, ArrowUp, ArrowDown } from "lucide-react";

// AdminOrderDetail Component
function AdminOrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, error } = useAdminOrderDetail(orderId);
  const updateStatus = useUpdateOrderStatus();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 py-10 text-center">
        Không tải được chi tiết đơn hàng
      </div>
    );
  }

  const order = data?.order;
  if (!order) {
    return (
      <div className="text-gray-600 py-10 text-center">
        Đơn hàng không tồn tại
      </div>
    );
  }

  const handleStatusChange = (newStatus) => {
    if (window.confirm(`Bạn có chắc muốn thay đổi trạng thái đơn hàng thành "${newStatus}"?`)) {
      updateStatus.mutate({ orderId: order.order_id, status: newStatus });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate("/admin/orders")}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Quay lại
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Đơn hàng #{order.order_id}
            </h1>
            <p className="text-sm text-gray-600">
              Đặt ngày {new Date(order.created_at).toLocaleDateString("vi-VN")}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={order.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={updateStatus.isPending}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="AWAITING_PAYMENT">Chờ thanh toán</option>
            <option value="processing">Chờ giao hàng</option>
            <option value="shipping">Đang giao hàng</option>
            <option value="delivered">Hoàn thành</option>
            <option value="cancelled">Đã hủy</option>
            <option value="FAILED">Thanh toán thất bại</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin khách hàng</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Họ tên</p>
                <p className="font-medium">{order.user?.full_name || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium">{order.user?.email || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Số điện thoại</p>
                <p className="font-medium">{order.user?.phone_number || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Username</p>
                <p className="font-medium">{order.user?.username || "—"}</p>
              </div>
            </div>
          </div>

          {/* Shipping Info */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin giao hàng</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Người nhận</p>
                <p className="font-medium">{order.shipping_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Số điện thoại</p>
                <p className="font-medium">{order.shipping_phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Địa chỉ</p>
                <p className="font-medium">{order.shipping_address}</p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Chi tiết sản phẩm</h3>
            <div className="space-y-4">
              {order.items?.map((item) => (
                <div key={item.order_item_id} className="flex items-center space-x-4 py-4 border-b border-gray-100 last:border-b-0">
                  <img
                    src={item.variation?.product?.thumbnail_url || "/placeholder.jpg"}
                    alt={item.variation?.product?.product_name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {item.variation?.product?.product_name}
                    </h4>
                    <p className="text-sm text-gray-600">
                      SL: {item.quantity} × {formatPrice(item.price)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {formatPrice(item.quantity * item.price)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Payment & Summary */}
        <div className="space-y-6">
          {/* Payment Info */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin thanh toán</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Phương thức</span>
                <span className="font-medium">{order.payment?.payment_method || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Provider</span>
                <span className="font-medium">{order.payment?.provider || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Trạng thái</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  order.payment?.payment_status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : order.payment?.payment_status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {order.payment?.payment_status || "—"}
                </span>
              </div>
              {order.payment?.transaction_id && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Transaction ID</span>
                  <span className="font-medium text-sm">{order.payment.transaction_id}</span>
                </div>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tóm tắt đơn hàng</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Tạm tính</span>
                <span>{formatPrice(order.total_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Phí giao hàng</span>
                <span>{formatPrice(order.shipping_fee)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Giảm giá</span>
                <span>-{formatPrice(order.discount_amount || 0)}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Tổng cộng</span>
                  <span className="text-blue-600">{formatPrice(order.final_amount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.note && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ghi chú</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{order.note}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main AdminOrders Component
export default function AdminOrders() {
  const { orderId } = useParams();

  // Show Order Detail if orderId exists
  if (orderId) {
    return <AdminOrderDetail />;
  }

  // Show Orders List
  const ORDER_STATUS_TABS = [
    { key: 'all', label: 'Tất cả', status: null },
    { key: 'awaiting_payment', label: 'Chờ thanh toán', status: 'AWAITING_PAYMENT' },
    { key: 'processing', label: 'Chờ giao hàng', status: 'processing' },
    { key: 'shipping', label: 'Đang giao hàng', status: 'shipping' },
    { key: 'delivered', label: 'Hoàn thành', status: 'delivered' },
    { key: 'cancelled', label: 'Đã hủy', status: 'cancelled' },
    { key: 'failed', label: 'Thanh toán thất bại', status: 'FAILED' },
  ];

  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState('all');
  const [showStatusFilter, setShowStatusFilter] = useState(false); // for status filter dropdown
  const [statusFilters, setStatusFilters] = useState([]); // for status filters
  const [sortBy, setSortBy] = useState('created_at'); // for sorting
  const [sortOrder, setSortOrder] = useState('DESC'); // for sorting
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useAdminOrders({
    page,
    limit: 20,
    status: activeTab === 'all' ? undefined : ORDER_STATUS_TABS.find(tab => tab.key === activeTab)?.status,
    sortBy,
    sortOrder
  });
  const shipOrder = useShipOrder();
  const deliverOrder = useDeliverOrder();
  const refundOrder = useRefundOrder();

  useEffect(() => {
    refetch();
  }, [refetch, activeTab, page, sortBy, sortOrder]);

  const orders = data?.orders || [];


  const handleViewOrder = (orderId) => {
    navigate(`/admin/orders/${orderId}`);
  };

  const handleShipOrder = (orderId) => {
    if (window.confirm('Bạn có chắc muốn xác nhận đã giao hàng cho đơn hàng này?')) {
      shipOrder.mutate({ orderId });
    }
  };

  const handleDeliverOrder = (orderId) => {
    if (window.confirm('Bạn có chắc muốn xác nhận khách hàng đã nhận được hàng?')) {
      deliverOrder.mutate({ orderId });
    }
  };

  const handleRefundOrder = (orderId) => {
    if (window.confirm('Bạn có chắc muốn xác nhận đã hoàn tiền cho đơn hàng này?')) {
      refundOrder.mutate({ orderId });
    }
  };

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setPage(1); // Reset to first page when changing tabs
    setStatusFilters([]); // Reset status filters
    setShowStatusFilter(false); // Close status filter dropdown
    // Invalidate admin orders cache to force refetch
    queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
  };

  const handleStatusFilterChange = (status, checked) => {
    if (checked) {
      setStatusFilters(prev => [...prev, status]);
    } else {
      setStatusFilters(prev => prev.filter(s => s !== status));
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(field);
      setSortOrder('DESC');
    }
  };

  const renderActionButtons = (order) => {
    const buttons = [];

    // Always show view button for all tabs
    buttons.push(
      <button
        key="view"
        onClick={() => handleViewOrder(order.order_id)}
        className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <Eye className="w-4 h-4 mr-1" />
        Xem
      </button>
    );

    switch (activeTab) {
      case 'processing':
        // Chờ giao hàng: Xác nhận đã giao hàng
        buttons.push(
          <button
            key="ship"
            onClick={() => handleShipOrder(order.order_id)}
            className="inline-flex items-center px-3 py-1 ml-2 border border-blue-500 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            🚚 Giao hàng
          </button>
        );
        break;

      case 'shipping':
        // Đang giao hàng: Xác nhận đã giao hàng (có thể user nhầm, tôi làm "đã nhận được hàng")
        buttons.push(
          <button
            key="deliver"
            onClick={() => handleDeliverOrder(order.order_id)}
            className="inline-flex items-center px-3 py-1 ml-2 border border-green-500 rounded-md text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            ✅ Đã nhận
          </button>
        );
        break;

      case 'cancelled':
        // Đã hủy: Nếu VNPAY thì có nút xác nhận hoàn tiền
        if (order.payment?.provider === 'VNPAY') {
          if (order.payment?.payment_status === 'refunded') {
            // Đã hoàn tiền - hiển thị text và disable
            buttons.push(
              <span
                key="refunded"
                className="inline-flex items-center px-3 py-1 ml-2 text-sm font-medium text-green-700"
              >
                ✅ Đã hoàn tiền
              </span>
            );
          } else {
            // Chưa hoàn tiền - hiển thị nút
            buttons.push(
              <button
                key="refund"
                onClick={() => handleRefundOrder(order.order_id)}
                className="inline-flex items-center px-3 py-1 ml-2 border border-orange-500 rounded-md text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                💰 Hoàn tiền
              </button>
            );
          }
        }
        break;

      default:
        // awaiting_payment, delivered, failed: chỉ xem chi tiết (đã có ở trên)
        break;
    }

    return buttons;
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý đơn hàng</h1>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {ORDER_STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Status Filter Dropdown */}
        {showStatusFilter && (activeTab === 'all' || activeTab === 'cancelled') && (
          <div className="relative mb-4">
            <div className="absolute z-10 bg-white border border-gray-300 rounded-md shadow-lg p-4 min-w-48">
              <div className="space-y-2">
                {activeTab === 'all' ? (
                  // Filter for all tab
                  <>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={statusFilters.includes('AWAITING_PAYMENT')}
                        onChange={(e) => handleStatusFilterChange('AWAITING_PAYMENT', e.target.checked)}
                        className="mr-2"
                      />
                      Chờ thanh toán
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={statusFilters.includes('processing')}
                        onChange={(e) => handleStatusFilterChange('processing', e.target.checked)}
                        className="mr-2"
                      />
                      Chờ giao hàng
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={statusFilters.includes('shipping')}
                        onChange={(e) => handleStatusFilterChange('shipping', e.target.checked)}
                        className="mr-2"
                      />
                      Đang giao hàng
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={statusFilters.includes('delivered')}
                        onChange={(e) => handleStatusFilterChange('delivered', e.target.checked)}
                        className="mr-2"
                      />
                      Hoàn thành
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={statusFilters.includes('cancelled')}
                        onChange={(e) => handleStatusFilterChange('cancelled', e.target.checked)}
                        className="mr-2"
                      />
                      Đã hủy
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={statusFilters.includes('FAILED')}
                        onChange={(e) => handleStatusFilterChange('FAILED', e.target.checked)}
                        className="mr-2"
                      />
                      Thanh toán thất bại
                    </label>
                  </>
                ) : (
                  // Filter for cancelled tab
                  <>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={statusFilters.includes('cancelled_not_refunded')}
                        onChange={(e) => handleStatusFilterChange('cancelled_not_refunded', e.target.checked)}
                        className="mr-2"
                      />
                      Đã hủy (chưa hoàn tiền)
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={statusFilters.includes('cancelled_refunded')}
                        onChange={(e) => handleStatusFilterChange('cancelled_refunded', e.target.checked)}
                        className="mr-2"
                      />
                      Đã hủy (đã hoàn tiền)
                    </label>
                  </>
                )}
              </div>
              <div className="flex justify-end mt-4 space-x-2">
                <button
                  onClick={() => {
                    setStatusFilters([]);
                    setShowStatusFilter(false);
                  }}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                >
                  Xóa bộ lọc
                </button>
                <button
                  onClick={() => setShowStatusFilter(false)}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Áp dụng
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
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
                  <div className="flex items-center space-x-1">
                    <span>Trạng thái</span>
                    {(activeTab === 'all' || activeTab === 'cancelled') && (
                      <button
                        onClick={() => setShowStatusFilter(!showStatusFilter)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  <div className="flex items-center space-x-1">
                    <span>Ngày đặt</span>
                    <button
                      onClick={() => handleSort('created_at')}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {sortBy === 'created_at' ? (
                        sortOrder === 'ASC' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                      ) : (
                        <ArrowUp className="w-4 h-4 opacity-50" />
                      )}
                    </button>
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Thao tác
                </th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {(() => {
                // Apply status filters
                let filteredOrders = orders;
                if (statusFilters.length > 0) {
                  if (activeTab === 'all') {
                    filteredOrders = orders.filter(order => statusFilters.includes(order.status));
                  } else if (activeTab === 'cancelled') {
                    filteredOrders = orders.filter(order => {
                      if (statusFilters.includes('cancelled_not_refunded')) {
                        return order.status === 'cancelled' && order.payment?.payment_status !== 'refunded';
                      }
                      if (statusFilters.includes('cancelled_refunded')) {
                        return order.status === 'cancelled' && order.payment?.payment_status === 'refunded';
                      }
                      return false;
                    });
                  }
                }

                return (
                  <>
                    {filteredOrders.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-8 text-center text-gray-500"
                        >
                          Không có đơn hàng
                        </td>
                      </tr>
                    )}

                    {filteredOrders.map((order) => (
                <tr key={order.order_id}>
                  {/* MÃ ĐƠN */}
                  <td className="px-6 py-4 font-medium text-gray-900">
                    #{order.order_id}
                  </td>

                  {/* KHÁCH HÀNG */}
                  <td className="px-6 py-4 text-sm text-gray-700">
                    <div>
                      <div className="font-medium">{order.user?.full_name || "—"}</div>
                      <div className="text-xs text-gray-500">{order.user?.email}</div>
                    </div>
                  </td>

                  {/* TỔNG TIỀN */}
                  <td className="px-6 py-4 text-right font-semibold text-gray-900">
                    {formatPrice(order.final_amount)}
                  </td>

                  {/* TRẠNG THÁI */}
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      order.status === 'AWAITING_PAYMENT' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'shipping' ? 'bg-purple-100 text-purple-800' :
                      order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                      order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      order.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status === 'AWAITING_PAYMENT' ? 'Chờ thanh toán' :
                       order.status === 'processing' ? 'Chờ giao hàng' :
                       order.status === 'shipping' ? 'Đang giao hàng' :
                       order.status === 'delivered' ? 'Hoàn thành' :
                       order.status === 'cancelled' ? 'Đã hủy' :
                       order.status === 'FAILED' ? 'Thanh toán thất bại' :
                       order.status}
                    </span>
                  </td>

                  {/* NGÀY ĐẶT */}
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(order.created_at).toLocaleDateString("vi-VN")}
                  </td>

                  {/* THAO TÁC */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      {renderActionButtons(order)}
                    </div>
                  </td>
                </tr>
              ))}
                  </>
                );
              })()}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8 pb-6">
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
