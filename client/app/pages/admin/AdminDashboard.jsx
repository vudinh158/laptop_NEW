import { Link, useLocation } from "react-router-dom"
import { useState } from "react"
import { Package, ShoppingCart, Users, FolderTree, BarChart3, LayoutDashboard, LogOut, Menu, X, TrendingUp, TrendingDown, DollarSign, Eye, Clock, CheckCircle, XCircle, Truck, MessageCircle, AlertTriangle } from "lucide-react"
import { useDispatch } from "react-redux"
import { logout } from "../../store/slices/authSlice"
import { useAdminAnalytics } from "../../hooks/useOrders"
import LoadingSpinner from "../../components/LoadingSpinner"
import { formatPrice } from "../../utils/formatters"
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

// AdminLayout Component
function AdminLayout({ children }) {
  const location = useLocation()
  const dispatch = useDispatch()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const menuItems = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      path: "/admin",
    },
    {
      title: "Analytics",
      icon: BarChart3,
      path: "/admin/analytics",
    },
    {
      title: "Sản phẩm",
      icon: Package,
      path: "/admin/products",
    },
    {
      title: "Đơn hàng",
      icon: ShoppingCart,
      path: "/admin/orders",
    },
    {
      title: "Người dùng",
      icon: Users,
      path: "/admin/users",
    },
    {
      title: "Danh mục",
      icon: FolderTree,
      path: "/admin/categories",
    },
  ]

  const handleLogout = () => {
    dispatch(logout())
  }

  const isActive = (path) => {
    if (path === "/admin") {
      return location.pathname === "/admin"
    }
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-150 ${
                  isActive(item.path)
                    ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.title}
              </Link>
            ))}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors duration-150"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Đăng xuất
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 lg:hidden">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Admin Panel</h1>
            <div className="w-6" /> {/* Spacer */}
          </div>
        </div>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

