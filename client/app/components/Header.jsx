"use client"

import { Link, useNavigate } from "react-router-dom"
import { useSelector, useDispatch } from "react-redux"
import { useState } from "react"
import { logout } from "../store/slices/authSlice"
import { ShoppingCart, User, Search, Menu, X, LogOut, Package } from "lucide-react"

export default function Header() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useSelector((state) => state.auth)
  const { items } = useSelector((state) => state.cart)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const cartItemsCount = items.reduce((total, item) => total + item.quantity, 0)

  const handleLogout = () => {
    dispatch(logout())
    navigate("/")
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/?search=${searchQuery}`)
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">L</span>
              </div>
              <span className="text-xl font-bold text-gray-900">LaptopStore</span>
            </Link>

            <form onSubmit={handleSearch} className="hidden md:flex items-center">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm kiếm laptop..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-96 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </form>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            {isAuthenticated ? (
              <>
                <Link to="/profile" className="flex items-center gap-2 text-gray-700 hover:text-blue-600">
                  <User className="w-5 h-5" />
                  <span>{user?.full_name || user?.email}</span>
                </Link>

                <Link to="/orders" className="flex items-center gap-2 text-gray-700 hover:text-blue-600">
                  <Package className="w-5 h-5" />
                  <span>Đơn hàng</span>
                </Link>

                {user?.roles?.includes("admin") && (
                  <Link to="/admin" className="text-gray-700 hover:text-blue-600">
                    Admin
                  </Link>
                )}

                <button onClick={handleLogout} className="flex items-center gap-2 text-gray-700 hover:text-blue-600">
                  <LogOut className="w-5 h-5" />
                  <span>Đăng xuất</span>
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-700 hover:text-blue-600">
                  Đăng nhập
                </Link>
                <Link to="/register" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Đăng ký
                </Link>
              </>
            )}

            <Link to="/cart" className="relative">
              <ShoppingCart className="w-6 h-6 text-gray-700 hover:text-blue-600" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center">
                  {cartItemsCount}
                </span>
              )}
            </Link>
          </nav>

          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden">
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <form onSubmit={handleSearch} className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm kiếm laptop..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </form>

            <nav className="flex flex-col gap-4">
              {isAuthenticated ? (
                <>
                  <Link to="/profile" className="text-gray-700 hover:text-blue-600">
                    Tài khoản
                  </Link>
                  <Link to="/orders" className="text-gray-700 hover:text-blue-600">
                    Đơn hàng
                  </Link>
                  {user?.roles?.includes("admin") && (
                    <Link to="/admin" className="text-gray-700 hover:text-blue-600">
                      Admin
                    </Link>
                  )}
                  <button onClick={handleLogout} className="text-left text-gray-700 hover:text-blue-600">
                    Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-gray-700 hover:text-blue-600">
                    Đăng nhập
                  </Link>
                  <Link to="/register" className="text-gray-700 hover:text-blue-600">
                    Đăng ký
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
