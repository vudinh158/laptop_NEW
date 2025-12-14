import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "../services/api"

// export function useOrders() {
//   return useQuery({
//     queryKey: ["orders"],
//     queryFn: async () => {
//       const { data } = await api.get("/orders")
//       return data
//     },
//   })
// }

export function useOrders(params) {
  return useQuery({
    queryKey: ["orders", params], // cache theo tab/page/q/sort
    queryFn: async () => {
      const { data } = await api.get("/orders", { params });
      return data;
    },
    keepPreviousData: true,
  });
}

export function useOrder(id) {
  return useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const { data } = await api.get(`/orders/${id}/slim`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const body = { ...payload };
      if (Array.isArray(body.items) && body.items.length === 0) delete body.items;
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const { data } = await api.post("/orders", body, { headers });
      return data; // { message, order, redirect? }
    },
    onSuccess: () => {
      // Cho chắc, refetch lại giỏ (BE đã xoá những món đã tick)
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["order-counters"] });
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

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, reason }) => {
      const { data } = await api.post(`/orders/${orderId}/cancel`, { reason });
      return data;
    },
    onSuccess: () => {
      // làm tươi mọi thứ liên quan
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order"] });
      qc.invalidateQueries({ queryKey: ["cart"] });
      qc.invalidateQueries({ queryKey: ["order-counters"] });
    },
  });
}

export function useRetryVnpayPayment({ autoRedirect = true } = {}) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, method = "VNPAYQR" }) => {
      // method có thể là: "VNPAYQR" | "VNBANK" | "INTCARD"
      const { data } = await api.post(`/orders/${orderId}/payments/retry`, { method });
      return data; // { redirect, order_id, txn_ref, expires_at }
    },
    onSuccess: (data, variables) => {
      // Làm tươi list và chi tiết đơn
      qc.invalidateQueries({ queryKey: ["orders"] });
      if (variables?.orderId) qc.invalidateQueries({ queryKey: ["order", variables.orderId] });
      qc.invalidateQueries({ queryKey: ["order-counters"] });

      // Tự redirect sang trang thanh toán nếu có link
      if (data?.redirect && autoRedirect) {
        window.location.assign(data.redirect);
      }
    },
  });
}

export function useOrderCounters() {
  return useQuery({
    queryKey: ["order-counters"],
    queryFn: async () => {
      const { data } = await api.get("/orders/counters");
      return data; // { all, awaiting_payment, processing, to_ship, shipping, delivered, cancelled, failed }
    },
    staleTime: 30_000,
  });
}

export function useChangePaymentMethod({ autoRedirect = true } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, provider, method }) => {
      const { data } = await api.post(`/orders/${orderId}/payment-method`, {
        provider,
        method,
      });
      return data; // { message, order: {…}, payment: {…}, redirect? }
    },
    onSuccess: (data, variables) => {
      // refetch lại chi tiết đơn, list đơn, counters
      if (variables?.orderId) {
        qc.invalidateQueries({ queryKey: ["order", variables.orderId] });
      }
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order-counters"] });

      // Nếu chuyển sang VNPAY có redirect thì nhảy luôn
      if (data?.redirect && autoRedirect) {
        window.location.assign(data.redirect);
      }
    },
  });
}

export function useUpdateShippingAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, payload }) => {
      const { data } = await api.put(
        `/orders/${orderId}/shipping-address`,
        payload
      );
      return data; // { message, order: { … } }
    },
    onSuccess: (data, variables) => {
      if (variables?.orderId) {
        qc.invalidateQueries({ queryKey: ["order", variables.orderId] });
      }
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order-counters"] });
    },
  });
}
