"use client"

import { useState } from "react"
import { useProducts } from "../hooks/useProducts"
import ProductCard from "../components/ProductCard"
import ProductFilter from "../components/ProductFilter"
import LoadingSpinner from "../components/LoadingSpinner"
import { ChevronLeft, ChevronRight } from "lucide-react"

export default function HomePage() {
  const [filters, setFilters] = useState({
    brands: [],
    categories: [],
    price: { min: "", max: "" },
    page: 1,
    limit: 12,
  })

  const { data, isLoading, error } = useProducts(filters)

  const handleFilterChange = (newFilters) => {
    setFilters({ ...newFilters, page: 1 })
  }

  const handleClearFilters = () => {
    setFilters({
      brands: [],
      categories: [],
      price: { min: "", max: "" },
      page: 1,
      limit: 12,
    })
  }

  const handlePageChange = (newPage) => {
    setFilters({ ...filters, page: newPage })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center text-red-600">Có lỗi xảy ra khi tải sản phẩm. Vui lòng thử lại sau.</div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-balance">Laptop Chất Lượng Cao</h1>
          <p className="text-xl text-blue-100 text-pretty">
            Tìm chiếc laptop hoàn hảo cho công việc và giải trí của bạn
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="lg:col-span-1">
            <ProductFilter filters={filters} onFilterChange={handleFilterChange} onClearFilters={handleClearFilters} />
          </aside>

          <main className="lg:col-span-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Tất cả sản phẩm</h2>
                  <p className="text-gray-600">{data?.total || 0} sản phẩm</p>
                </div>

                {data?.products?.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="text-gray-600 text-lg">Không tìm thấy sản phẩm nào phù hợp</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {data?.products?.map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>

                    {data?.totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-8">
                        <button
                          onClick={() => handlePageChange(filters.page - 1)}
                          disabled={filters.page === 1}
                          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>

                        {[...Array(data.totalPages)].map((_, i) => (
                          <button
                            key={i + 1}
                            onClick={() => handlePageChange(i + 1)}
                            className={`px-4 py-2 rounded-lg ${
                              filters.page === i + 1
                                ? "bg-blue-600 text-white"
                                : "border border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            {i + 1}
                          </button>
                        ))}

                        <button
                          onClick={() => handlePageChange(filters.page + 1)}
                          disabled={filters.page === data.totalPages}
                          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
