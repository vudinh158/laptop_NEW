"use client";

import { useState } from "react";
// Import hook từ file mới (giả định bạn đã tạo file hook ở bước 1)
import { useAdminUsers, useUpdateUserStatus } from "../../hooks/useAdminUsers"; 
import LoadingSpinner from "../../components/LoadingSpinner";

export default function AdminUsers() {
  const [page, setPage] = useState(1);
  const limit = 10;

  // Lấy data người dùng
  const { data, isLoading } = useAdminUsers({ page, limit });
  const updateUserStatus = useUpdateUserStatus();

  const handleStatusChange = async (userId, isActive) => {
    if (window.confirm(`Bạn có chắc muốn ${isActive ? 'kích hoạt' : 'khóa'} tài khoản này?`)) {
      try {
        await updateUserStatus.mutateAsync({ userId, is_active: isActive });
      } catch (error) {
        console.error("Status update failed:", error);
        alert("Cập nhật trạng thái thất bại. Vui lòng kiểm tra quyền hạn.");
      }
    }
  };

  const formatRoleName = (roleName) => {
    if (roleName === "admin") return "Quản trị viên";
    if (roleName === "manager") return "Quản lý";
    return roleName.charAt(0).toUpperCase() + roleName.slice(1);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  const users = data?.users || [];
  const pagination = data?.pagination || {};

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Quản lý người dùng</h1>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên tài khoản</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vai trò</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.user_id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.user_id}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{user.full_name || user.username}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {user.Roles.map((r) => formatRoleName(r.role_name)).join(", ")}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        user.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {user.is_active ? "Hoạt động" : "Bị khóa"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {/* Nút đổi trạng thái */}
                    <button
                      onClick={() => handleStatusChange(user.user_id, !user.is_active)}
                      className={`p-2 text-sm rounded ${
                        user.is_active
                          ? "text-red-600 hover:bg-red-50"
                          : "text-green-600 hover:bg-green-50"
                      }`}
                      disabled={updateUserStatus.isPending}
                    >
                      {user.is_active ? "Khóa" : "Kích hoạt"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Trước
            </button>
            {[...Array(pagination.totalPages)].map((_, i) => (
              <button
                key={i + 1}
                onClick={() => setPage(i + 1)}
                className={`px-4 py-2 rounded-lg ${
                  page === i + 1
                    ? "bg-blue-600 text-white"
                    : "border border-gray-300 hover:bg-gray-50"
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sau
            </button>
          </div>
        )}
      </div>
    </div>
  );
}