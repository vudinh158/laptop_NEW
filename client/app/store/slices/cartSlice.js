import { createSlice } from "@reduxjs/toolkit"

const initialState = {
  items: [],
  totalItems: 0,
  totalPrice: 0,
  loading: false,
  error: null,
}

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    setCartItems: (state, action) => {
      state.items = action.payload
      state.totalItems = action.payload.reduce((sum, item) => sum + item.quantity, 0)
      state.totalPrice = action.payload.reduce((sum, item) => sum + item.price * item.quantity, 0)
    },
    addItem: (state, action) => {
      const existingItem = state.items.find((item) => item.variation_id === action.payload.variation_id)

      if (existingItem) {
        existingItem.quantity += action.payload.quantity
      } else {
        state.items.push(action.payload)
      }

      state.totalItems = state.items.reduce((sum, item) => sum + item.quantity, 0)
      state.totalPrice = state.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    },
    updateQuantity: (state, action) => {
      const { variation_id, quantity } = action.payload
      const item = state.items.find((item) => item.variation_id === variation_id)

      if (item) {
        item.quantity = quantity
        state.totalItems = state.items.reduce((sum, item) => sum + item.quantity, 0)
        state.totalPrice = state.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      }
    },
    removeItem: (state, action) => {
      state.items = state.items.filter((item) => item.variation_id !== action.payload)
      state.totalItems = state.items.reduce((sum, item) => sum + item.quantity, 0)
      state.totalPrice = state.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    },
    clearCart: (state) => {
      state.items = []
      state.totalItems = 0
      state.totalPrice = 0
    },
    setLoading: (state, action) => {
      state.loading = action.payload
    },
    setError: (state, action) => {
      state.error = action.payload
    },
    setCart: (state, action) => {
      state.items = action.payload.items.map(item => ({
        id: item.cart_item_id, // Lấy ID của CartItem để dùng cho removeItem, updateQuantity
        product_id: item.variation.product_id,
        variation_id: item.variation_id,
        quantity: item.quantity,
        product: {
          ...item.variation.Product,
          variation: item.variation
        }
      }))
      state.totalItems = state.items.reduce((sum, item) => sum + item.quantity, 0)
      state.totalPrice = action.payload.subtotal // Giả sử subtotal từ API đã tính đúng
    }
  },
})

export const { setCartItems, addItem, updateQuantity, removeItem, clearCart, setLoading, setError, setCart } =
  cartSlice.actions

export default cartSlice.reducer
