"use client";

import { useState, useMemo } from "react";
// THÊM: useSearchParams để đọc URL query string
import { useSearchParams } from "react-router-dom"; 
import {
  useProducts,
  useProductsV2,
  useProductFacets,
  customerUseBrands,
  customerUseCategories,
} from "../hooks/useProducts"
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

  const [specFilters, setSpecFilters] = useState({
    processor: [],
    ram: [],
    storage: [],
    graphics_card: [],
    screen_size: [],
    minWeight: "",
    maxWeight: "",
  });

  const [sortBy, setSortBy] = useState("");

  // Gộp filters: localFilters luôn có ưu tiên cao hơn, nhưng urlSearchQuery
  // được dùng để khởi tạo và đồng bộ với Header search.
  const filters = useMemo(() => ({
    ...localFilters,
    search: urlSearchQuery,
  }), [localFilters, urlSearchQuery]);

  const v2Filters = useMemo(
    () => ({
      ...filters,
      sortBy,
      processor: specFilters.processor,
      ram: specFilters.ram,
      storage: specFilters.storage,
      graphics_card: specFilters.graphics_card,
      screen_size: specFilters.screen_size,
      minWeight: specFilters.minWeight,
      maxWeight: specFilters.maxWeight,
    }),
    [filters, sortBy, specFilters]
  );

  const { data: brandsData } = customerUseBrands();
  const { data: categoriesData } = customerUseCategories();

  // Gọi API với filters đã được đồng bộ
  const { data, isLoading, error } = useProductsV2(v2Filters);
  const { data: facetsData } = useProductFacets();

  const toggleInList = (list, value) => {
    if (!value) return list;
    return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
  };

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
    setSpecFilters({
      processor: [],
      ram: [],
      storage: [],
      graphics_card: [],
      screen_size: [],
      minWeight: "",
      maxWeight: "",
    });
    setSortBy("");
    // LƯU Ý: Nếu muốn xóa luôn thanh search URL, cần dùng setSearchParams
    // navigate("/", { replace: true });
  };

  const handlePageChange = (newPage) => {
    setLocalFilters({ ...localFilters, page: newPage });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const products = data?.products ?? [];
  const total = data?.total ?? products.length;
  const totalPages =
    data?.totalPages ?? Math.max(1, Math.ceil(total / (filters.limit || 30)));

  const facets = facetsData?.facets ?? {};
  const processors = facets.processor ?? [];
  const rams = facets.ram ?? [];
  const storages = facets.storage ?? [];
  const gpus = facets.graphics_card ?? [];
  const screens = facets.screen_size ?? [];

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

            <div className="bg-white rounded-lg border border-gray-200 p-4 mt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Cấu hình</h3>

              <div className="space-y-4">
                <div>
                  <div className="font-medium text-gray-900 mb-2">CPU</div>
                  <div className="space-y-2 max-h-40 overflow-auto">
                    {processors.map((v) => (
                      <label key={v} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={specFilters.processor.includes(v)}
                          onChange={() => {
                            setSpecFilters((prev) => ({
                              ...prev,
                              processor: toggleInList(prev.processor, v),
                            }));
                            setLocalFilters((prev) => ({ ...prev, page: 1 }));
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{v}</span>
                      </label>
                    ))}
                    {!processors.length && (
                      <div className="text-sm text-gray-500">Chưa có dữ liệu.</div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="font-medium text-gray-900 mb-2">RAM</div>
                  <div className="space-y-2 max-h-40 overflow-auto">
                    {rams.map((v) => (
                      <label key={v} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={specFilters.ram.includes(v)}
                          onChange={() => {
                            setSpecFilters((prev) => ({
                              ...prev,
                              ram: toggleInList(prev.ram, v),
                            }));
                            setLocalFilters((prev) => ({ ...prev, page: 1 }));
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{v}</span>
                      </label>
                    ))}
                    {!rams.length && <div className="text-sm text-gray-500">Chưa có dữ liệu.</div>}
                  </div>
                </div>

                <div>
                  <div className="font-medium text-gray-900 mb-2">SSD</div>
                  <div className="space-y-2 max-h-40 overflow-auto">
                    {storages.map((v) => (
                      <label key={v} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={specFilters.storage.includes(v)}
                          onChange={() => {
                            setSpecFilters((prev) => ({
                              ...prev,
                              storage: toggleInList(prev.storage, v),
                            }));
                            setLocalFilters((prev) => ({ ...prev, page: 1 }));
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{v}</span>
                      </label>
                    ))}
                    {!storages.length && (
                      <div className="text-sm text-gray-500">Chưa có dữ liệu.</div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="font-medium text-gray-900 mb-2">GPU</div>
                  <div className="space-y-2 max-h-40 overflow-auto">
                    {gpus.map((v) => (
                      <label key={v} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={specFilters.graphics_card.includes(v)}
                          onChange={() => {
                            setSpecFilters((prev) => ({
                              ...prev,
                              graphics_card: toggleInList(prev.graphics_card, v),
                            }));
                            setLocalFilters((prev) => ({ ...prev, page: 1 }));
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{v}</span>
                      </label>
                    ))}
                    {!gpus.length && <div className="text-sm text-gray-500">Chưa có dữ liệu.</div>}
                  </div>
                </div>

                <div>
                  <div className="font-medium text-gray-900 mb-2">Màn hình</div>
                  <div className="space-y-2 max-h-40 overflow-auto">
                    {screens.map((v) => (
                      <label key={v} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={specFilters.screen_size.includes(v)}
                          onChange={() => {
                            setSpecFilters((prev) => ({
                              ...prev,
                              screen_size: toggleInList(prev.screen_size, v),
                            }));
                            setLocalFilters((prev) => ({ ...prev, page: 1 }));
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{v}</span>
                      </label>
                    ))}
                    {!screens.length && (
                      <div className="text-sm text-gray-500">Chưa có dữ liệu.</div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="font-medium text-gray-900 mb-2">Weight (kg)</div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={specFilters.minWeight}
                      onChange={(e) => {
                        setSpecFilters((prev) => ({ ...prev, minWeight: e.target.value }));
                        setLocalFilters((prev) => ({ ...prev, page: 1 }));
                      }}
                      placeholder="Min"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      value={specFilters.maxWeight}
                      onChange={(e) => {
                        setSpecFilters((prev) => ({ ...prev, maxWeight: e.target.value }));
                        setLocalFilters((prev) => ({ ...prev, page: 1 }));
                      }}
                      placeholder="Max"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
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
                  <div className="flex items-center gap-3">
                    <select
                      value={sortBy}
                      onChange={(e) => {
                        setSortBy(e.target.value);
                        setLocalFilters((prev) => ({ ...prev, page: 1 }));
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                    >
                      <option value="">Sắp xếp</option>
                      <option value="price_asc">Giá tăng dần</option>
                      <option value="price_desc">Giá giảm dần</option>
                      <option value="newest">Mới nhất</option>
                      <option value="best_selling">Bán chạy</option>
                    </select>
                    <p className="text-gray-600">{data?.products.length || 0} sản phẩm</p>
                  </div>
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