import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useDispatch } from "react-redux"
import { setCart } from "../store/slices/cartSlice"
import api from "../services/api"

export function useAddToCart() {
  const dispatch = useDispatch()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (cartItem) => {
      const { data } = await api.post("/cart", cartItem)
      return data
    },
    onSuccess: (data) => {
      dispatch(setCart(data.cart))
      queryClient.invalidateQueries({ queryKey: ["cart"] })
    },
  })
}

export function useUpdateCartItem() {
  const dispatch = useDispatch()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ itemId, quantity }) => {
      const { data } = await api.put(`/cart/${itemId}`, { quantity })
      return data
    },
    onSuccess: (data) => {
      dispatch(setCart(data.cart))
      queryClient.invalidateQueries({ queryKey: ["cart"] })
    },
  })
}

export function useRemoveFromCart() {
  const dispatch = useDispatch()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (itemId) => {
      const { data } = await api.delete(`/cart/${itemId}`)
      return data
    },
    onSuccess: (data) => {
      dispatch(setCart(data.cart))
      queryClient.invalidateQueries({ queryKey: ["cart"] })
    },
  })
}
