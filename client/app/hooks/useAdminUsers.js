import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api"; 

/**
 * Lấy danh sách người dùng (Admin)
 * @param {object} params - pagination, filters
 */
export function useAdminUsers(params) {
    // Thêm sort và order mặc định vào params nếu không có
    const defaultParams = { 
        sort: 'user_id', 
        order: 'asc', 
        ...params 
    };
    
    return useQuery({
      queryKey: ["admin-users", defaultParams], // Cache key bao gồm cả sort/order
      queryFn: async () => {
        // Gọi API GET /api/admin/users với tham số sắp xếp
        const { data } = await api.get("/admin/users", { params: defaultParams });
        return data;
      },
      keepPreviousData: true,
    });
  }

/**
 * Cập nhật trạng thái người dùng (kích hoạt/hủy kích hoạt)
 */
export function useUpdateUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, is_active }) => {
      // Gọi API PUT /api/admin/users/:user_id/status
      const { data } = await api.put(`/admin/users/${userId}/status`, { is_active });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}