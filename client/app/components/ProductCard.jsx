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
          product_id: product.id,
          variation_id: defaultVariation.id,
          quantity: 1,
          product: {
            ...product,
            variation: defaultVariation,
          },
        }),
      )
    }
  }

  const defaultVariation = product.variations?.[0]
  const price = defaultVariation?.price || 0
  const discount = defaultVariation?.discount_percentage || 0
  const finalPrice = price * (1 - discount / 100)
  const imageUrl = product.images?.[0]?.image_url || "/modern-laptop-workspace.png"

  return (
    <Link to={`/products/${product.id}`} className="group">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          <img
            src={imageUrl || "/placeholder.svg"}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {discount > 0 && (
            <div className="absolute top-2 right-2 bg-orange-500 text-white px-2 py-1 rounded-md text-sm font-semibold">
              -{discount}%
            </div>
          )}
        </div>

        <div className="p-4">
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600">{product.name}</h3>

          <div className="flex items-center gap-1 mb-2">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.floor(product.average_rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-gray-600">({product.review_count || 0})</span>
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
