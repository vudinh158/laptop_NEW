import { createSlice } from "@reduxjs/toolkit"

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      state.user = action.payload.user
      state.token = action.payload.token
      state.isAuthenticated = true
      state.error = null
      // Bạn có thể cân nhắc lưu token và user vào localStorage ở đây
      // để dữ liệu được giữ lại sau khi tải lại trang, như đã làm trong App.jsx
      localStorage.setItem("token", action.payload.token)
      localStorage.setItem("user", JSON.stringify(action.payload.user))
    },
    setLoading: (state, action) => {
      state.loading = action.payload
    },
    setError: (state, action) => {
      state.error = action.payload
      state.loading = false
    },
    logout: (state) => {
      state.user = null
      state.token = null
      state.isAuthenticated = false
      state.error = null
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      localStorage.removeItem("roles")
    },
    clearError: (state) => {
      state.error = null
    },
  },
})

export const { setCredentials, setLoading, setError, logout, clearError } = authSlice.actions
export default authSlice.reducer
