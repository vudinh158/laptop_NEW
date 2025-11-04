"use client";

import { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, Minus, Plus, Trash2 } from "lucide-react";

import {
  useGetCart,
  useUpdateCartItem,
  useRemoveFromCart,
} from "../hooks/useCart";
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
    return items.filter((it) => selectedIds.has(it.cart_item_id));
  }, [items, selectedIds]);

  useEffect(() => {
    if (items?.length) {
      setSelectedIds(new Set(items.map((i) => i.cart_item_id)));
    } else {
      setSelectedIds(new Set());
    }
  }, [items]);

  const handleToggleItem = (cartItemId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(cartItemId)) next.delete(cartItemId);
      else next.add(cartItemId);
      return next;
    });
  };

  const handleToggleAll = () => {
    setSelectedIds((prev) => {
      if (isAllSelected) return new Set();
      return new Set(items.map((i) => i.cart_item_id));
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
    if (!window.confirm("Bạn có chắc muốn xóa tất cả sản phẩm trong giỏ hàng?"))
      return;
    try {
      const { data } = await api.delete("/cart"); // BE trả về giỏ rỗng
      dispatch(setCart(data.cart)); // đồng bộ lại Redux từ server
      setSelectedIds(new Set());
    } catch (e) {
      console.error(e);
      alert("Không xoá được giỏ hàng. Vui lòng thử lại.");
    }
  };

  // --- Tính tổng chỉ dựa trên item đã tick ---
  const subtotal = selectedItems.reduce(
    (s, it) => s + Number(it.price ?? 0) * Number(it.quantity ?? 0),
    0
  );

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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Giỏ hàng trống
          </h2>
          <p className="text-gray-600 mb-6">
            Bạn chưa có sản phẩm nào trong giỏ hàng
          </p>
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Tiếp tục mua sắm
          </Link>
        </div>
      </div>
    );
  }

  const getPriceParts = (item) => {
    const raw = Number(
      item?.product?.variation?.price ?? item?.unit_price_before_discount ?? 0
    );
    const discountPct = Number(
      item?.product?.discount_percentage ?? item?.discount_percentage ?? 0
    );
    const finalUnit = Number(
      item?.price ??
        item?.unit_price_after_discount ??
        Math.max(0, raw * (1 - discountPct / 100))
    );
    return { raw, discountPct, finalUnit };
  };

  // ✅ Validate từng item đã được tick
  const selectedChecks = selectedItems.map((it) => {
    const stockQty = Number(
      it?.variation?.stock_quantity ??
        it?.product?.variation?.stock_quantity ??
        0
    );
    const isAvailable = it?.variation?.is_available !== false && stockQty > 0;

    return {
      id: it.cart_item_id,
      name: it?.product?.product_name,
      stockQty,
      isAvailable,
      enoughStock: Number(it.quantity) <= stockQty,
      item: it,
    };
  });

  // Nếu có 1 item tick bị lỗi (hết hàng hoặc thiếu tồn), không cho checkout
  const hasInvalidSelected = selectedChecks.some(
    (c) => !c.isAvailable || !c.enoughStock
  );

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Giỏ hàng</h1>
          <button
            onClick={handleClearCart}
            className="text-red-600 hover:text-red-700 text-sm"
          >
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
                <label
                  htmlFor="select-all"
                  className="text-sm text-gray-700 cursor-pointer"
                >
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
                const unitPrice = Number(
                  item.price ?? item.unit_price_after_discount ?? 0
                );
                const imageUrl =
                  item.product?.thumbnail_url || "/placeholder.svg";

                const isAvailable =
                  item?.variation?.is_available !== false && stockQuantity > 0;
                const isMaxQuantity =
                  stockQuantity > 0 && item.quantity >= stockQuantity;
                const checked = selectedIds.has(item.cart_item_id);

                return (
                  <div
                    key={item.cart_item_id}
                    className="flex gap-4 p-4 border-b border-gray-200 last:border-b-0"
                  >
                    {/* Checkbox từng item */}
                    <div className="pt-1">
                      <input
                        type="checkbox"
                        className="w-4 h-4 mt-2"
                        checked={checked}
                        onChange={() => handleToggleItem(item.cart_item_id)}
                      />
                    </div>

                    <Link
                      to={`/products/${item.product?.product_id}`}
                      className="flex-shrink-0"
                    >
                      <img
                        src={imageUrl}
                        alt={item.product?.product_name}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                    </Link>

                    <div className="flex-1">
                      <Link
                        to={`/products/${item.product?.product_id}`}
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
                          ]
                            .filter(Boolean)
                            .join(" / ")}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                handleUpdateQuantity(
                                  item.cart_item_id,
                                  item.quantity - 1
                                )
                              }
                              className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50"
                            >
                              <Minus className="w-4 h-4" />
                            </button>

                            <span className="w-12 text-center font-medium">
                              {item.quantity}
                            </span>

                            <button
                              onClick={() =>
                                handleUpdateQuantity(
                                  item.cart_item_id,
                                  item.quantity + 1
                                )
                              }
                              disabled={isMaxQuantity}
                              className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          {!isAvailable ? (
                            <p className="text-xs text-red-500 font-medium">
                              Đã hết sản phẩm.
                            </p>
                          ) : isMaxQuantity && stockQuantity > 0 ? (
                            <p className="text-xs text-red-500 font-medium">
                              Chỉ còn {stockQuantity} sản phẩm trong kho.
                            </p>
                          ) : null}
                          {stockQuantity === 0 && (
                            <p className="text-xs text-red-500 font-medium">
                              Đã hết hàng.
                            </p>
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
                      onClick={() => handleRemoveItem(item.cart_item_id)}
                      className="flex-shrink-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    {/* <div className="text-right">
                      <div className="font-bold text-blue-600">
                        {formatPrice(
                          item.unit_price_after_discount * item.quantity
                        )}
                      </div>
                      {Number(item.discount_percentage) > 0 && (
                        <div className="text-xs text-gray-500 line-through">
                          {formatPrice(
                            (item.unit_price_before_discount || 0) *
                              item.quantity
                          )}
                        </div>
                      )}
                    </div> */}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tổng kết & Checkout */}
          {/* Tổng kết & Checkout */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-20">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Tổng đơn hàng
              </h2>

              {/* ⚠️ Cảnh báo tổng nếu có item không hợp lệ */}
              {hasInvalidSelected && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  Một hoặc nhiều sản phẩm bạn chọn không thể đặt hàng:
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    {selectedChecks.map((c) => {
                      if (c.isAvailable && c.enoughStock) return null;
                      return (
                        <li key={c.id}>
                          <span className="font-medium">{c.name}</span>{" "}
                          {!c.isAvailable ? (
                            <span className="text-red-600">
                              — Đã hết sản phẩm
                            </span>
                          ) : !c.enoughStock ? (
                            <span className="text-red-600">
                              — Vượt tồn kho, chỉ còn {c.stockQty} sản phẩm
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Danh sách item đã tick + giá chi tiết */}
              <div className="space-y-4 mb-4">
                {selectedItems.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Chưa chọn sản phẩm nào.
                  </p>
                ) : (
                  selectedItems.map((it) => {
                    const { raw, discountPct, finalUnit } = getPriceParts(it);
                    const stockQty = Number(
                      it?.variation?.stock_quantity ??
                        it?.product?.variation?.stock_quantity ??
                        0
                    );
                    const isAvailable =
                      it?.variation?.is_available !== false && stockQty > 0;
                    const enoughStock = Number(it.quantity) <= stockQty;

                    return (
                      <div
                        key={it.cart_item_id}
                        className="border-b last:border-b-0 pb-3"
                      >
                        <div className="flex justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 line-clamp-1">
                              {it?.product?.product_name}
                            </div>
                            {/* cấu hình biến thể */}
                            {it?.variation && (
                              <div className="text-xs text-gray-600 mt-0.5">
                                {[
                                  it.variation.processor,
                                  it.variation.ram,
                                  it.variation.storage,
                                ]
                                  .filter(Boolean)
                                  .join(" / ")}
                              </div>
                            )}
                            {/* cảnh báo riêng từng item */}
                            {!isAvailable ? (
                              <div className="text-xs mt-1 text-red-600">
                                Đã hết sản phẩm
                              </div>
                            ) : !enoughStock ? (
                              <div className="text-xs mt-1 text-red-600">
                                Chỉ còn {stockQty} sản phẩm
                              </div>
                            ) : null}
                          </div>

                          {/* giá từng đơn vị */}
                          <div className="text-right shrink-0">
                            {discountPct > 0 ? (
                              <div className="text-xs text-gray-500 line-through">
                                {formatPrice(raw)}
                              </div>
                            ) : null}
                            <div className="font-semibold">
                              {formatPrice(finalUnit)}
                            </div>
                            {discountPct > 0 && (
                              <div className="text-xs text-emerald-600">
                                -{discountPct}%
                              </div>
                            )}
                          </div>
                        </div>

                        {/* dòng số lượng x thành tiền cho item */}
                        <div className="flex justify-between text-sm mt-2 text-gray-700">
                          <span>Số lượng: {it.quantity}</span>
                          <span className="font-medium">
                            {formatPrice(finalUnit * Number(it.quantity))}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Tổng cộng các món đã tick */}
              <div className="border-t border-gray-200 pt-3 mb-4 flex justify-between text-base font-bold text-gray-900">
                <span>Tổng tiền</span>
                <span className="text-blue-600">{formatPrice(subtotal)}</span>
              </div>

              <button
                onClick={handleCheckout}
                disabled={!canCheckout || hasInvalidSelected}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                title={
                  !canCheckout
                    ? "Hãy tick chọn ít nhất 1 sản phẩm để thanh toán"
                    : hasInvalidSelected
                    ? "Có sản phẩm hết hàng hoặc vượt tồn kho — hãy điều chỉnh trước khi thanh toán"
                    : ""
                }
              >
                Thanh toán
              </button>

              <Link
                to="/"
                className="block text-center text-blue-600 hover:text-blue-700 mt-4"
              >
                Tiếp tục mua sắm
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
