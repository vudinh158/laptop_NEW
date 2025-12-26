import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, Save, Upload, X, Image as ImageIcon, Plus, Trash2 } from "lucide-react"
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
  const [variations, setVariations] = useState([])
  const [isActive, setIsActive] = useState(true)

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
        discount_percentage: Number(p.discount_percentage) || 0,
      })

      // Set is_active status
      setIsActive(p.is_active !== undefined ? p.is_active : true)

      // Set variations
      if (p.variations && p.variations.length > 0) {
        setVariations(p.variations.map(v => ({
          variation_id: v.variation_id,
          processor: v.processor || "",
          ram: v.ram || "",
          storage: v.storage || "",
          graphics_card: v.graphics_card || "",
          screen_size: v.screen_size || "",
          color: v.color || "",
          price: Number(v.price) || 0,
          stock_quantity: Number(v.stock_quantity) || 0,
          is_primary: v.is_primary || false,
          sku: v.sku || "",
        })))
      } else {
        // Nếu không có variations, tạo một variation mặc định
        setVariations([{
          processor: "",
          ram: "",
          storage: "",
          graphics_card: "",
          screen_size: "",
          color: "",
          price: 0,
          stock_quantity: 1,
          is_primary: true,
          sku: "",
        }])
      }

      // Set Thumbnail cũ
      if (p.thumbnail_url) {
        setThumbnailPreview(p.thumbnail_url)
      }

      // Set danh sách ảnh chi tiết hiện có từ DB
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

    const updatedFormData = {
      ...formData,
      [name]: finalValue,
    }

    // Tự động tạo slug từ product_name
    if (name === "product_name") {
      updatedFormData.slug = value
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
    }

    setFormData(updatedFormData)

    // Cập nhật SKU cho tất cả variations khi tên sản phẩm thay đổi
    if (name === "product_name") {
      setVariations(prev => prev.map(v => ({
        ...v,
        sku: generateSKU(v, value)
      })))
    }
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

  // --- VARIATIONS MANAGEMENT ---
  const generateSKU = (variation, productName) => {
    if (!productName || !variation.processor || !variation.ram || !variation.storage || !variation.color) {
      return ""
    }

    const productPrefix = productName.substring(0, 3).toUpperCase()
    const cpuShort = variation.processor.split(' ')[0].toUpperCase()
    const ramShort = variation.ram.replace(/\s*GB\s*$/, 'GB').toUpperCase()
    const storageShort = variation.storage.replace(/\s*GB\s*$/, 'GB').replace(/\s*TB\s*$/, 'TB').toUpperCase()
    const colorShort = variation.color.substring(0, 3).toUpperCase()

    return `${productPrefix}-${cpuShort}-${ramShort}-${storageShort}-${colorShort}`
  }

  const handleVariationChange = (index, field, value) => {
    const updatedVariations = [...variations]
    updatedVariations[index] = {
      ...updatedVariations[index],
      [field]: field === 'is_primary' ? (value === 'true' || value === true) : value
    }

    // Nếu đang set is_primary = true cho variation này, set tất cả variations khác về false
    if (field === 'is_primary' && value === true) {
      updatedVariations.forEach((v, i) => {
        if (i !== index) {
          v.is_primary = false
        }
      })
    }

    // Tự động tạo SKU khi các trường cần thiết thay đổi
    if (['processor', 'ram', 'storage', 'color'].includes(field)) {
      updatedVariations[index].sku = generateSKU(updatedVariations[index], formData?.product_name || "")
    }

    setVariations(updatedVariations)
  }

  const addVariation = () => {
    setVariations(prev => [...prev, {
      processor: "",
      ram: "",
      storage: "",
      graphics_card: "",
      screen_size: "",
      color: "",
      price: 0,
      stock_quantity: 1,
      is_primary: false,
      sku: "",
    }])
  }

  const removeVariation = (index) => {
    if (variations.length > 1) {
      const updatedVariations = variations.filter((_, i) => i !== index)
      // Nếu xóa variation primary, set variation đầu tiên thành primary
      if (variations[index].is_primary && updatedVariations.length > 0) {
        updatedVariations[0].is_primary = true
      }
      setVariations(updatedVariations)
    }
  }


  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.category_id || !formData.brand_id) {
        alert("Vui lòng chọn Danh mục và Thương hiệu.")
        return
    }

    if (!formData.product_name.trim()) {
        alert("Vui lòng nhập tên sản phẩm.")
        return
    }

    // Validation variations
    if (variations.length === 0) {
        alert("Phải có ít nhất một biến thể sản phẩm.")
        return
    }

    const primaryVariations = variations.filter(v => v.is_primary)
    if (primaryVariations.length !== 1) {
        alert("Phải có duy nhất một biến thể được đánh dấu là chính.")
        return
    }

    for (let i = 0; i < variations.length; i++) {
      const v = variations[i]
      if (!v.price || v.price <= 0) {
        alert(`Biến thể ${i + 1}: Giá phải lớn hơn 0.`)
        return
      }
      if (!v.sku.trim()) {
        alert(`Biến thể ${i + 1}: SKU không được để trống.`)
        return
      }
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
      data.append('discount_percentage', formData.discount_percentage)
      data.append('is_active', isActive)

      // Append Thumbnail mới (nếu có)
      if (thumbnailFile) {
        data.append('thumbnail', thumbnailFile)
      }

      // Append ảnh chi tiết mới
      selectedFiles.forEach((file) => {
        data.append('product_images', file)
      })

      // Append danh sách xóa ảnh cũ
      if (deletedImageIds.length > 0) {
        deletedImageIds.forEach(id => data.append('deleted_image_ids', id))
      }

      // Append variations
      data.append('variations', JSON.stringify(variations))

      await adminAPI.updateProduct(id, data)

      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["admin-product", id] })

      alert("Cập nhật sản phẩm thành công!")
      navigate("/admin/products")

    } catch (error) {
      console.error("Cập nhật thất bại:", error)
      alert("Cập nhật thất bại: " + (error.response?.data?.message || error.message))
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
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <button
              onClick={() => navigate("/admin/products")}
              className="flex items-center gap-2 text-gray-600 hover:text-blue-600 mr-4 p-2 rounded-full hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Chỉnh sửa Sản phẩm</h1>
          </div>

          {/* Toggle Active Status */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">
              Trạng thái: {isActive ? "Đang hoạt động" : "Đã ẩn"}
            </span>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                isActive ? "bg-green-600" : "bg-gray-400"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isActive ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
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

              {/* Biến thể sản phẩm */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4 border-b pb-2">
                  <h2 className="text-xl font-bold text-gray-900">Biến thể sản phẩm</h2>
                  <button
                    type="button"
                    onClick={addVariation}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Thêm biến thể
                  </button>
                </div>

                {variations.map((variation, index) => (
                  <div key={variation.variation_id || index} className="border rounded-lg p-4 mb-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Biến thể {index + 1}</h3>
                      {variations.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeVariation(index)}
                          className="flex items-center px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Xóa
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                      {/* CPU */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CPU *</label>
                        <input
                          type="text"
                          value={variation.processor}
                          onChange={(e) => handleVariationChange(index, 'processor', e.target.value)}
                          className={defaultInputClass}
                          placeholder="Intel Core 5 210H"
                        />
                      </div>
                      {/* RAM */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">RAM *</label>
                        <input
                          type="text"
                          value={variation.ram}
                          onChange={(e) => handleVariationChange(index, 'ram', e.target.value)}
                          className={defaultInputClass}
                          placeholder="16GB DDR4"
                        />
                      </div>
                      {/* Storage */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ổ cứng *</label>
                        <input
                          type="text"
                          value={variation.storage}
                          onChange={(e) => handleVariationChange(index, 'storage', e.target.value)}
                          className={defaultInputClass}
                          placeholder="512GB SSD"
                        />
                      </div>
                      {/* Graphics Card */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Card đồ họa</label>
                        <input
                          type="text"
                          value={variation.graphics_card}
                          onChange={(e) => handleVariationChange(index, 'graphics_card', e.target.value)}
                          className={defaultInputClass}
                          placeholder="NVIDIA RTX 3050"
                        />
                      </div>
                      {/* Screen Size */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Kích thước màn hình</label>
                        <input
                          type="text"
                          value={variation.screen_size}
                          onChange={(e) => handleVariationChange(index, 'screen_size', e.target.value)}
                          className={defaultInputClass}
                          placeholder="15.6 inch"
                        />
                      </div>
                      {/* Color */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Màu sắc *</label>
                        <input
                          type="text"
                          value={variation.color}
                          onChange={(e) => handleVariationChange(index, 'color', e.target.value)}
                          className={defaultInputClass}
                          placeholder="Đen"
                        />
                      </div>
                      {/* Price */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Giá (VNĐ) *</label>
                        <input
                          type="number"
                          value={variation.price}
                          onChange={(e) => handleVariationChange(index, 'price', Number(e.target.value))}
                          min={0}
                          className={defaultInputClass}
                          placeholder="25000000"
                        />
                      </div>
                      {/* Stock */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tồn kho *</label>
                        <input
                          type="number"
                          value={variation.stock_quantity}
                          onChange={(e) => handleVariationChange(index, 'stock_quantity', Number(e.target.value))}
                          min={0}
                          className={defaultInputClass}
                          placeholder="10"
                        />
                      </div>
                      {/* SKU */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">SKU (tự động tạo)</label>
                        <input
                          type="text"
                          value={variation.sku}
                          readOnly
                          className={`${defaultInputClass} bg-gray-100`}
                          placeholder="SKU sẽ được tạo tự động"
                        />
                      </div>
                      {/* Discount Percentage - moved here */}
                      {index === 0 && (
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
                      )}
                    </div>

                    {/* Is Primary */}
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id={`is-primary-${index}`}
                        checked={variation.is_primary}
                        onChange={(e) => handleVariationChange(index, 'is_primary', e.target.checked)}
                        className="mr-2"
                      />
                      <label htmlFor={`is-primary-${index}`} className="text-sm font-medium text-gray-700">
                        Biến thể chính (chỉ có 1 biến thể được chọn)
                      </label>
                    </div>
                  </div>
                ))}
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