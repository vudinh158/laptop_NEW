import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "../services/api"

export function useProducts(filters = {}) {
  return useQuery({
    queryKey: ["products", filters],
    queryFn: async () => {
      const params = new URLSearchParams()

      if (filters.search) params.append("search", filters.search)
      if (filters.category) params.append("category", filters.category)
      if (filters.brand) params.append("brand", filters.brand)
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

export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (productData) => {
      const { data } = await api.post("/admin/products", productData)
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
      const { data } = await api.put(`/admin/products/${id}`, productData)
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["product", variables.id] })
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
