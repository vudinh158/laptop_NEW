"use client";

import { useState, useMemo } from "react";
// THÊM: useSearchParams để đọc URL query string
import { useSearchParams } from "react-router-dom"; 
import { useProducts, customerUseBrands, customerUseCategories } from "../hooks/useProducts"
import ProductCard from "../components/ProductCard";
import ProductFilter from "../components/ProductFilter";
import LoadingSpinner from "../components/LoadingSpinner";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function HomePage() {
  // BƯỚC 1: Đọc tham số search từ URL
  const [searchParams] = useSearchParams();
  const urlSearchQuery = searchParams.get("search") || "";

  // BƯỚC 2: Khởi tạo/Cập nhật filters dựa trên URL và state
  const [localFilters, setLocalFilters] = useState({
    brand_id: [],
    category_id: [],
    minPrice: "",
    maxPrice: "",
    page: 1,
    limit: 30,
  });

  // Gộp filters: localFilters luôn có ưu tiên cao hơn, nhưng urlSearchQuery
  // được dùng để khởi tạo và đồng bộ với Header search.
  const filters = useMemo(() => ({
    ...localFilters,
    search: urlSearchQuery,
  }), [localFilters, urlSearchQuery]);


  const { data: brandsData } = customerUseBrands();
  const { data: categoriesData } = customerUseCategories();

  // Gọi API với filters đã được đồng bộ
  const { data, isLoading, error } = useProducts(filters);

  const handleFilterChange = (newFilters) => {
    // SỬA: Đảm bảo chỉ cập nhật các giá trị đã thay đổi và reset page
    setLocalFilters((prev) => ({
      ...prev,
      ...newFilters,
      page: 1,
    }));
  };

  const handleClearFilters = () => {
    // Để giữ lại URL search query, chỉ reset các localFilters
    setLocalFilters({
      brand_id: [],
      category_id: [],
      minPrice: "",
      maxPrice: "",
      page: 1,
      limit: 30,
    });
    // LƯU Ý: Nếu muốn xóa luôn thanh search URL, cần dùng setSearchParams
    // navigate("/", { replace: true });
  };

  const handlePageChange = (newPage) => {
    setLocalFilters({ ...localFilters, page: newPage });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center text-red-600">
          Có lỗi xảy ra khi tải sản phẩm. Vui lòng thử lại sau.
        </div>
      </div>
    );
  }

  const products = data?.products ?? [];
  const total = data?.total ?? products.length;
  const totalPages =
    data?.totalPages ?? Math.max(1, Math.ceil(total / (filters.limit || 30)));

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-balance">
            Laptop LÊ SƠN
          </h1>
          <p className="text-xl text-blue-100 text-pretty">
            Tìm chiếc laptop hoàn hảo cho công việc và giải trí của bạn
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="lg:col-span-1">
            <ProductFilter
              brands={brandsData?.data ?? brandsData ?? []}
              categories={categoriesData?.data ?? categoriesData ?? []}
              filters={{
                brands: localFilters.brand_id,
                categories: localFilters.category_id,
                price: { min: localFilters.minPrice, max: localFilters.maxPrice },
                // Luôn hiển thị search query đang hoạt động
                search: urlSearchQuery, 
              }}
              onFilterChange={(f) =>
                handleFilterChange({
                  brand_id: f.brands,
                  category_id: f.categories,
                  minPrice: f.price?.min ?? "",
                  maxPrice: f.price?.max ?? "",
                  // KHÔNG THAY ĐỔI URL search query TỪ BỘ LỌC
                  // search: f.search ?? "", 
                })
              }
              onClearFilters={handleClearFilters}
            />
          </aside>

          <main className="lg:col-span-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Tất cả sản phẩm
                    {urlSearchQuery && <span className="text-blue-600 ml-2">({urlSearchQuery})</span>}
                  </h2>
                  <p className="text-gray-600">
                    {data?.products.length || 0} sản phẩm
                  </p>
                </div>

                {data?.products?.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="text-gray-600 text-lg">
                      Không tìm thấy sản phẩm nào phù hợp
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {products.map((p) => (
                        // ✅ key ổn định (fallback sang id/slug nếu cần)
                        <ProductCard
                          key={p.product_id ?? p.id ?? p.slug}
                          product={p}
                        />
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
  );
}