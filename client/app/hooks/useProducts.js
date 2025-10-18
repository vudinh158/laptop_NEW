import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api, { adminAPI } from "../services/api"

export function useProducts(filters = {}) {
  return useQuery({
    queryKey: ["products", filters],
    queryFn: async () => {
      const params = new URLSearchParams()

      if (filters.search) params.append("search", filters.search) 
      if (filters.category_id) params.append("category_id", filters.category_id) // Sửa category -> category_id
      if (filters.brand_id) params.append("brand_id", filters.brand_id)
      if (filters.minPrice) params.append("min_price", filters.minPrice)
      if (filters.maxPrice) params.append("max_price", filters.maxPrice)
      if (filters.page) params.append("page", filters.page)
      if (filters.limit) params.append("limit", filters.limit)

      const { data } = await api.get(`/products?${params.toString()}`)
      return data
    },
  })
}

export function useProduct(id) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data } = await api.get(`/products/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useRecommendedProducts(productId) {
  return useQuery({
    queryKey: ["recommended-products", productId],
    queryFn: async () => {
      const { data } = await api.get(`/products/${productId}/recommendations`)
      return data
    },
    enabled: !!productId,
  })
}

// category

export function useAdminCategories() {
  return useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data } = await adminAPI.getCategories()
      return data
    },
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (categoryData) => {
      const { data } = await adminAPI.createCategory(categoryData)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] })
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...categoryData }) => {
      const { data } = await adminAPI.updateCategory(id, categoryData)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      const { data } = await adminAPI.deleteCategory(id)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] })
    },
  })
}

export function useCategories() {
  return useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      // Dùng public API route vì nó trả về danh sách đầy đủ
      const { data } = await api.get("/products/categories") 
      return data
    },
    staleTime: Infinity, 
  })
}

export function useBrands() {
  return useQuery({
    queryKey: ["admin-brands"],
    queryFn: async () => {
      // API endpoint: /products/brands
      const { data } = await api.get("/products/brands")
      return data
    },
    staleTime: Infinity, // Dữ liệu ít thay đổi, có thể cache lâu hơn
  })
}

export function useAdminProduct(id) {
  return useQuery({
    queryKey: ["admin-product", id],
    queryFn: async () => {
      // Dùng API getProductDetail hiện có, giả định nó trả về đủ data cho form
      const { data } = await api.get(`/products/${id}`) 
      return data
    },
    // Chỉ chạy query nếu ID có giá trị
    enabled: !!id, 
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (productData) => {
      const { data } = await adminAPI.createProduct(productData)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...productData }) => {
      // Dùng adminAPI.updateProduct
      const { data } = await adminAPI.updateProduct(id, productData) 
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["admin-product", variables.id] }) // Cập nhật cache Admin
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/admin/products/${id}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
    },
  })
}
