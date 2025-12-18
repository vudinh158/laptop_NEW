import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, Save, Upload, X, Image as ImageIcon } from "lucide-react"
import { useAdminProduct, useCategories, useBrands } from "../../hooks/useProducts"
import { adminAPI } from "../../services/api" 
import { useQueryClient } from "@tanstack/react-query" 
import LoadingSpinner from "../../components/LoadingSpinner"
import ReactQuill from "react-quill"
import "react-quill/dist/quill.snow.css"

export default function AdminProductEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  // Hooks tải dữ liệu
  const { data: productData, isLoading: loadingProduct, error: productError } = useAdminProduct(id)
  const { data: categoriesData, isLoading: loadingCategories } = useCategories()
  const { data: brandsData, isLoading: loadingBrands } = useBrands()

  const [formData, setFormData] = useState(null)
  
  // --- STATE QUẢN LÝ HÌNH ẢNH ---
  // 1. Thumbnail (Ảnh đại diện)
  const [thumbnailFile, setThumbnailFile] = useState(null) // File mới chọn
  const [thumbnailPreview, setThumbnailPreview] = useState(null) // URL preview (của file mới hoặc ảnh cũ)

  // 2. Gallery (Ảnh chi tiết)
  const [selectedFiles, setSelectedFiles] = useState([]) // File ảnh chi tiết mới
  const [previewImages, setPreviewImages] = useState([]) // Preview ảnh chi tiết mới
  const [existingImages, setExistingImages] = useState([]) // Ảnh chi tiết cũ từ DB
  const [deletedImageIds, setDeletedImageIds] = useState([]) // ID ảnh cũ cần xóa
  
  const [isSubmitting, setIsSubmitting] = useState(false)

  const defaultInputClass = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"

  // --- EFFECT: Điền dữ liệu vào Form ---
  useEffect(() => {
    if (productData?.product && !formData) {
      const p = productData.product
      
      setFormData({
        product_name: p.product_name || "",
        slug: p.slug || "",
        description: p.description || "",
        category_id: String(p.category_id || ""),
        brand_id: String(p.brand_id || ""),
        base_price: Number(p.base_price) || 0,
        discount_percentage: Number(p.discount_percentage) || 0,
      })

      // Set Thumbnail cũ
      if (p.thumbnail_url) {
        setThumbnailPreview(p.thumbnail_url)
      }

      // Set danh sách ảnh chi tiết hiện có từ DB
      // Lọc bỏ ảnh trùng với thumbnail (nếu có logic đó) hoặc hiển thị hết
      if (p.images && p.images.length > 0) {
        setExistingImages(p.images)
      }
    }
  }, [productData, formData])

  // --- CLEANUP: Xóa object URL khi unmount ---
  useEffect(() => {
    return () => {
      previewImages.forEach(url => URL.revokeObjectURL(url))
      if (thumbnailFile && thumbnailPreview && !thumbnailPreview.startsWith('http')) {
         URL.revokeObjectURL(thumbnailPreview)
      }
    }
  }, [previewImages, thumbnailFile])

  // --- HANDLERS ---
  const handleChange = (e) => {
    const { name, value, type } = e.target
    const finalValue = type === "number" ? Number(value) : value
    setFormData((prev) => ({ ...prev, [name]: finalValue }))
  }

  // --- XỬ LÝ THUMBNAIL ---
  const handleThumbnailChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    setThumbnailFile(file)
    setThumbnailPreview(URL.createObjectURL(file))
  }

  const removeThumbnail = () => {
    setThumbnailFile(null)
    setThumbnailPreview(null) // Hoặc reset về ảnh cũ nếu muốn logic phức tạp hơn
  }

  // --- XỬ LÝ ẢNH CHI TIẾT ---
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    setSelectedFiles(prev => [...prev, ...files])
    const newPreviews = files.map(file => URL.createObjectURL(file))
    setPreviewImages(prev => [...prev, ...newPreviews])
  }

  const removeSelectedFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    setPreviewImages(prev => {
      URL.revokeObjectURL(prev[index])
      return prev.filter((_, i) => i !== index)
    })
  }

  const removeExistingImage = (imageId) => {
    setDeletedImageIds(prev => [...prev, imageId])
    setExistingImages(prev => prev.filter(img => img.image_id !== imageId))
  }

  // --- TÍNH TOÁN GIÁ ---
  const calculatedPrice = formData 
    ? Math.round(formData.base_price * (1 - formData.discount_percentage / 100))
    : 0;

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.category_id || !formData.brand_id) {
        alert("Vui lòng chọn Danh mục và Thương hiệu.")
        return
    }
    
    setIsSubmitting(true)

    try {
      const data = new FormData()
      
      // Append text fields
      data.append('product_name', formData.product_name)
      data.append('slug', formData.slug)
      data.append('description', formData.description)
      data.append('category_id', formData.category_id)
      data.append('brand_id', formData.brand_id)
      data.append('base_price', formData.base_price)
      data.append('discount_percentage', formData.discount_percentage)
      
      // Append Thumbnail mới (nếu có)
      // Lưu ý: Backend cần cấu hình để nhận field 'thumbnail' (upload.fields hoặc upload.single)
      // Hoặc nếu backend dùng chung upload.array('images'), bạn cần gộp vào và có cờ đánh dấu.
      // Ở đây mình giả định Backend có thể nhận field 'thumbnail'.
      if (thumbnailFile) {
        data.append('thumbnail', thumbnailFile) 
      }

      // Append ảnh chi tiết mới
      selectedFiles.forEach((file) => {
        data.append('images', file) 
      })

      // Append danh sách xóa ảnh cũ
      if (deletedImageIds.length > 0) {
        deletedImageIds.forEach(id => data.append('deleted_image_ids', id))
      }

      await adminAPI.updateProduct(id, data)

      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["admin-product", id] })
      
      alert("Cập nhật sản phẩm thành công!")
      navigate("/admin/products")

    } catch (error) {
      console.error("Cập nhật thất bại:", error)
      alert("Cập nhật thất bại. Vui lòng kiểm tra console.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- RENDER ---
  if (loadingProduct || loadingCategories || loadingBrands || !formData) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
          <p className="ml-3">Đang tải chi tiết sản phẩm...</p>
        </div>
      </div>
    )
  }

  if (productError || !productData?.product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <p className="text-red-600 text-center">Không tìm thấy sản phẩm cần chỉnh sửa.</p>
      </div>
    )
  }

  const categories = categoriesData?.categories || []
  const brands = brandsData?.brands || []

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center mb-8">
          <button
            onClick={() => navigate("/admin/products")}
            className="flex items-center gap-2 text-gray-600 hover:text-blue-600 mr-4 p-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Chỉnh sửa Sản phẩm</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* CỘT TRÁI: THÔNG TIN & GIÁ */}
            <div className="lg:col-span-2 space-y-6">
              {/* Thông tin cơ bản */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">Thông tin cơ bản</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên sản phẩm *</label>
                    <input
                      type="text"
                      name="product_name"
                      value={formData.product_name}
                      onChange={handleChange}
                      required
                      className={defaultInputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                    <input
                      type="text"
                      name="slug"
                      value={formData.slug}
                      onChange={handleChange}
                      className={defaultInputClass}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục *</label>
                      <select
                        name="category_id"
                        value={formData.category_id}
                        onChange={handleChange}
                        required
                        className={`${defaultInputClass} appearance-none cursor-pointer`}
                      >
                        <option value="" disabled>Chọn danh mục</option>
                        {categories.map((cat) => (
                          <option key={cat.category_id} value={String(cat.category_id)}>
                            {cat.category_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Thương hiệu *</label>
                      <select
                        name="brand_id"
                        value={formData.brand_id}
                        onChange={handleChange}
                        required
                        className={`${defaultInputClass} appearance-none cursor-pointer`}
                      >
                        <option value="" disabled>Chọn thương hiệu</option>
                        {brands.map((brand) => (
                          <option key={brand.brand_id} value={String(brand.brand_id)}>
                            {brand.brand_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả sản phẩm</label>
                    <ReactQuill
                      theme="snow"
                      value={formData.description}
                      onChange={(value) => setFormData((prev) => ({ ...prev, description: value }))}
                      className="bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Giá bán */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">Giá bán</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Giá gốc (VNĐ) *</label>
                    <input
                      type="number"
                      name="base_price"
                      value={formData.base_price}
                      onChange={handleChange}
                      min={0}
                      required
                      className={defaultInputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Giảm giá (%)</label>
                    <input
                      type="number"
                      name="discount_percentage"
                      value={formData.discount_percentage}
                      onChange={handleChange}
                      min={0}
                      max={100}
                      className={defaultInputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Giá sau giảm (Dự kiến)</label>
                    <input
                      type="text"
                      value={calculatedPrice.toLocaleString('vi-VN') + " đ"}
                      disabled
                      className={`${defaultInputClass} bg-gray-100 text-gray-500 font-semibold cursor-not-allowed`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* CỘT PHẢI: QUẢN LÝ HÌNH ẢNH */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* 1. ẢNH ĐẠI DIỆN (THUMBNAIL) */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">Ảnh đại diện</h2>
                <div className="flex flex-col items-center">
                  <div className="relative w-full aspect-square bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 overflow-hidden flex items-center justify-center mb-4 group hover:border-blue-500 transition-colors">
                    {thumbnailPreview ? (
                      <>
                        <img 
                          src={thumbnailPreview} 
                          alt="Thumbnail Preview" 
                          className="w-full h-full object-contain" 
                        />
                        {/* Nút xóa/thay đổi khi hover */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                           <label className="cursor-pointer p-2 bg-white rounded-full hover:bg-gray-100" title="Thay ảnh">
                              <Upload className="w-5 h-5 text-gray-700" />
                              <input type="file" className="hidden" accept="image/*" onChange={handleThumbnailChange} />
                           </label>
                           {/* Nếu muốn cho phép xóa hẳn thumbnail về null thì bật nút này */}
                           {/* <button type="button" onClick={removeThumbnail} className="p-2 bg-white rounded-full hover:bg-red-50 text-red-600">
                              <X className="w-5 h-5" />
                           </button> */}
                        </div>
                      </>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                        <ImageIcon className="w-12 h-12 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-500">Tải ảnh đại diện</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleThumbnailChange} />
                      </label>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 text-center">Ảnh này sẽ hiển thị ở trang danh sách.</p>
                </div>
              </div>

              {/* 2. THƯ VIỆN ẢNH (GALLERY) */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">Thư viện ảnh</h2>
                
                {/* Nút Upload */}
                <div className="mb-4">
                  <label className="flex items-center justify-center w-full py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 hover:border-blue-400 transition-all">
                    <Upload className="w-5 h-5 text-gray-500 mr-2" />
                    <span className="text-sm font-medium text-gray-600">Thêm ảnh chi tiết</span>
                    <input 
                      type="file" 
                      className="hidden" 
                      multiple 
                      accept="image/*"
                      onChange={handleFileChange} 
                    />
                  </label>
                </div>

                {/* Grid ảnh */}
                <div className="grid grid-cols-3 gap-2">
                  {/* Ảnh mới chọn */}
                  {previewImages.map((url, idx) => (
                    <div key={`new-${idx}`} className="relative group aspect-square rounded-md overflow-hidden border border-green-300">
                      <img src={url} alt="New" className="w-full h-full object-cover" />
                      <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] px-1">Mới</div>
                      <button
                        type="button"
                        onClick={() => removeSelectedFile(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {/* Ảnh cũ */}
                  {existingImages.map((img) => (
                    <div key={img.image_id} className="relative group aspect-square rounded-md overflow-hidden border border-gray-200">
                      <img src={img.image_url} alt="Existing" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeExistingImage(img.image_id)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                
                {existingImages.length === 0 && previewImages.length === 0 && (
                   <p className="text-sm text-center text-gray-400 mt-4">Chưa có ảnh chi tiết nào.</p>
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end pt-6 border-t border-gray-200">
             <button
                type="button"
                onClick={() => navigate("/admin/products")}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 mr-4 hover:bg-gray-50 font-medium"
             >
                Hủy bỏ
             </button>
             <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
             >
                {isSubmitting ? (
                   <>
                      <LoadingSpinner size="sm" />
                      <span>Đang lưu...</span>
                   </>
                ) : (
                   <>
                      <Save className="w-5 h-5" />
                      <span>Lưu thay đổi</span>
                   </>
                )}
             </button>
          </div>
          
        </form>
      </div>
    </div>
  )
}