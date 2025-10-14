import { Link } from "react-router-dom"
import { Package, ShoppingCart, Users, FolderTree } from "lucide-react"

export default function AdminDashboard() {
  const menuItems = [
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
  ]

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Quản trị hệ thống</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
    </div>
  )
}
