"use client";

import { useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, Minus, Plus, Trash2 } from "lucide-react";

import { useGetCart, useUpdateCartItem, useRemoveFromCart } from "../hooks/useCart";
import { setCart } from "../store/slices/cartSlice"; // dùng khi clearCart từ server trả về
import api from "../services/api";
import { formatPrice } from "../utils/formatters"; // đảm bảo có util này

export default function CartPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items } = useSelector((state) => state.cart);
  const { isAuthenticated } = useSelector((state) => state.auth);

  // ---- CALL ALL HOOKS UNCONDITIONALLY (trước mọi return) ----
  const { data: serverCart } = useGetCart(); // sẽ tự setCart trong onSuccess của hook
  const updateItem = useUpdateCartItem();
  const removeItemSrv = useRemoveFromCart();

  // --- Trạng thái tick chọn ---
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const isAllSelected = useMemo(() => {
    return items.length > 0 && selectedIds.size === items.length;
  }, [items.length, selectedIds]);

  const selectedItems = useMemo(() => {
    if (selectedIds.size === 0) return [];
    return items.filter((it) => selectedIds.has(it.id));
  }, [items, selectedIds]);

  const handleToggleItem = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleAll = () => {
    setSelectedIds((prev) => {
      if (isAllSelected) return new Set();
      return new Set(items.map((i) => i.id));
    });
  };

  // --- Cập nhật số lượng / xoá ---
  const handleUpdateQuantity = (id, newQuantity) => {
    if (newQuantity <= 0) {
      handleRemoveItem(id);
      return;
    }
    updateItem.mutate({ itemId: id, quantity: newQuantity });
  };

  const handleRemoveItem = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    removeItemSrv.mutate(id);
  };

  // --- Xoá toàn bộ (gọi BE) ---
  const handleClearCart = async () => {
    if (!window.confirm("Bạn có chắc muốn xóa tất cả sản phẩm trong giỏ hàng?")) return;
    try {
      const { data } = await api.delete("/cart"); // BE trả về giỏ rỗng
      dispatch(setCart(data.cart));               // đồng bộ lại Redux từ server
      setSelectedIds(new Set());
    } catch (e) {
      console.error(e);
      alert("Không xoá được giỏ hàng. Vui lòng thử lại.");
    }
  };

  // --- Tính tổng chỉ dựa trên item đã tick ---
  const subtotal = selectedItems.reduce((total, item) => {
    const unit = Number(item.price || 0); // price đã là sau giảm
    return total + unit * item.quantity;
  }, 0);

  const shipping = subtotal > 0 ? 30000 : 0;
  const total = subtotal + shipping;

  // --- Thanh toán chỉ khi có tick ---
  const canCheckout = selectedItems.length > 0;

  const handleCheckout = () => {
    if (!canCheckout) return;
    const itemsPayload = selectedItems.map((it) => ({
      variation_id: it.variation_id,
      quantity: it.quantity,
    }));

    if (!isAuthenticated) {
      navigate("/login?redirect=/checkout");
      return;
    }

    navigate("/checkout", {
      state: {
        mode: "cart",
        items: itemsPayload,
      },
    });
  };

  // ---- UI ----
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
    );
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
          {/* Danh sách items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm">
              {/* Hàng chọn tất cả */}
              <div className="flex items-center gap-3 p-4 border-b border-gray-200">
                <input
                  id="select-all"
                  type="checkbox"
                  className="w-4 h-4"
                  checked={isAllSelected}
                  onChange={handleToggleAll}
                />
                <label htmlFor="select-all" className="text-sm text-gray-700 cursor-pointer">
                  Chọn tất cả ({selectedIds.size}/{items.length})
                </label>
              </div>

              {items.map((item) => {
                // Lấy tồn kho an toàn theo nhiều cấu trúc
                const stockQuantity = Number(
                  item?.variation?.stock_quantity ??
                  item?.product?.variation?.stock_quantity ??
                  0
                );

                const unitPrice = Number(item.price || 0); // đã discount
                const imageUrl =
                  item.product?.images?.[0]?.image_url ||
                  item.product?.thumbnail_url ||
                  "/placeholder.svg";

                const isMaxQuantity = stockQuantity > 0 && item.quantity >= stockQuantity;
                const checked = selectedIds.has(item.id);

                return (
                  <div key={item.id} className="flex gap-4 p-4 border-b border-gray-200 last:border-b-0">
                    {/* Checkbox từng item */}
                    <div className="pt-1">
                      <input
                        type="checkbox"
                        className="w-4 h-4 mt-2"
                        checked={checked}
                        onChange={() => handleToggleItem(item.id)}
                      />
                    </div>

                    <Link to={`/products/${item.product_id}`} className="flex-shrink-0">
                      <img
                        src={imageUrl}
                        alt={item.product?.product_name}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                    </Link>

                    <div className="flex-1">
                      <Link
                        to={`/products/${item.product_id}`}
                        className="font-semibold text-gray-900 hover:text-blue-600 line-clamp-2"
                      >
                        {item.product?.product_name}
                      </Link>

                      {/* Thông tin biến thể (nếu có) */}
                      {item.variation && (
                        <p className="text-sm text-gray-600 mt-1">
                          {[
                            item.variation.processor,
                            item.variation.ram,
                            item.variation.storage,
                          ].filter(Boolean).join(" / ")}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
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
                              disabled={isMaxQuantity}
                              className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          {isMaxQuantity && stockQuantity > 0 && (
                            <p className="text-xs text-red-500 font-medium">
                              Chỉ còn {stockQuantity} sản phẩm trong kho.
                            </p>
                          )}
                          {stockQuantity === 0 && (
                            <p className="text-xs text-red-500 font-medium">Đã hết hàng.</p>
                          )}
                        </div>

                        <div className="text-right">
                          <div className="font-bold text-blue-600">
                            {formatPrice(unitPrice * item.quantity)}
                          </div>
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
                );
              })}
            </div>
          </div>

          {/* Tổng kết & Checkout */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-20">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Tổng đơn hàng</h2>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-gray-600">
                  <span>Tạm tính ({selectedItems.length} món đã chọn)</span>
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
                disabled={!canCheckout}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                title={!canCheckout ? "Hãy tick chọn ít nhất 1 sản phẩm để thanh toán" : ""}
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
  );
}
