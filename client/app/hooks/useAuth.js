import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useDispatch } from "react-redux"
import { setCredentials, logout as logoutAction } from "../store/slices/authSlice"
import api from "../services/api"
import { authAPI } from "../services/api"

export function useRegister() {
  return useMutation({
    mutationFn: async (payload) => {
      // payload: { username, email, password, full_name, phone_number }
      const { data } = await authAPI.register(payload)
      return data
    },
  })
}

export function useLogin() {
  const dispatch = useDispatch()
  return useMutation({
    mutationFn: async ({ username, password }) => {
      const { data } = await authAPI.login({ username, password })
      return data
    },
    onSuccess: (data) => {
      // data: { token, user, ... }
      dispatch(setCredentials({ token: data.token, user: data.user }))
    },
  })
}
export function useMe(enabled = true) {
  // tiện lấy lại user khi refresh nếu cần
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await authAPI.getCurrentUser()
      return data
    },
    enabled,
  })
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const { data } = await api.get("/auth/me")
      return data
    },
    retry: false,
  })
}

export function useLogout() {
  const dispatch = useDispatch()
  return () => dispatch(logout())
}
