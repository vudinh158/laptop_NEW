import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "../services/api"

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data } = await api.get("/orders")
      return data
    },
  })
}

export function useOrder(id) {
  return useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const { data } = await api.get(`/orders/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useCreateOrder() {
  return useMutation({
    // CHÍNH LÀ "mutationFn" BẮT BUỘC
    mutationFn: async (payload) => {
      // Nếu FE vô tình truyền items: [] rỗng → xoá hẳn field để BE hiểu là "thanh toán toàn bộ giỏ"
      const body = { ...payload };
      if (Array.isArray(body.items) && body.items.length === 0) {
        delete body.items;
      }

      // Lấy token (nếu backend yêu cầu Bearer)
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Quan trọng: KHÔNG gửi price/subtotal từ FE — BE tự tính
      const { data } = await api.post("/orders", body, { headers });
      return data; // { message, order, redirect? }
    },
  });
}

export function useAdminOrders() {
  return useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data } = await api.get("/admin/orders")
      return data
    },
  })
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ orderId, status }) => {
      const { data } = await api.put(`/admin/orders/${orderId}/status`, { status })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] })
      queryClient.invalidateQueries({ queryKey: ["orders"] })
    },
  })
}
