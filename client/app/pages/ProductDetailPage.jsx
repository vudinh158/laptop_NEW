"use client"

import { useState } from "react"
import { useParams } from "react-router-dom"
import { useDispatch } from "react-redux"
import { useProduct, useRecommendedProducts } from "../hooks/useProducts"
import { addItem } from "../store/slices/cartSlice"
import ProductCard from "../components/ProductCard"
import LoadingSpinner from "../components/LoadingSpinner"
import { Star, ShoppingCart, Truck, Shield, RefreshCw } from "lucide-react"
import { formatPrice } from "../utils/formatters"

export default function ProductDetailPage() {
  const { id } = useParams() // ID này là product_id hoặc slug
  const dispatch = useDispatch()
  const { data: productData, isLoading, error } = useProduct(id) // Lấy productData
  const product = productData?.product; // Trích xuất object product
  
  // FIX: Truyền ID sản phẩm thực tế cho recommended products
  const { data: recommended } = useRecommendedProducts(product?.product_id) 

  const [selectedVariation, setSelectedVariation] = useState(null)
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)

  const handleAddToCart = () => {
    if (!selectedVariation || !product) return

    dispatch(
      addItem({
        // FIX: Sử dụng product_id và variation_id
        product_id: product.product_id, 
        variation_id: selectedVariation.variation_id, 
        quantity,
        product: {
          ...product,
          variation: selectedVariation,
        },
      }),
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center text-red-600">Không tìm thấy sản phẩm</div>
      </div>
    )
  }

  // FIX: Sử dụng thuộc tính product_id, product_name
  const currentVariation = selectedVariation || product.variations?.[0]
  const price = Number(currentVariation?.price) || 0
  const discount = Number(product.discount_percentage || 0)
  const finalPrice = price * (1 - discount / 100)
  const productName = product.product_name; // Lấy tên sản phẩm

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
                <img
                  // FIX: Truy cập images và thumbnail_url
                  src={
                    product.images?.[selectedImage]?.image_url || product.thumbnail_url || "/placeholder.svg"
                  }
                  alt={productName}
                  className="w-full h-full object-cover"
                />
              </div>

              {product.images?.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {product.images.map((image, index) => (
                    <button
                      key={image.image_id} // FIX: Sử dụng image_id làm key
                      onClick={() => setSelectedImage(index)}
                      className={`aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 ${
                        selectedImage === index ? "border-blue-600" : "border-transparent"
                      }`}
                    >
                      <img
                        src={image.image_url || "/placeholder.svg"}
                        alt={`${productName} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4 text-balance">{productName}</h1> {/* FIX: Hiển thị productName */}

              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.floor(product.rating_average || 0) // FIX: Dùng rating_average
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-gray-600">({product.review_count || 0} đánh giá)</span>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-4xl font-bold text-blue-600">{formatPrice(finalPrice)}</span>
                  {discount > 0 && (
                    <>
                      {/* Giá gốc hiển thị base_price */}
                      <span className="text-xl text-gray-400 line-through">{formatPrice(price)}</span> 
                      <span className="px-2 py-1 bg-orange-500 text-white rounded-md text-sm font-semibold">
                        -{discount}%
                      </span>
                    </>
                  )}
                </div>
              </div>

              {product.variations?.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Cấu hình:</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {product.variations.map((variation) => (
                      <button
                        key={variation.variation_id} // FIX: Sử dụng variation_id làm key
                        onClick={() => setSelectedVariation(variation)}
                        className={`p-3 border-2 rounded-lg text-left ${
                          currentVariation?.variation_id === variation.variation_id // FIX: So sánh variation_id
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="font-medium text-gray-900">
                          {variation.processor} / {variation.ram} / {variation.storage}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {formatPrice(Number(variation.price) * (1 - (Number(product.discount_percentage) || 0) / 100))}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Số lượng:</h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number.parseInt(e.target.value) || 1))}
                    className="w-20 h-10 text-center border border-gray-300 rounded-lg"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={!currentVariation}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
              >
                <ShoppingCart className="w-5 h-5" />
                <span className="font-semibold">Thêm vào giỏ hàng</span>
              </button>

              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-200">
                <div className="flex flex-col items-center text-center">
                  <Truck className="w-8 h-8 text-blue-600 mb-2" />
                  <span className="text-sm text-gray-600">Miễn phí vận chuyển</span>
                </div>
                <div className="flex flex-col items-center text-center">
                  <Shield className="w-8 h-8 text-blue-600 mb-2" />
                  <span className="text-sm text-gray-600">Bảo hành 12 tháng</span>
                </div>
                <div className="flex flex-col items-center text-center">
                  <RefreshCw className="w-8 h-8 text-blue-600 mb-2" />
                  <span className="text-sm text-gray-600">Đổi trả 7 ngày</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Mô tả sản phẩm</h2>
            <div className="prose max-w-none text-gray-700">
              {product.description || "Chưa có mô tả cho sản phẩm này."}
            </div>
          </div>
        </div>
        {/* ... (Phần Recommended Products giữ nguyên) */}
        {recommended?.products?.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Sản phẩm tương tự</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recommended.products.map((product) => (
                <ProductCard key={product.product_id} product={product} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}