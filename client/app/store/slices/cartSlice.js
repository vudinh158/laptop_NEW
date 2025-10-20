import { createSlice } from "@reduxjs/toolkit";

function recalcTotals(state) {
  state.totalItems = state.items.reduce((sum, i) => sum + i.quantity, 0);
  state.totalPrice = state.items.reduce(
    (sum, i) => sum + (Number(i.price) || 0) * i.quantity,
    0
  );
}

const initialState = {
  items: [],
  totalItems: 0,
  totalPrice: 0,
  loading: false,
  error: null,
  customerInfo: null, // { fullName, email, phone, address } -> prefill checkout
};

// helper: tính đơn giá từ payload
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
    setCartItems: (state, action) => {
      state.items = action.payload;
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
      } else {
        state.items.push({
          id: payload.id ?? `${payload.product_id}-${payload.variation_id}`,
          product_id: payload.product_id,
          variation_id: payload.variation_id,
          quantity: payload.quantity || 1,
          price,
          product: payload.product,
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
      const id = action.payload; // dùng id
      state.items = state.items.filter((i) => i.id !== id);
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
    setCart: (state, action) => {
      const { items = [], subtotal = 0 } = action.payload;

      state.items = items.map((item) => {
        const raw = Number(item?.variation?.price ?? 0);
        const discount = Number(
          item?.variation?.Product?.discount_percentage ?? 0
        );
        const unitPrice = Math.max(0, raw * (1 - discount / 100)); // ✅

        return {
          id: item.cart_item_id,
          product_id: item.variation.product_id,
          variation_id: item.variation_id,
          quantity: item.quantity,
          price: unitPrice, // ✅ dùng giá sau giảm
          product: {
            ...item.variation.Product,
            variation: item.variation,
          },
        };
      });

      recalcTotals(state);
      state.totalPrice = subtotal || state.totalPrice;
    },

    // Prefill checkout từ hồ sơ user (nếu đã login)
    setCustomerInfo: (state, action) => {
      state.customerInfo = action.payload; // { fullName, email, phone, address }
    },
  },
});

export const {
  setCartItems,
  addItem,
  updateQuantity,
  removeItem,
  clearCart,
  setLoading,
  setError,
  setCart,
  setCustomerInfo,
} = cartSlice.actions;

export default cartSlice.reducer;
