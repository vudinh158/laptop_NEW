import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setCredentials } from "./store/slices/authSlice";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import HomePage from "./pages/HomePage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProfilePage from "./pages/ProfilePage";
import OrdersPage from "./pages/OrdersPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminBrands from "./pages/admin/AdminBrands";
import AdminQuestions from "./pages/admin/AdminQuestions";
import AdminQuestionDetail from "./pages/admin/AdminQuestionDetail";
import AdminProductNewPage from "./pages/admin/AdminProductNewPage";
import AdminProductEditPage from "./pages/admin/AdminProductEditPage";
import VnpayReturn from "./pages/checkout/VnpayReturn";
import OrderDetailPage from "./pages/OrderDetailPage";
import CheckoutSuccessPage from "./pages/CheckoutSuccessPage";
import OAuthSuccess from "./pages/OAuthSuccess";

function App() {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector(state => state.auth);

  // Restore auth state từ localStorage khi app khởi động
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    console.log('App init - checking auth restore:', { token: !!token, userStr: !!userStr, isAuthenticated });

    if (token && userStr && !isAuthenticated) {
      try {
        const user = JSON.parse(userStr);
        console.log('Restoring auth state for user:', user.username);
        dispatch(setCredentials({ token, user }));
      } catch (error) {
        console.error('Failed to restore auth state:', error);
        // Clear invalid data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('roles');
      }
    }
  }, [dispatch, isAuthenticated]);

  // Xóa pendingCheckout nếu user đã đăng nhập và pendingCheckout quá cũ (>5 phút)
  useEffect(() => {
    if (isAuthenticated) {
      const pendingCheckoutStr = localStorage.getItem('pendingCheckout');
      if (pendingCheckoutStr) {
        try {
          const pendingCheckout = JSON.parse(pendingCheckoutStr);
          const timestamp = pendingCheckout.timestamp || 0;
          // Xóa nếu pendingCheckout cũ hơn 5 phút (có thể từ session trước)
          if (Date.now() - timestamp > 300000) { // 5 phút
            console.log('Removing old pendingCheckout (created', new Date(timestamp), ')');
            localStorage.removeItem('pendingCheckout');
          }
        } catch (e) {
          // Nếu parse lỗi, xóa luôn
          localStorage.removeItem('pendingCheckout');
        }
      }
    }
  }, [isAuthenticated]);

  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="products/:id" element={<ProductDetailPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="oauth/success" element={<OAuthSuccess />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />

          <Route
            path="checkout"
            element={
              <ProtectedRoute>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route path="checkout/success" element={<CheckoutSuccessPage />} />
          <Route path="checkout/vnpay-return" element={<VnpayReturn />} />

          <Route
            path="profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="orders"
            element={
              <ProtectedRoute>
                <OrdersPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />

          <Route
            path="admin/analytics"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />

          <Route
            path="admin/products"
            element={
              <AdminRoute>
                <AdminProducts />
              </AdminRoute>
            }
          />

          <Route
            path="admin/products/new"
            element={
              <AdminRoute>
                <AdminProductNewPage />
              </AdminRoute>
            }
          />

          <Route
            path="admin/products/edit/:id"
            element={
              <AdminRoute>
                <AdminProductEditPage />
              </AdminRoute>
            }
          />

          <Route
            path="admin/orders"
            element={
              <AdminRoute>
                <AdminOrders />
              </AdminRoute>
            }
          />

          <Route
            path="admin/orders/:orderId"
            element={
              <AdminRoute>
                <AdminOrders />
              </AdminRoute>
            }
          />

          <Route
            path="admin/users"
            element={
              <AdminRoute>
                <AdminUsers />
              </AdminRoute>
            }
          />

          <Route
            path="admin/categories"
            element={
              <AdminRoute>
                <AdminCategories />
              </AdminRoute>
            }
          />

          <Route
            path="admin/brands"
            element={
              <AdminRoute>
                <AdminBrands />
              </AdminRoute>
            }
          />

          <Route
            path="admin/questions"
            element={
              <AdminRoute>
                <AdminQuestions />
              </AdminRoute>
            }
          />

          <Route
            path="admin/questions/:question_id"
            element={
              <AdminRoute>
                <AdminQuestionDetail />
              </AdminRoute>
            }
          />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
