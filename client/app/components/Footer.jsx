import { Link } from "react-router-dom"
import { Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin } from "lucide-react"

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">L</span>
              </div>
              <span className="text-xl font-bold text-white">LaptopStore</span>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Cửa hàng laptop uy tín, chất lượng cao với giá tốt nhất thị trường.
            </p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-blue-500">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-blue-500">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-blue-500">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-blue-500">
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Sản phẩm</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/?category=gaming" className="hover:text-blue-500">
                  Laptop Gaming
                </Link>
              </li>
              <li>
                <Link to="/?category=office" className="hover:text-blue-500">
                  Laptop Văn phòng
                </Link>
              </li>
              <li>
                <Link to="/?category=design" className="hover:text-blue-500">
                  Laptop Đồ họa
                </Link>
              </li>
              <li>
                <Link to="/?category=student" className="hover:text-blue-500">
                  Laptop Sinh viên
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Hỗ trợ</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/about" className="hover:text-blue-500">
                  Về chúng tôi
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-blue-500">
                  Liên hệ
                </Link>
              </li>
              <li>
                <Link to="/warranty" className="hover:text-blue-500">
                  Chính sách bảo hành
                </Link>
              </li>
              <li>
                <Link to="/shipping" className="hover:text-blue-500">
                  Chính sách vận chuyển
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Liên hệ</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>123 Đường ABC, Quận 1, TP.HCM</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-5 h-5 flex-shrink-0" />
                <span>1900 1234</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-5 h-5 flex-shrink-0" />
                <span>support@laptopstore.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>&copy; 2025 LaptopStore. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
