// hooks/useAuth.js
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import api, { authAPI } from "../services/api";
import { setCredentials, logout } from "../store/slices/authSlice";
import { clearCart } from "../store/slices/cartSlice";

// --- Helper: apply/remove Authorization header on axios instance ---
function setAuthHeader(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

// --------- AUTH HOOKS ---------

export function useRegister() {
  return useMutation({
    mutationFn: async (payload) => {
      // payload: { username, email, password, full_name, phone_number }
      const { data } = await authAPI.register(payload);
      return data;
    },
  });
}

export function useRegisterEmailVerification() {
  return useMutation({
    mutationFn: async (payload) => {
      // payload: { username, email, password, full_name, phone_number }
      const { data } = await authAPI.registerEmail(payload);
      return data;
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async ({ email }) => {
      const { data } = await authAPI.forgotPassword({ email });
      return data;
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async ({ token, password }) => {
      const { data } = await authAPI.resetPassword({ token, password });
      return data;
    },
  });
}

export function useLogin() {
  const dispatch = useDispatch();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ username, password }) => {
      const { data } = await authAPI.login({ username, password });
      return data;
    },
    onSuccess: (data) => {
      // data: { token, user, ... }
      setAuthHeader(data.token);
      localStorage.setItem("token", data.token);
      const roles =
        data?.user?.roles ||
        (data?.user?.Roles || []).map((r) => r.role_name) ||
        [];
      localStorage.setItem("roles", JSON.stringify(roles));
      dispatch(setCredentials({ token: data.token, user: data.user }));
      // Làm tươi lại info user nếu bạn đang dùng
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["currentUser"] });
      // NEW: cập nhật giỏ ngay sau login
      qc.invalidateQueries({ queryKey: ["cart"] });
      qc.refetchQueries({ queryKey: ["cart"] });
    },
  });
}

// Lấy user hiện tại (nếu cần hồi phục sau F5)
export function useMe(enabled = true) {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await authAPI.getCurrentUser();
      return data;
    },
    enabled,
    retry: false,
  });
}

export function useCurrentUser() {
  const dispatch = useDispatch();
  const qc = useQueryClient();

  return useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const { data } = await api.get("/auth/me");
      return data;
    },
    retry: false,
    onSuccess: (data) => {
      const roles =
        data?.user?.roles ||
        (data?.user?.Roles || []).map((r) => r.role_name) ||
        [];
      localStorage.setItem("roles", JSON.stringify(roles));
    },
    onError: (err) => {
      // Nếu token hết hạn/không hợp lệ → coi như logout “mềm”
      const status = err?.response?.status;
      const msg = err?.response?.data?.message;
      const isLegacyInvalidToken403 =
        status === 403 &&
        (msg === "Invalid or expired token" || msg === "Access token required");

      if (status === 401 || isLegacyInvalidToken403) {
        // gỡ header, xoá token, clear cart & auth
        setAuthHeader(null);
        localStorage.removeItem("token");
        localStorage.removeItem("roles");
        dispatch(clearCart());
        dispatch(logout());
        // dọn cache để không gọi lại cart/me
        qc.removeQueries({ queryKey: ["cart"] });
        qc.removeQueries({ queryKey: ["me"] });
        qc.removeQueries({ queryKey: ["currentUser"] });
      }
    },
  });
}

// Đăng xuất: dọn sạch mọi thứ phía client
export function useLogout() {
  const dispatch = useDispatch();
  const qc = useQueryClient();

  // Dùng function return (đơn giản) — nếu có endpoint /auth/logout, bạn có thể chuyển sang useMutation
  return () => {
    try {
      // 1) Gỡ token + header
      setAuthHeader(null);
      localStorage.removeItem("token");
      localStorage.removeItem("roles");

      // 2) Dọn Redux
      dispatch(clearCart());
      dispatch(logout());

      // 3) Dọn cache query để không tự fetch lại giỏ và orders
      qc.removeQueries({ queryKey: ["cart"] });
      qc.removeQueries({ queryKey: ["orders"] });
      qc.removeQueries({ queryKey: ["order-counters"] });
      qc.removeQueries({ queryKey: ["me"] });
      qc.removeQueries({ queryKey: ["currentUser"] });

      // 4) Xóa pendingCheckout để tránh conflict khi user khác login
      localStorage.removeItem("pendingCheckout");
    } catch (e) {
      // no-op
    }
  };
}
