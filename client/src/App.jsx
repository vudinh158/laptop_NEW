// "use client"

// import { Routes, Route } from "react-router-dom"
// import { useEffect } from "react"
// import { useDispatch } from "react-redux"
// import { setUser } from "./store/slices/authSlice"
// import Layout from "./components/Layout"
// import ProtectedRoute from "./components/ProtectedRoute"
// import HomePage from "./pages/HomePage"
// import ProductDetailPage from "./pages/ProductDetailPage"
// import CartPage from "./pages/CartPage"
// import CheckoutPage from "./pages/CheckoutPage"
// import OrdersPage from "./pages/OrdersPage"
// import OrderDetailPage from "./pages/OrderDetailPage"
// import LoginPage from "./pages/LoginPage"
// import RegisterPage from "./pages/RegisterPage"
// import ProfilePage from "./pages/ProfilePage"
// import AdminDashboard from "./pages/admin/AdminDashboard"
// import AdminProducts from "./pages/admin/AdminProducts"
// import AdminOrders from "./pages/admin/AdminOrders"
// import AdminUsers from "./pages/admin/AdminUsers"

// function App() {
//   const dispatch = useDispatch()

//   useEffect(() => {
//     // Check for stored auth token on app load
//     const token = localStorage.getItem("token")
//     const user = localStorage.getItem("user")

//     if (token && user) {
//       dispatch(setUser({ user: JSON.parse(user), token }))
//     }
//   }, [dispatch])

//   return (
//     <Routes>
//       <Route path="/" element={<Layout />}>
//         {/* Public routes */}
//         <Route index element={<HomePage />} />
//         <Route path="products/:id" element={<ProductDetailPage />} />
//         <Route path="login" element={<LoginPage />} />
//         <Route path="register" element={<RegisterPage />} />

//         {/* Protected routes */}
//         <Route
//           path="cart"
//           element={
//             <ProtectedRoute>
//               <CartPage />
//             </ProtectedRoute>
//           }
//         />
//         <Route
//           path="checkout"
//           element={
//             <ProtectedRoute>
//               <CheckoutPage />
//             </ProtectedRoute>
//           }
//         />
//         <Route
//           path="orders"
//           element={
//             <ProtectedRoute>
//               <OrdersPage />
//             </ProtectedRoute>
//           }
//         />
//         <Route
//           path="orders/:orderId"
//           element={
//             <ProtectedRoute>
//               <OrderDetailPage />
//             </ProtectedRoute>
//           }
//         />
//         <Route
//           path="profile"
//           element={
//             <ProtectedRoute>
//               <ProfilePage />
//             </ProtectedRoute>
//           }
//         />

//         {/* Admin routes */}
//         <Route
//           path="admin"
//           element={
//             <ProtectedRoute requireAdmin>
//               <AdminDashboard />
//             </ProtectedRoute>
//           }
//         />
//         <Route
//           path="admin/products"
//           element={
//             <ProtectedRoute requireAdmin>
//               <AdminProducts />
//             </ProtectedRoute>
//           }
//         />
//         <Route
//           path="admin/orders"
//           element={
//             <ProtectedRoute requireAdmin>
//               <AdminOrders />
//             </ProtectedRoute>
//           }
//         />
//         <Route
//           path="admin/users"
//           element={
//             <ProtectedRoute requireAdmin>
//               <AdminUsers />
//             </ProtectedRoute>
//           }
//         />
//       </Route>
//     </Routes>
//   )
// }

// export default App
