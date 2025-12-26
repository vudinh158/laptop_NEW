import { useState, useEffect } from "react"
import { useAdminCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "../../hooks/useProducts"
import { adminAPI } from "../../services/api"
import { useQueryClient } from "@tanstack/react-query"
import LoadingSpinner from "../../components/LoadingSpinner"
import { Plus, Edit, Trash2, Upload, X, Image as ImageIcon, Save, ArrowLeft } from "lucide-react"

export default function AdminCategories() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useAdminCategories()

  const [categories, setCategories] = useState([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states
  const [formData, setFormData] = useState({
    category_name: "",
    description: "",
    display_order: 0,
  })

  // Image states
  const [iconFile, setIconFile] = useState(null)
  const [iconPreview, setIconPreview] = useState("")

  const defaultInputClass = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"

  useEffect(() => {
    if (data?.categories) {
      setCategories(data.categories)
    }
  }, [data])

  const resetForm = () => {
    setFormData({
      category_name: "",
      description: "",
      display_order: 0,
    })
    setIconFile(null)
    setIconPreview("")
    setShowCreateForm(false)
    setEditingCategory(null)
  }

  const startEdit = (category) => {
    setEditingCategory(category.category_id)
    setFormData({
      category_name: category.category_name || "",
      description: category.description || "",
      display_order: category.display_order || 0,
    })
    setIconPreview(category.icon_url || "")
    setIconFile(null)
  }

  const handleIconChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setIconFile(file)
      const reader = new FileReader()
      reader.onload = (e) => setIconPreview(e.target.result)
      reader.readAsDataURL(file)
    }
  }

  const removeIcon = () => {
    setIconFile(null)
    setIconPreview("")
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.category_name.trim()) {
      alert("Vui lòng nhập tên danh mục.")
      return
    }

    setIsSubmitting(true)

    try {
      const submitData = new FormData()
      submitData.append('category_name', formData.category_name)
      submitData.append('description', formData.description)
      submitData.append('display_order', formData.display_order)

      if (iconFile) {
        submitData.append('thumbnail', iconFile) // Using thumbnail field for icon
      }

      if (editingCategory) {
        await adminAPI.updateCategory(editingCategory, submitData)
        alert("Cập nhật danh mục thành công!")
      } else {
        await adminAPI.createCategory(submitData)
        alert("Tạo danh mục thành công!")
      }

      queryClient.invalidateQueries({ queryKey: ["admin-categories"] })
      resetForm()

    } catch (error) {
      console.error("Lỗi:", error)
      alert(`Thao tác thất bại: ${error.response?.data?.message || error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (categoryId, categoryName) => {
    if (!confirm(`Bạn có chắc muốn xóa danh mục "${categoryName}"?`)) {
      return
    }

    try {
      await adminAPI.deleteCategory(categoryId)
      alert("Xóa danh mục thành công!")
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] })
    } catch (error) {
      console.error("Lỗi:", error)
      alert(`Xóa danh mục thất bại: ${error.response?.data?.message || error.message}`)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
          <p className="ml-3">Đang tải danh mục...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Quản lý Danh mục</h1>
          {!showCreateForm && !editingCategory && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Thêm danh mục
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          {(showCreateForm || editingCategory) && (
            <div className="lg:col-span-1 bg-white rounded-lg shadow-sm p-6 h-fit">
              <div className="flex items-center justify-between mb-4 border-b pb-2">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingCategory ? "Chỉnh sửa danh mục" : "Thêm danh mục mới"}
                </h2>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên danh mục *</label>
                  <input
                    type="text"
                    value={formData.category_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, category_name: e.target.value }))}
                    required
                    className={defaultInputClass}
                    placeholder="Ví dụ: Laptop Gaming"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className={defaultInputClass + " resize-none"}
                    placeholder="Mô tả ngắn gọn về danh mục..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thứ tự hiển thị</label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData(prev => ({ ...prev, display_order: Number(e.target.value) }))}
                    min={0}
                    className={defaultInputClass}
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Biểu tượng danh mục</label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleIconChange}
                      className="hidden"
                      id="icon-upload"
                    />
                    <label
                      htmlFor="icon-upload"
                      className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 cursor-pointer"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Chọn ảnh
                    </label>
                    {iconPreview && (
                      <div className="relative">
                        <img
                          src={iconPreview}
                          alt="Icon preview"
                          className="w-12 h-12 object-cover rounded-lg border"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            console.warn('Failed to load icon preview')
                          }}
                        />
                        <button
                          type="button"
                          onClick={removeIcon}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span>Đang lưu...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>{editingCategory ? "Cập nhật" : "Tạo mới"}</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Danh sách Danh mục */}
          <div className={`${(showCreateForm || editingCategory) ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white rounded-lg shadow-sm overflow-hidden`}>
            <h2 className="text-xl font-bold text-gray-900 p-6 border-b">
              Danh sách danh mục ({categories.length})
            </h2>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Icon</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên danh mục</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thứ tự</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {categories.map((category) => (
                    <tr key={category.category_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {category.icon_url ? (
                          <img
                            src={category.icon_url}
                            alt={category.category_name}
                            className="w-8 h-8 object-cover rounded"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {category.category_name}
                          </div>
                          {category.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {category.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {category.slug}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {category.display_order || 0}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEdit(category)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                            title="Chỉnh sửa"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(category.category_id, category.category_name)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {categories.length === 0 && (
              <div className="text-center py-12">
                <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Chưa có danh mục nào.</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                >
                  Tạo danh mục đầu tiên
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}