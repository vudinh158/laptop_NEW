// laptop-ecommerce (1) - Copy/client/app/pages/admin/AdminCategories.jsx

import { useState } from "react"
import { useAdminCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "../../hooks/useProducts"
import LoadingSpinner from "../../components/LoadingSpinner"
import { Plus, Edit, Trash2 } from "lucide-react"

export default function AdminCategories() {
  const { data, isLoading } = useAdminCategories()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()

  const [newCategoryName, setNewCategoryName] = useState("")
  const [editingCategory, setEditingCategory] = useState(null) // { id, name }
  const defaultInputClass = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newCategoryName.trim()) return

    // Tạm thời tạo slug đơn giản
    const slug = newCategoryName.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-')
    
    try {
      await createCategory.mutateAsync({ category_name: newCategoryName, slug })
      setNewCategoryName("")
    } catch (error) {
      alert("Tạo danh mục thất bại: " + (error.response?.data?.message || error.message))
    }
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!editingCategory?.name.trim() || !editingCategory.id) return

    const slug = editingCategory.name.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-')
    
    try {
      await updateCategory.mutateAsync({ 
        id: editingCategory.id, 
        category_name: editingCategory.name, 
        slug 
      })
      setEditingCategory(null)
    } catch (error) {
      alert("Cập nhật danh mục thất bại: " + (error.response?.data?.message || error.message))
    }
  }
  
  const handleDelete = async (id) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa danh mục này? (Lưu ý: Không thể xóa danh mục có sản phẩm)")) {
      try {
        await deleteCategory.mutateAsync(id)
      } catch (error) {
        alert("Xóa danh mục thất bại: " + (error.response?.data?.message || "Kiểm tra xem danh mục có còn sản phẩm không."))
      }
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  const categories = data?.categories || []

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Quản lý Danh mục</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Thêm Danh mục */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow-sm p-6 h-fit">
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">Thêm Danh mục mới</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên Danh mục</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  required
                  className={defaultInputClass}
                />
              </div>
              <button
                type="submit"
                disabled={createCategory.isPending}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50"
              >
                <Plus className="w-5 h-5" />
                {createCategory.isPending ? "Đang thêm..." : "Thêm Danh mục"}
              </button>
            </form>
          </div>

          {/* Danh sách Danh mục */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm overflow-hidden">
            <h2 className="text-xl font-bold text-gray-900 p-6 border-b">Danh sách ({categories.length})</h2>
            
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên Danh mục</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {categories.map((cat) => (
                  <tr key={cat.category_id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{cat.category_id}</td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingCategory?.id === cat.category_id ? (
                        <form onSubmit={handleUpdate} className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={editingCategory.name}
                            onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                            required
                            className="text-sm border border-gray-300 rounded px-2 py-1 w-40"
                          />
                          <button type="submit" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                            Lưu
                          </button>
                          <button type="button" onClick={() => setEditingCategory(null)} className="text-sm text-gray-500 hover:text-gray-700">
                            Hủy
                          </button>
                        </form>
                      ) : (
                        <span className="text-sm text-gray-600">{cat.category_name}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{cat.slug}</td>
                    
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      {editingCategory?.id !== cat.category_id && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingCategory({ id: cat.category_id, name: cat.category_name })}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(cat.category_id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            disabled={deleteCategory.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {categories.length === 0 && !isLoading && (
                 <p className="text-center text-gray-500 py-10">Chưa có danh mục nào được tạo.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}