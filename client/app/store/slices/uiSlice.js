import { createSlice } from "@reduxjs/toolkit"

const initialState = {
  sidebarOpen: false,
  mobileMenuOpen: false,
  cartDrawerOpen: false,
  searchOpen: false,
  notifications: [],
  theme: "light",
}

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen
    },
    toggleMobileMenu: (state) => {
      state.mobileMenuOpen = !state.mobileMenuOpen
    },
    toggleCartDrawer: (state) => {
      state.cartDrawerOpen = !state.cartDrawerOpen
    },
    toggleSearch: (state) => {
      state.searchOpen = !state.searchOpen
    },
    addNotification: (state, action) => {
      state.notifications.push({
        id: Date.now(),
        ...action.payload,
      })
    },
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter((notification) => notification.id !== action.payload)
    },
    setTheme: (state, action) => {
      state.theme = action.payload
    },
  },
})

export const {
  toggleSidebar,
  toggleMobileMenu,
  toggleCartDrawer,
  toggleSearch,
  addNotification,
  removeNotification,
  setTheme,
} = uiSlice.actions

export default uiSlice.reducer
