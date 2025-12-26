import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Upload, X, Plus } from "lucide-react"
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import { useCategories, useBrands } from "../../hooks/useProducts"
import { adminAPI } from "../../services/api"
import LoadingSpinner from "../../components/LoadingSpinner"

// Chỉ sử dụng các component cần thiết không thuộc /components/ui
// Các styles được áp dụng trực tiếp qua className

export default function AdminProductNewPage() {
  const navigate = useNavigate()
  const { data: categoriesData, isLoading: loadingCategories } = useCategories()
  const { data: brandsData, isLoading: loadingBrands } = useBrands()

  const defaultInputClass = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
  
  const [formData, setFormData] = useState({
    product_name: "",
    slug: "",
    description: "",
    category_id: "",
    brand_id: "",
    discount_percentage: 0,
    thumbnail_url: "",
  })

  const [thumbnailFile, setThumbnailFile] = useState(null)
  const [thumbnailPreview, setThumbnailPreview] = useState("")
  const [productImageFiles, setProductImageFiles] = useState([])
  const [productImagePreviews, setProductImagePreviews] = useState([])

  const [variations, setVariations] = useState([
    {
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
    }
  ])

  const handleChange = (e) => {
    const { name, value, type } = e.target
    const finalValue = type === "number" ? Number(value) : value

    if (name in formData) {
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
    }
  }

  const handleDescriptionChange = (value) => {
    setFormData(prev => ({
      ...prev,
      description: value
    }))
  }

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
      updatedVariations[index].sku = generateSKU(updatedVariations[index], formData.product_name)
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

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setThumbnailFile(file)
      const reader = new FileReader()
      reader.onload = (e) => setThumbnailPreview(e.target.result)
      reader.readAsDataURL(file)
    }
  }

  const removeThumbnail = () => {
    setThumbnailFile(null)
    setThumbnailPreview("")
  }

  const handleProductImagesChange = (e) => {
    const files = Array.from(e.target.files)
    setProductImageFiles(prev => [...prev, ...files])

    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setProductImagePreviews(prev => [...prev, e.target.result])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeProductImage = (index) => {
    setProductImageFiles(prev => prev.filter((_, i) => i !== index))
    setProductImagePreviews(prev => prev.filter((_, i) => i !== index))
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

    try {
      const formDataToSend = new FormData()

      // Thêm thông tin sản phẩm
      formDataToSend.append('product_name', formData.product_name)
      formDataToSend.append('slug', formData.slug)
      formDataToSend.append('description', formData.description)
      formDataToSend.append('category_id', formData.category_id)
      formDataToSend.append('brand_id', formData.brand_id)
      formDataToSend.append('discount_percentage', formData.discount_percentage)

      // Thêm file thumbnail
      if (thumbnailFile) {
        formDataToSend.append('thumbnail', thumbnailFile)
      }

      // Thêm product images
      productImageFiles.forEach((file, index) => {
        formDataToSend.append('product_images', file)
      })

      // Thêm variations
      formDataToSend.append('variations', JSON.stringify(variations))

      await adminAPI.createProduct(formDataToSend)
      alert("Thêm sản phẩm thành công!")
      navigate("/admin/products")
    } catch (error) {
      console.error("Thêm sản phẩm thất bại:", error)
      alert("Thêm sản phẩm thất bại: " + (error.response?.data?.message || error.message))
    }
  }

  const categories = categoriesData?.categories || []
  const brands = brandsData?.brands || []
  const isFormLoading = loadingCategories || loadingBrands

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
          <h1 className="text-3xl font-bold text-gray-900">Thêm Sản Phẩm Mới</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">Thông tin cơ bản</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tên sản phẩm */}
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

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug (tự động tạo)</label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  className={defaultInputClass}
                  placeholder="slug-se-duoc-tao-tu-ten-san-pham"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Danh mục */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục *</label>
                  <select
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleChange}
                    required
                    disabled={loadingCategories}
                    className={`${defaultInputClass} appearance-none cursor-pointer`}
                  >
                    <option value="" disabled>
                      {loadingCategories ? "Đang tải..." : "Chọn danh mục"}
                    </option>
                    {categories.map((cat) => (
                      <option key={cat.category_id} value={cat.category_id}>
                        {cat.category_name}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Thương hiệu */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thương hiệu *</label>
                  <select
                    name="brand_id"
                    value={formData.brand_id}
                    onChange={handleChange}
                    required
                    disabled={loadingBrands}
                    className={`${defaultInputClass} appearance-none cursor-pointer`}
                  >
                    <option value="" disabled>
                      {loadingBrands ? "Đang tải..." : "Chọn thương hiệu"}
                    </option>
                    {brands.map((brand) => (
                      <option key={brand.brand_id} value={brand.brand_id}>
                        {brand.brand_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Giảm giá */}
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

              {/* Mô tả */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả sản phẩm</label>
                <ReactQuill
                  value={formData.description}
                  onChange={handleDescriptionChange}
                  theme="snow"
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      [{ 'color': [] }, { 'background': [] }],
                      ['link', 'image'],
                      ['clean']
                    ],
                  }}
                  className="bg-white"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">Hình ảnh sản phẩm</h2>
            <div className="space-y-6">
              {/* Thumbnail */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ảnh đại diện *</label>
                <div className="flex items-center space-x-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailChange}
                    className="hidden"
                    id="thumbnail-upload"
                  />
                  <label
                    htmlFor="thumbnail-upload"
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Chọn ảnh
                  </label>
                  {thumbnailPreview && (
                    <div className="relative">
                      <img
                        src={thumbnailPreview}
                        alt="Thumbnail preview"
                        className="w-20 h-20 object-cover rounded-lg border"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          console.warn('Failed to load thumbnail preview');
                        }}
                      />
                      <button
                        type="button"
                        onClick={removeThumbnail}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Product Images */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ảnh chi tiết sản phẩm</label>
                <div className="flex items-center space-x-4">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleProductImagesChange}
                    className="hidden"
                    id="product-images-upload"
                  />
                  <label
                    htmlFor="product-images-upload"
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Chọn ảnh (tối đa 10)
                  </label>
                </div>
                {productImagePreviews.length > 0 && (
                  <div className="grid grid-cols-4 gap-4 mt-4">
                    {productImagePreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <img
                          src={preview}
                          alt={`Product image ${index + 1}`}
                          className="w-full h-20 object-cover rounded-lg border"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            console.warn(`Failed to load product image ${index + 1} preview`);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => removeProductImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Variations */}
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
              <div key={index} className="border rounded-lg p-4 mb-4 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Biến thể {index + 1}</h3>
                  {variations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeVariation(index)}
                      className="flex items-center px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      <X className="w-4 h-4 mr-1" />
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
                      placeholder="Intel Core i5-12450H"
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
                      placeholder="NVIDIA RTX 4050"
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

          <button
            type="submit"
            disabled={isFormLoading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isFormLoading ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              "Tạo Sản Phẩm Mới"
            )}
          </button>
        </form>
      </div>
    </div>
  )
}