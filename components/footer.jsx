import Link from "react-router-dom"
import { Facebook, Instagram, Youtube, Mail } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-muted/50 border-t mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="font-bold text-lg mb-4">LaptopStore</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Hệ thống bán lẻ laptop uy tín hàng đầu Việt Nam. Cam kết hàng chính hãng, giá tốt nhất.
            </p>
            <div className="flex gap-3">
              <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Facebook className="h-5 w-5" />
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Instagram className="h-5 w-5" />
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Youtube className="h-5 w-5" />
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Mail className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Products */}
          <div>
            <h3 className="font-bold text-lg mb-4">Sản phẩm</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/products?category=gaming"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Laptop Gaming
                </Link>
              </li>
              <li>
                <Link
                  href="/products?category=business"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Laptop Văn phòng
                </Link>
              </li>
              <li>
                <Link
                  href="/products?category=creative"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Laptop Đồ họa
                </Link>
              </li>
              <li>
                <Link
                  href="/products?category=student"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Laptop Sinh viên
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-bold text-lg mb-4">Hỗ trợ</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/warranty" className="text-muted-foreground hover:text-primary transition-colors">
                  Chính sách bảo hành
                </Link>
              </li>
              <li>
                <Link href="/shipping" className="text-muted-foreground hover:text-primary transition-colors">
                  Chính sách giao hàng
                </Link>
              </li>
              <li>
                <Link href="/return" className="text-muted-foreground hover:text-primary transition-colors">
                  Chính sách đổi trả
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-muted-foreground hover:text-primary transition-colors">
                  Câu hỏi thường gặp
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold text-lg mb-4">Liên hệ</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Hotline: 1900 xxxx</li>
              <li>Email: support@laptopstore.vn</li>
              <li>Địa chỉ: 123 Đường ABC, Quận 1, TP.HCM</li>
              <li>Giờ làm việc: 8:00 - 22:00 (Hàng ngày)</li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 LaptopStore. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
