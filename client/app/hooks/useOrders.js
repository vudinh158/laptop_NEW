import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSelector } from "react-redux"
import { useEffect } from "react"
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
  const queryClient = useQueryClient();
  const { user } = useSelector(state => state.auth);

  // Invalidate orders cache khi user thay đổi
  useEffect(() => {
    if (user?.user_id) {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    }
  }, [user?.user_id, queryClient]);

  return useQuery({
    queryKey: ["orders", user?.user_id, params], // cache theo user_id + tab/page/q/sort
    queryFn: async () => {
      const { data } = await api.get("/orders", { params });
      return data;
    },
    keepPreviousData: true,
    enabled: !!user?.user_id, // chỉ chạy khi có user
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

export function useAdminOrders({ page = 1, limit = 20, status } = {}) {
  return useQuery({
    queryKey: ["admin-orders", page, limit, status],
    queryFn: async () => {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      if (status && status !== null && status !== undefined) {
        params.append('status', status);
      }
      const url = params.toString() ? `/admin/orders?${params}` : '/admin/orders';
      const { data } = await api.get(url);
      return data
    },
    staleTime: 0, // Always refetch to ensure fresh data
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
      queryClient.invalidateQueries({ queryKey: ["order-counters"] })
    },
  })
}

export function useShipOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ orderId }) => {
      const { data } = await api.post(`/admin/orders/${orderId}/ship`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] })
    },
  })
}

export function useDeliverOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ orderId }) => {
      const { data } = await api.post(`/admin/orders/${orderId}/deliver`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] })
    },
  })
}

export function useRefundOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ orderId }) => {
      const { data } = await api.post(`/admin/orders/${orderId}/refund`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] })
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

export function useAdminAnalytics({ period = "30" } = {}) {
  return useQuery({
    queryKey: ["admin-analytics", period],
    queryFn: async () => {
      const { data } = await api.get(`/admin/analytics/dashboard?period=${period}`)
      return data
    },
  })
}

export function useAdminOrderDetail(orderId) {
  return useQuery({
    queryKey: ["admin-order", orderId],
    queryFn: async () => {
      const { data } = await api.get(`/admin/orders/${orderId}`)
      return data
    },
    enabled: !!orderId,
  })
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
  const queryClient = useQueryClient();
  const { user } = useSelector(state => state.auth);

  // Invalidate order counters khi user thay đổi
  useEffect(() => {
    if (user?.user_id) {
      queryClient.invalidateQueries({ queryKey: ["order-counters"] });
    }
  }, [user?.user_id, queryClient]);

  return useQuery({
    queryKey: ["order-counters", user?.user_id], // Cache theo user_id để tránh leak data
    queryFn: async () => {
      const { data } = await api.get("/orders/counters");
      return data; // { all, awaiting_payment, processing, to_ship, shipping, delivered, cancelled, failed }
    },
    enabled: !!user?.user_id, // Chỉ chạy khi có user
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
      console.log('Calling updateShippingAddress API:', { orderId, payload });
      try {
        const { data } = await api.put(
          `/orders/${orderId}/shipping-address`,
          payload
        );
        console.log('updateShippingAddress API success:', data);
        return data; // { message, order: { … } }
      } catch (error) {
        console.error('updateShippingAddress API error:', error);
        throw error;
      }
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
