"use client"

import { useSelector, useDispatch } from "react-redux"
import { Link, useNavigate } from "react-router-dom"
import { removeItem, updateQuantity, clearCart } from "../store/slices/cartSlice"
import { Trash2, Plus, Minus, ShoppingBag } from "lucide-react"
import { formatPrice } from "../utils/formatters"

export default function CartPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { items } = useSelector((state) => state.cart)
  const { isAuthenticated } = useSelector((state) => state.auth)

  const handleUpdateQuantity = (itemId, newQuantity) => {
    if (newQuantity < 1) return
    dispatch(updateQuantity({ itemId, quantity: newQuantity }))
  }

  const handleRemoveItem = (itemId) => {
    dispatch(removeItem(itemId))
  }

  const handleClearCart = () => {
    if (window.confirm("Bạn có chắc muốn xóa tất cả sản phẩm trong giỏ hàng?")) {
      dispatch(clearCart())
    }
  }

  const handleCheckout = () => {
    if (!isAuthenticated) {
      navigate("/login?redirect=/checkout")
    } else {
      navigate("/checkout")
    }
  }

  const subtotal = items.reduce((total, item) => {
    const price = item.product?.variation?.price || 0
    const discount = item.product?.variation?.discount_percentage || 0
    const finalPrice = price * (1 - discount / 100)
    return total + finalPrice * item.quantity
  }, 0)

  const shipping = subtotal > 0 ? 30000 : 0
  const total = subtotal + shipping

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-20">
          <ShoppingBag className="w-24 h-24 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Giỏ hàng trống</h2>
          <p className="text-gray-600 mb-6">Bạn chưa có sản phẩm nào trong giỏ hàng</p>
          <Link to="/" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Tiếp tục mua sắm
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Giỏ hàng</h1>
          <button onClick={handleClearCart} className="text-red-600 hover:text-red-700 text-sm">
            Xóa tất cả
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm">
              {items.map((item) => {
                const variation = item.product?.variation
                const price = variation?.price || 0
                const discount = variation?.discount_percentage || 0
                const finalPrice = price * (1 - discount / 100)
                const imageUrl = item.product?.images?.[0]?.image_url || "/modern-laptop-workspace.png"

                return (
                  <div key={item.id} className="flex gap-4 p-4 border-b border-gray-200 last:border-b-0">
                    <Link to={`/products/${item.product_id}`} className="flex-shrink-0">
                      <img
                        src={imageUrl || "/placeholder.svg"}
                        alt={item.product?.name}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                    </Link>

                    <div className="flex-1">
                      <Link
                        to={`/products/${item.product_id}`}
                        className="font-semibold text-gray-900 hover:text-blue-600 line-clamp-2"
                      >
                        {item.product?.name}
                      </Link>

                      {variation && (
                        <p className="text-sm text-gray-600 mt-1">
                          {variation.processor} / {variation.ram} / {variation.storage}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-12 text-center font-medium">{item.quantity}</span>
                          <button
                            onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="text-right">
                          <div className="font-bold text-blue-600">{formatPrice(finalPrice * item.quantity)}</div>
                          {discount > 0 && (
                            <div className="text-sm text-gray-400 line-through">
                              {formatPrice(price * item.quantity)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="flex-shrink-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-20">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Tổng đơn hàng</h2>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-gray-600">
                  <span>Tạm tính</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Phí vận chuyển</span>
                  <span>{formatPrice(shipping)}</span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex justify-between text-lg font-bold text-gray-900">
                  <span>Tổng cộng</span>
                  <span className="text-blue-600">{formatPrice(total)}</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold"
              >
                Thanh toán
              </button>

              <Link to="/" className="block text-center text-blue-600 hover:text-blue-700 mt-4">
                Tiếp tục mua sắm
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
