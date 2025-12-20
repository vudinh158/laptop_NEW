// client/app/pages/CheckoutSuccessPage.jsx
"use client";

import { useEffect } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { CheckCircle, Home, Package, Truck } from "lucide-react";

export default function CheckoutSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Nhận dữ liệu từ state được truyền từ CheckoutPage
  const orderData = location.state;

  // Nếu không có dữ liệu, redirect về trang chủ
  useEffect(() => {
    if (!orderData || !orderData.order_code || !orderData.customer_name) {
      navigate("/", { replace: true });
    }
  }, [orderData, navigate]);

  if (!orderData) {
    return null;
  }

  const { order_code, customer_name, payment_provider } = orderData;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {/* Icon thành công */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">✓</span>
              </div>
            </div>
          </div>

          {/* Tiêu đề */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Đặt hàng thành công!
          </h1>

          {/* Thông điệp cảm ơn */}
          <div className="text-gray-600 mb-6">
            <p className="mb-2">
              Cảm ơn <span className="font-semibold text-gray-900">{customer_name}</span> đã tin tưởng
              và lựa chọn sản phẩm của LaptopStore!
            </p>
            <p className="text-sm">
              Đơn hàng của bạn đã được ghi nhận thành công.
            </p>
          </div>

          {/* Thông tin đơn hàng */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Package className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-900">Mã đơn hàng</span>
            </div>
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {order_code}
            </div>
            <div className="text-sm text-blue-700">
              Phương thức thanh toán: {payment_provider === "COD" ? "Thanh toán khi nhận hàng" : "Ví điện tử VNPay"}
            </div>
          </div>

          {/* Thông tin tiếp theo */}
          <div className="text-left bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" />
              Tiếp theo bạn sẽ nhận được:
            </h3>
            <ul className="text-sm text-gray-600 space-y-2">
              {payment_provider === "COD" ? (
                <>
                  <li>• Email xác nhận đơn hàng</li>
                  <li>• Thông báo từ nhân viên khi đơn hàng được chuẩn bị</li>
                  <li>• Cập nhật trạng thái giao hàng qua SMS</li>
                  <li>• Hỗ trợ hotline 1900 XXX XXX</li>
                </>
              ) : (
                <>
                  <li>• Email xác nhận thanh toán thành công</li>
                  <li>• Email xác nhận đơn hàng</li>
                  <li>• Thông báo từ nhân viên khi đơn hàng được chuẩn bị</li>
                  <li>• Cập nhật trạng thái giao hàng qua SMS</li>
                  <li>• Hỗ trợ hotline 1900 XXX XXX</li>
                </>
              )}
            </ul>
          </div>

          {/* Các nút hành động */}
          <div className="space-y-3">
            <Link
              to={`/orders`}
              className="block w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Xem chi tiết đơn hàng
            </Link>

            <Link
              to="/"
              className="block w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              Tiếp tục mua sắm
            </Link>
          </div>

          {/* Thông tin liên hệ */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-2">
              Có vấn đề gì với đơn hàng?
            </p>
            <div className="text-xs text-gray-600">
              <p>Liên hệ hotline: <span className="font-semibold">1900 XXX XXX</span></p>
              <p>Email: <span className="font-semibold">support@laptopstore.vn</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
