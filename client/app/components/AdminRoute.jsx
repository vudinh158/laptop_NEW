import { useSelector, useDispatch } from "react-redux"
import { Navigate, useLocation } from "react-router-dom"
import { logout } from "../store/slices/authSlice"

function AdminLayout({ children, onLogout }) {
  const location = useLocation()

  const menuItems = [
    {
      title: "Dashboard",
      icon: "🏠",
      path: "/admin",
    },
    {
      title: "Analytics",
      icon: "📊",
      path: "/admin/analytics",
    },
    {
      title: "Sản phẩm",
      icon: "📦",
      path: "/admin/products",
    },
    {
      title: "Đơn hàng",
      icon: "🛒",
      path: "/admin/orders",
    },
    {
      title: "Người dùng",
      icon: "👥",
      path: "/admin/users",
    },
    {
      title: "Danh mục",
      icon: "📁",
      path: "/admin/categories",
    },
    {
      title: "Thương hiệu",
      icon: "🏷️",
      path: "/admin/brands",
    },
    {
      title: "Q&A",
      icon: "💬",
      path: "/admin/questions",
    },
  ]

  const isActive = (path) => {
    if (path === "/admin") {
      return location.pathname === "/admin"
    }
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="h-16 px-6 border-b border-gray-200 flex items-center">
            <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {menuItems.map((item) => (
              <a
                key={item.path}
                href={item.path}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-150 ${
                  isActive(item.path)
                    ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                {item.title}
              </a>
            ))}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={onLogout}
              className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors duration-150"
            >
              <span className="mr-3">🚪</span>
              Đăng xuất
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1">
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function AdminRoute({ children }) {
  const dispatch = useDispatch()
  const { isAuthenticated, user } = useSelector((state) => state.auth)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const isAdmin = user?.roles?.includes("admin")

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  const handleLogout = () => {
    dispatch(logout())
  }

  return <AdminLayout onLogout={handleLogout}>{children}</AdminLayout>
}
