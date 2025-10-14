import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useDispatch } from "react-redux"
import { setCredentials, logout as logoutAction } from "../store/slices/authSlice"
import api from "../services/api"

export function useLogin() {
  const dispatch = useDispatch()

  return useMutation({
    mutationFn: async (credentials) => {
      const { data } = await api.post("/auth/login", credentials)
      return data
    },
    onSuccess: (data) => {
      dispatch(
        setCredentials({
          user: data.user,
          token: data.token,
        }),
      )
    },
  })
}

export function useRegister() {
  const dispatch = useDispatch()

  return useMutation({
    mutationFn: async (userData) => {
      const { data } = await api.post("/auth/register", userData)
      return data
    },
    onSuccess: (data) => {
      dispatch(
        setCredentials({
          user: data.user,
          token: data.token,
        }),
      )
    },
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
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      // Optional: call logout endpoint if you have one
      // await api.post('/auth/logout')
    },
    onSuccess: () => {
      dispatch(logoutAction())
      queryClient.clear()
    },
  })
}