// AdminAnalyticsDashboard Component
function AdminAnalyticsDashboard() {
  const [period, setPeriod] = useState("30")
  const { data, isLoading, error, refetch } = useAdminAnalytics({ period })

  // Refetch when period changes
  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod)
    refetch()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-600 py-10 text-center">
        Không tải được dữ liệu analytics
      </div>
    )
  }

  const analytics = data || {}
  const totals = analytics.totals || {}
  const recent = analytics.recent || {}
  const orderStatusBreakdown = analytics.order_status_breakdown || []
  const lowStockAlerts = analytics.low_stock_alerts || []
  const salesByCategory = analytics.sales_by_category || []
  const salesByBrand = analytics.sales_by_brand || []
  const topProducts = analytics.top_products || []

  // Prepare data for charts
  const revenueChartData = analytics.sales_data?.map(item => ({
    date: new Date(item.date).toLocaleDateString('vi-VN'),
    revenue: item.total_revenue || 0,
    orders: item.order_count || 0
  })) || []

  const statusChartData = orderStatusBreakdown.map(status => ({
    name: status.status === 'pending' ? 'Chờ xử lý' :
          status.status === 'processing' ? 'Đang xử lý' :
          status.status === 'shipped' ? 'Đã giao' :
          status.status === 'delivered' ? 'Hoàn thành' :
          status.status === 'cancelled' ? 'Đã hủy' :
          status.status,
    value: status.count,
    fill: status.status === 'delivered' ? '#10B981' :
          status.status === 'processing' ? '#F59E0B' :
          status.status === 'pending' ? '#6B7280' :
          status.status === 'shipped' ? '#3B82F6' :
          status.status === 'cancelled' ? '#EF4444' :
          '#8B5CF6'
  }))

  const categoryChartData = salesByCategory.map(cat => ({
    name: cat.category_name || 'Unknown',
    revenue: Number(cat.total_revenue) || 0,
    quantity: Number(cat.total_quantity) || 0
  }))

  const StatCard = ({ title, value, icon: Icon, trend, trendValue, subtitle }) => (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && trendValue && (
            <div className={`flex items-center mt-2 text-sm ${
              trend === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend === 'up' ? (
                <TrendingUp className="w-4 h-4 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 mr-1" />
              )}
              {trendValue}
            </div>
          )}
        </div>
        <div className="bg-blue-50 p-3 rounded-lg">
          <Icon className="w-6 h-6 text-blue-600" />
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <select
          value={period}
          onChange={(e) => handlePeriodChange(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="7">7 ngày</option>
          <option value="30">30 ngày</option>
          <option value="90">90 ngày</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Tổng doanh thu"
          value={formatPrice(totals.revenue)}
          icon={DollarSign}
          subtitle={`${period} ngày gần nhất`}
        />
        <StatCard
          title="Giá trị đơn hàng TB"
          value={formatPrice(totals.aov)}
          icon={TrendingUp}
          subtitle="AOV - Average Order Value"
        />
        <StatCard
          title="Tỷ lệ thành công"
          value={`${totals.success_rate}%`}
          icon={CheckCircle}
          subtitle="Đơn hàng đã giao"
        />
        <StatCard
          title="Tổng chiết khấu"
          value={formatPrice(totals.discount)}
          icon={TrendingDown}
          subtitle="Đã áp dụng"
        />
        <StatCard
          title="Tổng đơn hàng"
          value={totals.orders}
          icon={ShoppingCart}
          subtitle={`${recent.orders_last_7_days || 0} đơn trong 7 ngày`}
        />
        <StatCard
          title="Tổng sản phẩm"
          value={totals.products}
          icon={Package}
          subtitle="Đang hoạt động"
        />
        <StatCard
          title="Tổng người dùng"
          value={totals.users}
          icon={Users}
          subtitle="Đã đăng ký"
        />
        <StatCard
          title="Cảnh báo kho"
          value={lowStockAlerts.length}
          icon={AlertTriangle}
          subtitle="Sản phẩm sắp hết"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Line Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center mb-4">
            <BarChart3 className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Doanh thu theo ngày</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  fontSize={12}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  fontSize={12}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                />
                <Tooltip
                  formatter={(value) => [formatPrice(value), 'Doanh thu']}
                  labelStyle={{ fontSize: '12px' }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Status Pie Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center mb-4">
            <LayoutDashboard className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Trạng thái đơn hàng</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Đơn hàng']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Category Sales Bar Chart */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center mb-4">
          <FolderTree className="w-5 h-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Doanh số theo danh mục</h3>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                fontSize={12}
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                fontSize={12}
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
              />
              <Tooltip
                formatter={(value) => [formatPrice(value), 'Doanh thu']}
                labelStyle={{ fontSize: '12px' }}
              />
              <Bar dataKey="revenue" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Low Stock Alert & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alert */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center mb-4">
            <AlertTriangle className="w-5 h-5 text-orange-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Cảnh báo hết hàng</h3>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {lowStockAlerts.length > 0 ? (
              lowStockAlerts.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center space-x-3">
                    {item['product.thumbnail_url'] && (
                      <img
                        src={item['product.thumbnail_url']}
                        alt={item['product.product_name']}
                        className="w-8 h-8 object-cover rounded"
                        onError={(e) => e.currentTarget.style.display = 'none'}
                      />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {item['product.product_name']}
                      </p>
                      <p className="text-xs text-gray-600">SKU: {item.sku}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-orange-600">
                      {item.stock_quantity}
                    </p>
                    <p className="text-xs text-gray-500">còn lại</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Không có sản phẩm nào sắp hết hàng</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center mb-4">
            <TrendingUp className="w-5 h-5 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Sản phẩm bán chạy</h3>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {topProducts.map((product, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {product['product.thumbnail_url'] && (
                    <img
                      src={product['product.thumbnail_url']}
                      alt={product['product.product_name']}
                      className="w-10 h-10 object-cover rounded"
                      onError={(e) => e.currentTarget.style.display = 'none'}
                    />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {product['product.product_name']}
                    </p>
                    <p className="text-xs text-gray-600">
                      SKU: {product.sku} • {product.processor} • {product.ram} • {product.storage}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">
                    {product.total_quantity}
                  </p>
                  <p className="text-xs text-gray-500">đã bán</p>
                  <p className="text-xs text-green-600 font-medium">
                    {formatPrice(product.total_revenue)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Main AdminDashboard Component
export default function AdminDashboard() {
  const location = useLocation()

  // Show Analytics if on /admin/analytics path
  if (location.pathname === "/admin/analytics") {
    return <AdminAnalyticsDashboard />
  }

  // Show Dashboard
  const menuItems = [
    {
      title: "Analytics",
      description: "Thống kê và báo cáo",
      icon: BarChart3,
      link: "/admin/analytics",
      color: "bg-indigo-500",
    },
    {
      title: "Quản lý sản phẩm",
      description: "Thêm, sửa, xóa sản phẩm",
      icon: Package,
      link: "/admin/products",
      color: "bg-blue-500",
    },
    {
      title: "Quản lý đơn hàng",
      description: "Xem và xử lý đơn hàng",
      icon: ShoppingCart,
      link: "/admin/orders",
      color: "bg-green-500",
    },
    {
      title: "Quản lý người dùng",
      description: "Quản lý tài khoản người dùng",
      icon: Users,
      link: "/admin/users",
      color: "bg-purple-500",
    },
    {
      title: "Quản lý danh mục",
      description: "Quản lý danh mục sản phẩm",
      icon: FolderTree,
      link: "/admin/categories",
      color: "bg-orange-500",
    },
    {
      title: "Q&A",
      description: "Trả lời câu hỏi từ khách hàng",
      icon: MessageCircle,
      link: "/admin/questions",
      color: "bg-pink-500",
    },
  ]

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Quản trị hệ thống</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {menuItems.map((item) => (
          <Link
            key={item.link}
            to={item.link}
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className={`w-12 h-12 ${item.color} rounded-lg flex items-center justify-center mb-4`}>
              <item.icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
            <p className="text-sm text-gray-600">{item.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
