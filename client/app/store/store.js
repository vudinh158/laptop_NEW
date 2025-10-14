import { configureStore } from "@reduxjs/toolkit"
import authReducer from "./slices/authSlice"
import cartReducer from "./slices/cartSlice"
import uiReducer from "./slices/uiSlice"

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
})
