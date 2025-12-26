import { useState, useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { adminAPI } from "../../services/api"
import LoadingSpinner from "../../components/LoadingSpinner"
import { Plus, Edit, Trash2, Upload, X, Image as ImageIcon, Save } from "lucide-react"

export default function AdminBrands() {
  const queryClient = useQueryClient()
  const [brands, setBrands] = useState([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingBrand, setEditingBrand] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Form states
  const [formData, setFormData] = useState({
    brand_name: "",
    description: "",
  })

  // Image states
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState("")

  const defaultInputClass = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"

  useEffect(() => {
    loadBrands()
  }, [])

  const loadBrands = async () => {
    try {
      setIsLoading(true)
      const response = await adminAPI.getAllBrands()
      setBrands(response.data.brands || [])
    } catch (error) {
      console.error("Lỗi tải brands:", error)
      alert("Lỗi tải danh sách thương hiệu")
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      brand_name: "",
      description: "",
    })
    setLogoFile(null)
    setLogoPreview("")
    setShowCreateForm(false)
    setEditingBrand(null)
  }

  const startEdit = (brand) => {
    setEditingBrand(brand.brand_id)
    setFormData({
      brand_name: brand.brand_name || "",
      description: brand.description || "",
    })
    setLogoPreview(brand.logo_url || "")
    setLogoFile(null)
  }

  const handleLogoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onload = (e) => setLogoPreview(e.target.result)
      reader.readAsDataURL(file)
    }
  }

  const removeLogo = () => {
    setLogoFile(null)
    setLogoPreview("")
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.brand_name.trim()) {
      alert("Vui lòng nhập tên thương hiệu.")
      return
    }

    setIsSubmitting(true)

    try {
      const submitData = new FormData()
      submitData.append('brand_name', formData.brand_name)
      submitData.append('description', formData.description)

      if (logoFile) {
        submitData.append('thumbnail', logoFile) // Using thumbnail field for logo
      }

      if (editingBrand) {
        await adminAPI.updateBrand(editingBrand, submitData)
        alert("Cập nhật thương hiệu thành công!")
      } else {
        const response = await adminAPI.createBrand(submitData)
        alert("Tạo thương hiệu thành công!")
      }

      await loadBrands()
      resetForm()

    } catch (error) {
      console.error("Lỗi:", error)
      alert(`Thao tác thất bại: ${error.response?.data?.message || error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (brandId, brandName) => {
    if (!confirm(`Bạn có chắc muốn xóa thương hiệu "${brandName}"?`)) {
      return
    }

    try {
      const response = await adminAPI.deleteBrand(brandId)
      alert("Xóa thương hiệu thành công!")
      await loadBrands()
    } catch (error) {
      console.error("Lỗi:", error)
      alert(`Xóa thương hiệu thất bại: ${error.response?.data?.message || error.message}`)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
          <p className="ml-3">Đang tải thương hiệu...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Quản lý Thương hiệu</h1>
          {!showCreateForm && !editingBrand && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Thêm thương hiệu
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          {(showCreateForm || editingBrand) && (
            <div className="lg:col-span-1 bg-white rounded-lg shadow-sm p-6 h-fit">
              <div className="flex items-center justify-between mb-4 border-b pb-2">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingBrand ? "Chỉnh sửa thương hiệu" : "Thêm thương hiệu mới"}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên thương hiệu *</label>
                  <input
                    type="text"
                    value={formData.brand_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, brand_name: e.target.value }))}
                    required
                    className={defaultInputClass}
                    placeholder="Ví dụ: ASUS"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className={defaultInputClass + " resize-none"}
                    placeholder="Mô tả ngắn gọn về thương hiệu..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Logo thương hiệu</label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label
                      htmlFor="logo-upload"
                      className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 cursor-pointer"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Chọn ảnh
                    </label>
                    {logoPreview && (
                      <div className="relative">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="w-12 h-12 object-cover rounded-lg border"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            console.warn('Failed to load logo preview')
                          }}
                        />
                        <button
                          type="button"
                          onClick={removeLogo}
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
                        <span>{editingBrand ? "Cập nhật" : "Tạo mới"}</span>
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

          {/* Danh sách Thương hiệu */}
          <div className={`${(showCreateForm || editingBrand) ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white rounded-lg shadow-sm overflow-hidden`}>
            <h2 className="text-xl font-bold text-gray-900 p-6 border-b">
              Danh sách thương hiệu ({brands.length})
            </h2>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Logo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên thương hiệu</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {brands.map((brand) => (
                    <tr key={brand.brand_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {brand.logo_url ? (
                          <img
                            src={brand.logo_url}
                            alt={brand.brand_name}
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
                            {brand.brand_name}
                          </div>
                          {brand.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {brand.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {brand.slug}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEdit(brand)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                            title="Chỉnh sửa"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(brand.brand_id, brand.brand_name)}
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

            {brands.length === 0 && (
              <div className="text-center py-12">
                <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Chưa có thương hiệu nào.</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                >
                  Tạo thương hiệu đầu tiên
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
