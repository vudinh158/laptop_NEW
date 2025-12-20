"use client";

import { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, Minus, Plus, Trash2, X } from "lucide-react";

import {
  useGetCart,
  useAddToCart,
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
  const addToCart = useAddToCart();
  const updateItem = useUpdateCartItem();
  const removeItemSrv = useRemoveFromCart();

  // --- Trạng thái tick chọn ---
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  // Optimistic UI cho số lượng (do updateItem mất 0.5s-1s)
  const [optimisticQty, setOptimisticQty] = useState({}); // { [cart_item_id]: qty }

  // Modal confirm (thay window.confirm) + modal đổi cấu hình
  const [confirmState, setConfirmState] = useState({
    open: false,
    kind: null, // 'clear' | 'remove'
    targetId: null,
  });
  const [variantModal, setVariantModal] = useState({
    open: false,
    item: null,
  });
  const [variantLoading, setVariantLoading] = useState(false);
  const [variantProduct, setVariantProduct] = useState(null); // product detail
  const [variantSel, setVariantSel] = useState({ ram: "", storage: "", color: "" });
  const [variantError, setVariantError] = useState("");

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

  const normalizeImg = (url) => {
    if (!url) return "/placeholder.svg";
    const s = String(url).trim();
    if (!s) return "/placeholder.svg";
    // Normalize relative paths like "uploads/..." -> "/uploads/..."
    if (!/^https?:\/\//i.test(s) && !s.startsWith("/") && !s.startsWith("data:")) return `/${s}`;
    return s;
  };

  const resolveItemImage = (item) => {
    // ưu tiên thumbnail_url từ BE; fallback sang images[0]; fallback placeholder
    const p = item?.product || {};
    const t = p?.thumbnail_url;
    if (t) return normalizeImg(t);
    const imgs = p?.images || [];
    const img0 = Array.isArray(imgs) ? imgs[0]?.image_url || imgs[0]?.url : null;
    return normalizeImg(img0 || "/placeholder.svg");
  };

  // --- Cập nhật số lượng / xoá ---
  const handleUpdateQuantity = (id, newQuantity) => {
    const current = items.find((x) => x.cart_item_id === id);
    const prevQty = Number(optimisticQty[id] ?? current?.quantity ?? 1);

    if (newQuantity <= 0) {
      // thay vì xoá thẳng, mở modal confirm
      setConfirmState({ open: true, kind: "remove", targetId: id });
      return;
    }

    setOptimisticQty((s) => ({ ...s, [id]: newQuantity }));
    updateItem.mutate(
      { itemId: id, quantity: newQuantity },
      {
        onError: () => {
          // revert ngay UI nếu lỗi
          setOptimisticQty((s) => ({ ...s, [id]: prevQty }));
        },
        onSettled: () => {
          // xoá override để Redux/BE làm nguồn sự thật
          setOptimisticQty((s) => {
            const next = { ...s };
            delete next[id];
            return next;
          });
        },
      }
    );
  };

  const doRemoveItem = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    removeItemSrv.mutate(id);
  };

  const handleRemoveItem = (id) => {
    setConfirmState({ open: true, kind: "remove", targetId: id });
  };

  // --- Xoá toàn bộ (gọi BE) ---
  const handleClearCart = async () => {
    setConfirmState({ open: true, kind: "clear", targetId: null });
  };

  const doClearCart = async () => {
    try {
      const { data } = await api.delete("/cart"); // BE trả về giỏ rỗng
      dispatch(setCart(data.cart)); // đồng bộ lại Redux từ server
      setSelectedIds(new Set());
    } catch (e) {
      console.error(e);
      alert("Không xoá được giỏ hàng. Vui lòng thử lại.");
    }
  };

  const closeConfirm = () => setConfirmState({ open: false, kind: null, targetId: null });

  const confirmYes = async () => {
    const { kind, targetId } = confirmState;
    closeConfirm();
    if (kind === "clear") {
      await doClearCart();
      return;
    }
    if (kind === "remove" && targetId) {
      doRemoveItem(targetId);
    }
  };

  const openVariantModal = async (item) => {
    setVariantError("");
    setVariantModal({ open: true, item });
    setVariantProduct(null);
    setVariantLoading(true);
    setVariantSel({ ram: "", storage: "", color: "" });
    try {
      const productId = item?.product?.product_id;
      if (!productId) throw new Error("Thiếu product_id");
      const { data } = await api.get(`/products/${productId}`);
      const p = data?.product;
      setVariantProduct(p || null);

      const currentVarId = item?.variation_id ?? item?.variation?.variation_id;
      const currentVar = (p?.variations || []).find((v) => String(v.variation_id) === String(currentVarId));
      setVariantSel({
        ram: currentVar?.ram || "",
        storage: currentVar?.storage || "",
        color: currentVar?.color || "",
      });
    } catch (e) {
      console.error(e);
      setVariantError("Không tải được danh sách cấu hình. Vui lòng thử lại.");
    } finally {
      setVariantLoading(false);
    }
  };

  const closeVariantModal = () => {
    setVariantModal({ open: false, item: null });
    setVariantProduct(null);
    setVariantLoading(false);
    setVariantSel({ ram: "", storage: "", color: "" });
    setVariantError("");
  };

  const getUnique = (vars, key) => {
    const set = new Set((vars || []).map((v) => v?.[key]).filter(Boolean));
    return [...set];
  };

  const matchVariation = (vars, sel) => {
    const keys = ["ram", "storage", "color"].filter((k) => sel[k]);
    if (!keys.length) return null;
    return (vars || []).find((v) => keys.every((k) => String(v?.[k] || "") === String(sel[k] || ""))) || null;
  };

  const handleApplyVariation = () => {
    const item = variantModal.item;
    const vars = variantProduct?.variations || [];
    const chosen = matchVariation(vars, variantSel);
    if (!chosen) {
      setVariantError("Không tìm thấy cấu hình phù hợp. Hãy chọn lại.");
      return;
    }

    const stock = Number(chosen.stock_quantity || 0);
    if (chosen.is_available === false || stock <= 0) {
      setVariantError("Cấu hình này đã hết hàng.");
      return;
    }

    const oldItemId = item?.cart_item_id;
    const oldVarId = item?.variation_id;
    const qty = Number(item?.quantity ?? 1);
    if (!oldItemId || !chosen.variation_id) return;
    if (String(oldVarId) === String(chosen.variation_id)) {
      closeVariantModal();
      return;
    }

    // Cách an toàn không đụng BE: add variation mới rồi xoá item cũ
    addToCart.mutate(
      { variation_id: chosen.variation_id, quantity: qty },
      {
        onSuccess: () => {
          removeItemSrv.mutate(oldItemId, { onSuccess: () => closeVariantModal() });
        },
        onError: () => {
          setVariantError("Không đổi được cấu hình. Vui lòng thử lại.");
        },
      }
    );
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
                const imageUrl = resolveItemImage(item);

                const isAvailable =
                  item?.variation?.is_available !== false && stockQuantity > 0;
                const isMaxQuantity =
                  stockQuantity > 0 && item.quantity >= stockQuantity;
                const checked = selectedIds.has(item.cart_item_id);
                const shownQty = Number(optimisticQty[item.cart_item_id] ?? item.quantity ?? 1);

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
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg";
                          e.currentTarget.onerror = null;
                        }}
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
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <p className="text-sm text-gray-600">
                            {[
                              item.variation.processor,
                              item.variation.ram,
                              item.variation.storage,
                              item.variation.color,
                            ]
                              .filter(Boolean)
                              .join(" / ")}
                          </p>
                          <button
                            type="button"
                            onClick={() => openVariantModal(item)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:border-blue-300 transition-colors"
                            title="Đổi cấu hình sản phẩm"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Đổi cấu hình
                          </button>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                handleUpdateQuantity(
                                  item.cart_item_id,
                                  shownQty - 1
                                )
                              }
                              className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50"
                            >
                              <Minus className="w-4 h-4" />
                            </button>

                            <span className="w-12 text-center font-medium">
                              {shownQty}
                            </span>

                            <button
                              onClick={() =>
                                handleUpdateQuantity(
                                  item.cart_item_id,
                                  shownQty + 1
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
                            {formatPrice(unitPrice * shownQty)}
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

      {/* Confirm Modal (thay window.confirm) */}
      {confirmState.open && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="font-bold text-gray-900">
                {confirmState.kind === "clear"
                  ? "Xóa tất cả sản phẩm?"
                  : "Xóa sản phẩm khỏi giỏ?"}
              </div>
              <button
                type="button"
                onClick={closeConfirm}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 py-4 text-sm text-gray-700">
              {confirmState.kind === "clear"
                ? "Bạn có chắc muốn xóa tất cả sản phẩm trong giỏ hàng?"
                : "Bạn có chắc muốn xóa sản phẩm này khỏi giỏ hàng?"}
            </div>
            <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeConfirm}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 font-semibold hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmYes}
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal đổi cấu hình (variation) */}
      {variantModal.open && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-gray-900">Đổi cấu hình</div>
                <div className="text-sm text-gray-500 line-clamp-1">
                  {variantModal.item?.product?.product_name}
                </div>
              </div>
              <button
                type="button"
                onClick={closeVariantModal}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-4">
              {variantLoading ? (
                <div className="text-sm text-gray-600">Đang tải cấu hình...</div>
              ) : variantError ? (
                <div className="text-sm text-red-600">{variantError}</div>
              ) : (
                <>
                  {(() => {
                    const vars = variantProduct?.variations || [];
                    const ramOpts = getUnique(vars, "ram");
                    const storageOpts = getUnique(vars, "storage");
                    const colorOpts = getUnique(vars, "color");
                    const chosen = matchVariation(vars, variantSel);
                    const chosenStock = Number(chosen?.stock_quantity || 0);
                    const chosenOk = chosen && chosen?.is_available !== false && chosenStock > 0;

                    return (
                      <div className="space-y-4">
                        {!!ramOpts.length && (
                          <div>
                            <div className="text-sm font-semibold text-gray-800 mb-1">RAM</div>
                            <select
                              className="w-full border border-gray-300 rounded-lg px-3 py-2"
                              value={variantSel.ram}
                              onChange={(e) => setVariantSel((s) => ({ ...s, ram: e.target.value }))}
                            >
                              <option value="">Chọn RAM</option>
                              {ramOpts.map((v) => (
                                <option key={v} value={v}>
                                  {v}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {!!storageOpts.length && (
                          <div>
                            <div className="text-sm font-semibold text-gray-800 mb-1">SSD/Storage</div>
                            <select
                              className="w-full border border-gray-300 rounded-lg px-3 py-2"
                              value={variantSel.storage}
                              onChange={(e) => setVariantSel((s) => ({ ...s, storage: e.target.value }))}
                            >
                              <option value="">Chọn SSD/Storage</option>
                              {storageOpts.map((v) => (
                                <option key={v} value={v}>
                                  {v}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {!!colorOpts.length && (
                          <div>
                            <div className="text-sm font-semibold text-gray-800 mb-1">Màu sắc</div>
                            <select
                              className="w-full border border-gray-300 rounded-lg px-3 py-2"
                              value={variantSel.color}
                              onChange={(e) => setVariantSel((s) => ({ ...s, color: e.target.value }))}
                            >
                              <option value="">Chọn màu</option>
                              {colorOpts.map((v) => (
                                <option key={v} value={v}>
                                  {v}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                          {chosen ? (
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-gray-700">
                                Cấu hình:{" "}
                                {[chosen.ram, chosen.storage, chosen.color].filter(Boolean).join(" / ") || "—"}
                              </div>
                              <div className={chosenOk ? "text-green-700 font-semibold" : "text-red-700 font-semibold"}>
                                {chosenOk ? `Còn ${chosenStock} máy` : "Hết hàng"}
                              </div>
                            </div>
                          ) : (
                            <div className="text-gray-600">Hãy chọn RAM/SSD/Màu để tìm cấu hình phù hợp.</div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeVariantModal}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 font-semibold hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleApplyVariation}
                disabled={variantLoading || addToCart.isPending || removeItemSrv.isPending}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
