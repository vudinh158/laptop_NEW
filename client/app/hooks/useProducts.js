// client/app/hooks/useProducts.js
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { adminAPI } from "../services/api";

// --- Helpers: chuẩn hóa object về { id, name } ---
const mapBrand = (b) => ({
  id: Number(b?.brand_id ?? b?.id),
  name: b?.brand_name ?? b?.name ?? "",
});
const mapCategory = (c) => ({
  id: Number(c?.category_id ?? c?.id),
  name: c?.category_name ?? c?.name ?? "",
});

export function useProducts(filters = {}) {
  return useQuery({
    queryKey: ["products", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      // Chức năng cốt lõi: Gửi giá trị search tới API
      if (filters.search) params.append("search", filters.search);
      
      // brand_id & category_id là MẢNG → join thành "1,2,3"
      if (Array.isArray(filters.category_id) && filters.category_id.length)
        params.append("category_id", filters.category_id.join(","));
      if (Array.isArray(filters.brand_id) && filters.brand_id.length)
        params.append("brand_id", filters.brand_id.join(","));
      if (filters.minPrice) params.append("min_price", filters.minPrice);
      if (filters.maxPrice) params.append("max_price", filters.maxPrice);
      if (filters.page) params.append("page", filters.page);
      if (filters.limit) params.append("limit", filters.limit);

      const { data } = await api.get(`/products?${params.toString()}`);
      return data;
    },
  });
}

export function useProductsV2(filters = {}) {
  return useQuery({
    queryKey: ["products-v2", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.append("search", filters.search);
      if (Array.isArray(filters.category_id) && filters.category_id.length)
        params.append("category_id", filters.category_id.join(","));
      if (Array.isArray(filters.brand_id) && filters.brand_id.length)
        params.append("brand_id", filters.brand_id.join(","));
      if (filters.minPrice) params.append("min_price", filters.minPrice);
      if (filters.maxPrice) params.append("max_price", filters.maxPrice);

      if (filters.sortBy) params.append("sort_by", filters.sortBy);

      if (Array.isArray(filters.processor) && filters.processor.length)
        params.append("processor", filters.processor.join(","));
      if (Array.isArray(filters.ram) && filters.ram.length)
        params.append("ram", filters.ram.join(","));
      if (Array.isArray(filters.storage) && filters.storage.length)
        params.append("storage", filters.storage.join(","));
      if (Array.isArray(filters.graphics_card) && filters.graphics_card.length)
        params.append("graphics_card", filters.graphics_card.join(","));
      if (Array.isArray(filters.screen_size) && filters.screen_size.length)
        params.append("screen_size", filters.screen_size.join(","));
      if (filters.minWeight != null && filters.minWeight !== "")
        params.append("min_weight", filters.minWeight);
      if (filters.maxWeight != null && filters.maxWeight !== "")
        params.append("max_weight", filters.maxWeight);

      if (filters.page) params.append("page", filters.page);
      if (filters.limit) params.append("limit", filters.limit);

      const { data } = await api.get(`/products/v2?${params.toString()}`);
      return data;
    },
  });
}

export function useProductFacets() {
  return useQuery({
    queryKey: ["product-facets"],
    queryFn: async () => {
      const { data } = await api.get("/products/facets");
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useProduct(id) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data } = await api.get(`/products/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useSearchSuggestions(query) {
  return useQuery({
    // Sử dụng query làm key để cache riêng cho từng từ khóa
    queryKey: ["search-suggestions", query],
    queryFn: async () => {
      if (!query || query.length < 2) return { products: [] };
      // Gọi API search-suggestions đã cấu hình ở Backend
      const { data } = await api.get(`/products/search-suggestions?q=${query}`);
      return data;
    },
    enabled: !!query && query.length >= 2, // Chỉ chạy query nếu có từ 2 ký tự trở lên
    staleTime: 5 * 60 * 1000, // Có thể giữ cache lâu hơn cho gợi ý
  });
}

export function useRecommendedByVariation(variationId) {
  return useQuery({
    queryKey: ["reco-by-variation", variationId ?? "none"],
    queryFn: async () => {
      if (!variationId) {
        return { products: [], basedOn: { variationId: 0 }, source: "knn" };
      }
      const res = await api.get(`/products/variations/${variationId}/recommendations`);
      return res.data; // { products, basedOn, generated_at, source }
    },
    enabled: !!variationId,
    keepPreviousData: true,
    staleTime: 60 * 1000, // 1 phút
  });
}

// category

export function useAdminCategories() {
  return useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data } = await adminAPI.getCategories();
      return data;
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categoryData) => {
      const { data } = await adminAPI.createCategory(categoryData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...categoryData }) => {
      const { data } = await adminAPI.updateCategory(id, categoryData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const { data } = await adminAPI.deleteCategory(id);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      // Dùng public API route vì nó trả về danh sách đầy đủ
      const { data } = await api.get("/products/categories");
      return data;
    },
    staleTime: Infinity,
  });
}

// ✅ LẤY CATEGORIES (trả về mảng [{id, name}])
export function customerUseCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await api.get("/products/categories");
      const arr = data?.categories ?? data?.data ?? data ?? [];
      return arr.map(mapCategory);
    },
    staleTime: Infinity,
  });
}

export function useBrands() {
  return useQuery({
    queryKey: ["admin-brands"],
    queryFn: async () => {
      // API endpoint: /products/brands
      const { data } = await api.get("/products/brands");
      return data;
    },
    staleTime: Infinity, // Dữ liệu ít thay đổi, có thể cache lâu hơn
  });
}

export function customerUseBrands() {
  return useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const { data } = await api.get("/products/brands");
      const arr = data?.brands ?? data?.data ?? data ?? [];
      return arr.map(mapBrand);
    },
    staleTime: Infinity,
  });
}

export function useAdminProduct(id) {
  return useQuery({
    queryKey: ["admin-product", id],
    queryFn: async () => {
      // Dùng API getProductDetail hiện có, giả định nó trả về đủ data cho form
      const { data } = await api.get(`/products/${id}`);
      return data;
    },
    // Chỉ chạy query nếu ID có giá trị
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productData) => {
      const { data } = await adminAPI.createProduct(productData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...productData }) => {
      // Dùng adminAPI.updateProduct
      const { data } = await adminAPI.updateProduct(id, productData);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({
        queryKey: ["admin-product", variables.id],
      }); // Cập nhật cache Admin
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/admin/products/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}