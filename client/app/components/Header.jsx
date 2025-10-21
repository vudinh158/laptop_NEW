// client/app/components/Header.jsx
import { Link, useNavigate } from "react-router-dom"
import { useSelector, useDispatch } from "react-redux"
import { useState, useRef } from "react" 
import { logout } from "../store/slices/authSlice"
import { ShoppingCart, User, Search, Menu, X, LogOut, Package, Clock, TrendingUp } from "lucide-react" // THÊM Clock, TrendingUp
import { useSearchSuggestions } from "../hooks/useProducts" 
import { formatPrice } from "../utils/formatters" 
import useOutsideClick from "../hooks/useOutsideClick" // Đảm bảo bạn đã tạo hook này

// DỮ LIỆU MOCK (Giả lập) cho "Lịch sử" và "Xu hướng"
const MOCK_HISTORY = ["Laptop Dell", "Macbook Pro M3", "Laptop Gaming cũ", "ASUS Vivobook"]
const MOCK_TRENDING = [
  { name: "Macbook Pro M5", link: "/?search=Macbook+Pro+M5" },
  { name: "Laptop Gaming RTX 4070", link: "/?search=Gaming+RTX+4070" },
  { name: "Dell XPS", link: "/?search=Dell+XPS" },
  { name: "Laptop dưới 15 triệu", link: "/?minPrice=0&maxPrice=15000000" },
]


export default function Header() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useSelector((state) => state.auth)
  const { items } = useSelector((state) => state.cart)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchFocused, setIsSearchFocused] = useState(false) 
  
  // Hook tìm kiếm gợi ý (chỉ chạy khi có query)
  const { data: suggestions, isLoading: isLoadingSuggestions } = useSearchSuggestions(searchQuery)

  const searchContainerRef = useRef(null)
  useOutsideClick(searchContainerRef, () => {
    setIsSearchFocused(false)
  })


  const cartItemsCount = items.reduce((total, item) => total + item.quantity, 0)

  const handleLogout = () => {
    dispatch(logout())
    navigate("/")
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/?search=${searchQuery}`)
      setIsSearchFocused(false)
    }
  }
  
  const handleSuggestionClick = (slug) => {
      navigate(`/products/${slug}`)
      setSearchQuery("")
      setIsSearchFocused(false)
  }

  // LOGIC HIỂN THỊ DROPDOWN
  const shouldShowDropdown = isSearchFocused;
  const isSearchEmpty = searchQuery.trim().length < 2;


  // Phần render nội dung cho dropdown khi KHÔNG có query
  const renderEmptySearchContent = () => (
    <div className="p-4 space-y-4">
      {/* Lịch sử tìm kiếm (MOCK) */}
      <div>
        <div className="flex items-center justify-between text-xs font-medium text-gray-500 mb-2">
            <span className="flex items-center gap-1"><Clock className="w-4 h-4"/> Lịch sử tìm kiếm (Mock)</span>
            <button className="text-red-500 hover:text-red-700">Xóa tất cả</button>
        </div>
        <div className="space-y-1">
            {MOCK_HISTORY.map((item, index) => (
                <button
                    key={index}
                    onClick={() => { setSearchQuery(item); navigate(`/?search=${item}`); setIsSearchFocused(false); }}
                    className="w-full text-left p-2 rounded-md hover:bg-gray-100 text-sm"
                >
                    {item}
                </button>
            ))}
        </div>
      </div>

      {/* Xu hướng tìm kiếm (MOCK) */}
      <div>
        <p className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-2"><TrendingUp className="w-4 h-4"/> Xu hướng tìm kiếm (Mock)</p>
        <div className="grid grid-cols-2 gap-2">
            {MOCK_TRENDING.map((item, index) => (
                <Link
                    key={index}
                    to={item.link}
                    onClick={() => { setIsSearchFocused(false); }}
                    className="p-2 rounded-md hover:bg-gray-100 text-sm font-medium text-blue-600 truncate"
                >
                    {item.name}
                </Link>
            ))}
        </div>
      </div>
    </div>
  )

  // Phần render nội dung cho dropdown khi CÓ query (Live Search)
  const renderLiveSearchContent = () => (
    <div className="bg-white rounded-lg shadow-xl z-50 overflow-hidden">
        {isLoadingSuggestions ? (
            <div className="p-4 text-center text-gray-500">Đang tìm kiếm...</div>
        ) : suggestions?.products?.length > 0 ? (
            <div className="divide-y divide-gray-100">
                {suggestions.products.map((p) => (
                    <button
                        key={p.product_id}
                        onClick={() => handleSuggestionClick(p.slug)}
                        className="w-full text-left flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors"
                    >
                        <img 
                            src={p.images?.[0]?.image_url || p.thumbnail_url || "/placeholder.svg"} 
                            alt={p.product_name} 
                            className="w-10 h-10 object-cover rounded" 
                        />
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-800 truncate">{p.product_name}</div>
                            <div className="text-xs font-semibold text-blue-600">
                              {formatPrice(Number(p.variations?.[0]?.price || p.base_price) * (1 - Number(p.discount_percentage || 0) / 100))}
                            </div>
                        </div>
                    </button>
                ))}
                <Link 
                    to={`/?search=${searchQuery}`} 
                    onClick={() => setIsSearchFocused(false)}
                    className="block p-3 text-center text-blue-600 hover:bg-blue-50 text-sm font-medium border-t"
                >
                    Xem tất cả kết quả cho "{searchQuery}"
                </Link>
            </div>
        ) : (
            <div className="p-4 text-center text-gray-500">Không tìm thấy sản phẩm nào.</div>
        )}
    </div>
  )


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

            {/* Form Tìm kiếm (Desktop) */}
            <form onSubmit={handleSearch} className="hidden md:flex items-center" ref={searchContainerRef}>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm kiếm laptop..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  className="w-96 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                
                {/* DROPDOWN GỢI Ý */}
                {shouldShowDropdown && (
                    <div className="absolute top-full mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
                        {isSearchEmpty ? renderEmptySearchContent() : renderLiveSearchContent()}
                    </div>
                )}
              </div>
            </form>
          </div>

          <nav className="hidden md:flex items-center gap-6">
             {/* ... Menu Desktop */}
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

        {/* Menu Mobile */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            {/* Form Tìm kiếm (Mobile) - Cần thêm logic dropdown tương tự nếu muốn */}
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
              {/* ... Menu Mobile */}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}