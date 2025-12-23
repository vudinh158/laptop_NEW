import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import { setCart, clearCart } from "../store/slices/cartSlice";
import api from "../services/api";

export function useGetCart() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useSelector((s) => s.auth);

  // Invalidate cart cache khi user thay đổi
  useEffect(() => {
    if (user?.user_id) {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    }
  }, [user?.user_id, queryClient]);

  return useQuery({
    queryKey: ["cart", user?.user_id], // cache theo user_id
    queryFn: async () => {
      const { data } = await api.get("/cart");
      dispatch(setCart(data.cart));
      return data.cart;
    },
    staleTime: 60_000,
    enabled: !!isAuthenticated && !!localStorage.getItem("token") && !!user?.user_id,
    retry: false,
    onError: (err) => {
      // Nếu 401 hoặc không có token, dọn giỏ hàng trên FE
      const status = err?.response?.status;
      const msg = err?.response?.data?.message;
      const isLegacyInvalidToken403 =
        status === 403 &&
        (msg === "Invalid or expired token" || msg === "Access token required");

      if (status === 401 || isLegacyInvalidToken403 || !localStorage.getItem("token")) {
        dispatch(clearCart());
      }
    },
  });
}

export function useAddToCart() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { user } = useSelector((s) => s.auth);
  return useMutation({
    mutationFn: async ({ variation_id, quantity }) => {
      const { data } = await api.post("/cart", { variation_id, quantity });
      return data;
    },
    onSuccess: (data) => {
      dispatch(setCart(data.cart));
      queryClient.invalidateQueries({ queryKey: ["cart", user?.user_id] });
    },
  });
}

export function useUpdateCartItem() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { user } = useSelector((s) => s.auth);
  return useMutation({
    mutationFn: async ({ itemId, quantity }) => {
      const { data } = await api.put(`/cart/${itemId}`, { quantity });
      return data;
    },
    onSuccess: (data) => {
      dispatch(setCart(data.cart));
      queryClient.invalidateQueries({ queryKey: ["cart", user?.user_id] });
    },
  });
}

export function useRemoveFromCart() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { user } = useSelector((s) => s.auth);
  return useMutation({
    mutationFn: async (itemId) => {
      const { data } = await api.delete(`/cart/${itemId}`);
      return data;
    },
    onSuccess: (data) => {
      dispatch(setCart(data.cart));
      queryClient.invalidateQueries({ queryKey: ["cart", user?.user_id] });
    },
  });
}
