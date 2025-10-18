"use client"

import { Link } from "react-router-dom"
import { ShoppingCart, Star } from "lucide-react"
import { useDispatch } from "react-redux"
import { addItem } from "../store/slices/cartSlice"
import { formatPrice } from "../utils/formatters"

export default function ProductCard({ product }) {
  const dispatch = useDispatch()

  const handleAddToCart = (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (product.variations && product.variations.length > 0) {
      const defaultVariation = product.variations[0]
      dispatch(
        addItem({
          // SỬA: Dùng product.product_id và defaultVariation.variation_id
          product_id: product.product_id,
          variation_id: defaultVariation.variation_id,
          quantity: 1,
          product: {
            ...product,
            variation: defaultVariation,
          },
        }),
      )
    }
  }

  const productId = product.product_id; 
  const productName = product.product_name; 

  const defaultVariation = product.variations?.[0]
  const price = defaultVariation?.price || 0
  // Lấy discount từ Product (base) hoặc Variation (nếu có)
  const discount = product.discount_percentage || defaultVariation?.discount_percentage || 0
  const finalPrice = price * (1 - discount / 100)
  
  // FIX HIỂN THỊ ẢNH: Lấy ảnh từ mảng images hoặc thumbnail_url
  const imageUrl = product.images?.[0]?.image_url || product.thumbnail_url || "/placeholder.svg" 

  // Dữ liệu rating hiện chưa được API trả về đầy đủ, sử dụng giá trị mock an toàn
  const average_rating = product.rating_average || 0; 
  const review_count = product.review_count || 0;

  return (
    // SỬA: Dùng productId cho Link
    <Link to={`/products/${productId}`} className="group"> 
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          <img
            src={imageUrl} // DÙNG URL ĐÃ FIX
            alt={productName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {discount > 0 && (
            <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded-md text-sm font-semibold">
              Giảm {Math.round(discount)}% {/* HIỂN THỊ % GIẢM */}
            </div>
          )}
        </div>

        <div className="p-4">
          {/* FIX HIỂN THỊ TÊN SẢN PHẨM */}
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600">{productName}</h3> 

          <div className="flex items-center gap-1 mb-2">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.floor(average_rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-gray-600">({review_count})</span>
          </div>

          <div className="mb-3">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-blue-600">{formatPrice(finalPrice)}</span>
              {discount > 0 && <span className="text-sm text-gray-400 line-through">{formatPrice(price)}</span>}
            </div>
          </div>

          <button
            onClick={handleAddToCart}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Thêm vào giỏ</span>
          </button>
        </div>
      </div>
    </Link>
  )
}
