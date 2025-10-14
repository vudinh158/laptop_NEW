import { Link } from "react-router-dom"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, ShoppingCart } from "lucide-react"

// Đã loại bỏ TypeScript interface
export function ProductCard({ product }) {
  const displayPrice = product.salePrice || product.defaultPrice
  const hasDiscount = product.salePrice && product.salePrice < product.defaultPrice
  const discountPercent = hasDiscount
    ? Math.round(((product.defaultPrice - product.salePrice) / product.defaultPrice) * 100)
    : 0

  return (
    <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300">
      <Link to={`/products/${product.slug}`}> {/* FIX: href -> to */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {/* FIX: Sử dụng thẻ img chuẩn thay cho Next.js Image. Đã thay props fill bằng CSS inline để mô phỏng */}
          <img
            src={product.thumbnailUrl || "/placeholder.svg"}
            alt={product.name}
            // Các class và style để mô phỏng object-fit: cover và position: fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            style={{ position: 'absolute', width: '100%', height: '100%' }} 
          />
          {hasDiscount && (
            <Badge className="absolute top-3 right-3 bg-accent text-accent-foreground">-{discountPercent}%</Badge>
          )}
        </div>
      </Link>
      <CardContent className="p-4">
        <Link to={`/products/${product.slug}`}> {/* FIX: href -> to */}
          <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center gap-1 mb-3">
          <Star className="h-4 w-4 fill-warning text-warning" />
          <span className="font-medium">{product.ratingAverage.toFixed(1)}</span>
          <span className="text-sm text-muted-foreground">({product.reviewCount})</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-primary">{displayPrice.toLocaleString("vi-VN")}₫</span>
          {hasDiscount && (
            <span className="text-sm text-muted-foreground line-through">
              {product.defaultPrice.toLocaleString("vi-VN")}₫
            </span>
          )}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button className="w-full" size="lg">
          <ShoppingCart className="mr-2 h-5 w-5" />
          Thêm vào giỏ
        </Button>
      </CardFooter>
    </Card>
  )
}