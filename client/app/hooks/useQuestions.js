import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "../services/api"

// Questions Management Hooks
export function useAdminQuestions({ page = 1, limit = 20, answered, has_product, sort_by = 'created_at', sort_order = 'DESC' } = {}) {
  return useQuery({
    queryKey: ["admin-questions", page, limit, answered, has_product, sort_by, sort_order],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort_by,
        sort_order
      })

      if (answered !== undefined) {
        params.append('answered', answered)
      }
      if (has_product !== undefined) {
        params.append('has_product', has_product)
      }

      const { data } = await api.get(`/admin/questions?${params}`)
      return data
    },
    staleTime: 0,
  })
}

export function useAdminQuestionDetail(questionId) {
  return useQuery({
    queryKey: ["admin-question", questionId],
    queryFn: async () => {
      const { data } = await api.get(`/admin/questions/${questionId}`)
      return data
    },
    enabled: !!questionId,
  })
}

export function useCreateAnswer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ questionId, answerText }) => {
      const { data } = await api.post(`/admin/questions/${questionId}/answers`, {
        answer_text: answerText
      })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-questions"] })
      qc.invalidateQueries({ queryKey: ["admin-question"] })
    },
  })
}

export function useUpdateAnswer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ questionId, answerId, answerText }) => {
      const { data } = await api.put(`/admin/questions/${questionId}/answers/${answerId}`, {
        answer_text: answerText
      })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-questions"] })
      qc.invalidateQueries({ queryKey: ["admin-question"] })
    },
  })
}

export function useDeleteAnswer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ questionId, answerId }) => {
      const { data } = await api.delete(`/admin/questions/${questionId}/answers/${answerId}`)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-questions"] })
      qc.invalidateQueries({ queryKey: ["admin-question"] })
    },
  })
}







