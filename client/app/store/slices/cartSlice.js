// client/store/slices/cartSlice.js
import { createSlice } from "@reduxjs/toolkit";

function recalcTotals(state) {
  state.totalItems = state.items.reduce((sum, i) => sum + i.quantity, 0);
  state.totalPrice = state.items.reduce(
    (sum, i) => sum + (Number(i.price) || 0) * i.quantity,
    0
  );
}

const initialState = {
  items: [], // [{ id, product_id, variation_id, quantity, price, product, selected }]
  totalItems: 0,
  totalPrice: 0,
  loading: false,
  error: null,
  customerInfo: null, // { fullName, email, phone, address }
};

// helper: tính đơn giá từ payload (giữ nguyên logic cũ)
const getUnitPrice = (payload) => {
  const raw = Number(
    payload?.product?.variation?.price ??
      payload?.price ?? // fallback nếu có truyền sẵn
      payload?.product?.base_price ??
      0
  );
  const discount = Number(payload?.product?.discount_percentage ?? 0);
  return Math.max(0, raw * (1 - discount / 100));
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    // Nạp items (ví dụ từ localStorage hoặc API) - đảm bảo có field selected
    setCartItems: (state, action) => {
      const incoming = Array.isArray(action.payload) ? action.payload : [];
      state.items = incoming.map((i) => ({
        selected: i.selected ?? false, // mặc định CHƯA tick
        ...i,
      }));
      recalcTotals(state);
    },

    addItem: (state, action) => {
      const payload = action.payload;
      const price = getUnitPrice(payload); // ✅ áp dụng discount nếu có

      const existing = state.items.find(
        (i) => i.variation_id === payload.variation_id
      );

      if (existing) {
        existing.quantity += payload.quantity || 1;
        // giữ price theo logic slice
        existing.price = price;
        // giữ nguyên trạng thái selected hiện có
      } else {
        state.items.push({
          id: payload.id ?? `${payload.product_id}-${payload.variation_id}`,
          product_id: payload.product_id,
          variation_id: payload.variation_id,
          quantity: payload.quantity || 1,
          price,
          product: payload.product,
          selected: false, // mặc định CHƯA tick (UX: người dùng tự tick để thanh toán)
        });
      }
      recalcTotals(state);
    },

    updateQuantity: (state, action) => {
      const { id, quantity } = action.payload;
      const item = state.items.find((i) => i.id === id);
      if (item) {
        item.quantity = Math.max(1, quantity);
        recalcTotals(state);
      }
    },

    removeItem: (state, action) => {
      const id = action.payload;
      state.items = state.items.filter((i) => i.id !== id);
      recalcTotals(state);
    },

    // Tuỳ chọn: xoá nhiều item theo danh sách id (phục vụ xoá các món đã thanh toán COD)
    removeMany: (state, action) => {
      const ids = new Set(action.payload?.ids || []);
      if (ids.size === 0) return;
      state.items = state.items.filter((i) => !ids.has(i.id));
      recalcTotals(state);
    },

    clearCart: (state) => {
      state.items = [];
      recalcTotals(state);
    },

    setLoading: (state, action) => {
      state.loading = action.payload;
    },

    setError: (state, action) => {
      state.error = action.payload;
    },

    // Khi load giỏ từ API BE (đã đăng nhập)
    // Khi load giỏ từ API BE (đã đăng nhập)
    setCart: (state, action) => {
      const {
        items = [],
        subtotal_snapshot,
        subtotal_after_discount,
      } = action.payload || {};

      state.items = items.map((item) => {
        // BE trả: item.product { product_id, discount_percentage, variation: { price } }
        const product = item?.product ?? {};
        const variationFromProduct = product?.variation ?? {};

        // Trường hợp BE khác: item.variation ở cấp item
        const variationAlt =
          item?.variation ?? item?.Variation ?? item?.ProductVariation ?? {};
        const variation = Object.keys(variationFromProduct).length
          ? variationFromProduct
          : variationAlt;

        // GỘP: lấy tồn kho/thuộc tính từ variationAlt, lấy price từ product.variation
        const mergedVariation = { ...variationAlt, ...variationFromProduct };

        // Đơn giá ưu tiên số BE đã tính sẵn
        const unitFromBE = Number(item?.unit_price_after_discount ?? NaN);
        const raw = isNaN(unitFromBE)
          ? Number(mergedVariation?.price ?? product?.base_price ?? 0)
          : unitFromBE;
        const discount = Number(product?.discount_percentage ?? 0);
        const unitPrice = isNaN(unitFromBE)
          ? Math.max(0, raw * (1 - discount / 100))
          : unitFromBE;

        // Ảnh: hỗ trợ cả alias khác nhau nếu sau này BE có trả
        const images = product?.images ?? product?.ProductImages ?? [];

        return {
          id: item.cart_item_id ?? item.id,
          cart_item_id: item.cart_item_id ?? item.id,
          product_id: product?.product_id ?? variation?.product_id,
          variation_id: item?.variation_id ?? variation?.variation_id,
          quantity: item?.quantity ?? 1,
          price: unitPrice, // đơn giá sau giảm (UI dùng để hiển thị/tính nhanh)
          // expose variation ở CẤP ROOT để CartPage đọc tồn kho
          variation: mergedVariation,
          product: {
            ...product,
            images,
            variation: mergedVariation, // để UI có product.variation.price
          },
          unit_price_after_discount: item?.unit_price_after_discount,
          line_total_after_discount: item?.line_total_after_discount,
          selected: false, // mặc định chưa tick
        };
      });

      recalcTotals(state);
      // Ưu tiên các số tổng từ BE nếu có (live > snapshot)
      state.totalPrice = Number(subtotal_after_discount ?? subtotal_snapshot ?? state.totalPrice);
    },

    // Prefill checkout từ hồ sơ user (nếu đã login)
    setCustomerInfo: (state, action) => {
      state.customerInfo = action.payload; // { fullName, email, phone, address }
    },

    // NEW: set tick cho 1 item
    setItemSelected: (state, action) => {
      const { id, selected } = action.payload || {};
      const item = state.items.find((i) => i.id === id);
      if (!item) return;
      item.selected = !!selected;
      // totals giữ nguyên (tổng toàn giỏ); tổng theo món tick tính ở UI
    },

    // NEW: set tick cho tất cả item
    setAllSelected: (state, action) => {
      const { selected } = action.payload || {};
      state.items.forEach((i) => {
        i.selected = !!selected;
      });
    },
  },
});

export const {
  setCartItems,
  addItem,
  updateQuantity,
  removeItem,
  removeMany, // NEW (tuỳ chọn)
  clearCart,
  setLoading,
  setError,
  setCart,
  setCustomerInfo,
  setItemSelected, // NEW
  setAllSelected, // NEW
} = cartSlice.actions;

export default cartSlice.reducer;
