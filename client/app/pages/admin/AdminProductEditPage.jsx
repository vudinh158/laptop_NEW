// laptop-ecommerce (1) - Copy/client/app/pages/admin/AdminProductEditPage.jsx

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, Save } from "lucide-react"
import { useAdminProduct, useUpdateProduct, useCategories, useBrands } from "../../hooks/useProducts"
import LoadingSpinner from "../../components/LoadingSpinner"

export default function AdminProductEditPage() {
  const { id } = useParams() // Lấy ID sản phẩm từ URL
  const navigate = useNavigate()
  
  // Hooks tải dữ liệu cần thiết
  const { data: productData, isLoading: loadingProduct, error: productError } = useAdminProduct(id)
  const { data: categoriesData, isLoading: loadingCategories } = useCategories()
  const { data: brandsData, isLoading: loadingBrands } = useBrands()
  const updateProduct = useUpdateProduct()

  const [formData, setFormData] = useState(null) // Sử dụng null để đợi data tải xong
  const [variationData, setVariationData] = useState(null)
  const defaultInputClass = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"


  // --- EFFECT: Điền dữ liệu vào Form khi tải xong ---
  useEffect(() => {
    if (productData?.product && !formData) {
      const p = productData.product
      const v = p.variations?.[0] || {}

      setFormData({
        product_name: p.product_name || "",
        slug: p.slug || "",
        description: p.description || "",
        // ID cần là string để khớp với <select>
        category_id: String(p.category_id || ""),
        brand_id: String(p.brand_id || ""),
        base_price: Number(p.base_price) || 0,
        discount_percentage: Number(p.discount_percentage) || 0,
        thumbnail_url: p.thumbnail_url || "",
      })

      setVariationData({
        processor: v.processor || "",
        ram: v.ram || "",
        storage: v.storage || "",
        stock_quantity: Number(v.stock_quantity) || 0,
        price: Number(v.price) || 0,
      })
    }
  }, [productData, formData])

  // --- HANDLERS ---
  const handleChange = (e) => {
    const { name, value, type } = e.target
    const finalValue = type === "number" ? Number(value) : value
    
    if (name in formData) {
      setFormData((prev) => ({ ...prev, [name]: finalValue }))
      if (name === "base_price") {
         setVariationData(prev => ({...prev, price: finalValue }))
      }
    } else {
      setVariationData((prev) => ({ ...prev, [name]: finalValue }))
    }
  }

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.category_id || !formData.brand_id) {
        alert("Vui lòng chọn Danh mục và Thương hiệu.");
        return;
    }
    
    const productPayload = {
      // ID sản phẩm được truyền qua hook
      id: id, 
      product_name: formData.product_name,
      slug: formData.slug || formData.product_name.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-'),
      description: formData.description,
      category_id: Number(formData.category_id),
      brand_id: Number(formData.brand_id),
      base_price: formData.base_price,
      discount_percentage: formData.discount_percentage,
      thumbnail_url: formData.thumbnail_url,
      
      // Variations chỉ gửi cái đầu tiên để đơn giản hóa form
      variations: [{ 
          ...variationData, 
          // Chỉ cập nhật variation đầu tiên nếu form này đơn giản
          variation_id: productData.product.variations?.[0]?.variation_id, 
          price: formData.base_price 
      }],
      // Images được đơn giản hóa
      images: [{ image_url: formData.thumbnail_url || "/placeholder.svg", is_primary: true }],
    }

    try {
      await updateProduct.mutateAsync(productPayload)
      alert("Cập nhật sản phẩm thành công!")
      navigate("/admin/products")
    } catch (error) {
      console.error("Cập nhật sản phẩm thất bại:", error)
      alert("Cập nhật sản phẩm thất bại. Vui lòng kiểm tra console.")
    }
  }

  // --- LOADING / ERROR STATES ---
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
  const isUpdating = updateProduct.isPending;

  // --- FORM UI ---
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
          <h1 className="text-3xl font-bold text-gray-900">Chỉnh sửa Sản phẩm: {formData.product_name}</h1>
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
                {/* Danh mục */}
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
                {/* Thương hiệu */}
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
              
              {/* Mô tả */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả sản phẩm</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={5}
                  className={defaultInputClass + " resize-none"}
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">Giá & Hình ảnh</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Giá gốc */}
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
              {/* URL ảnh */}
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">URL ảnh đại diện</label>
                <input
                  type="url"
                  name="thumbnail_url"
                  value={formData.thumbnail_url}
                  onChange={handleChange}
                  className={defaultInputClass}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">Cấu hình (Default Variation)</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* CPU */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CPU</label>
                <input type="text" name="processor" value={variationData.processor} onChange={handleChange} className={defaultInputClass} />
              </div>
              {/* RAM */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RAM</label>
                <input type="text" name="ram" value={variationData.ram} onChange={handleChange} className={defaultInputClass} />
              </div>
              {/* Ổ cứng */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ổ cứng</label>
                <input type="text" name="storage" value={variationData.storage} onChange={handleChange} className={defaultInputClass} />
              </div>
              {/* Tồn kho */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tồn kho *</label>
                <input
                  type="number"
                  name="stock_quantity"
                  value={variationData.stock_quantity}
                  onChange={handleChange}
                  min={0}
                  required
                  className={defaultInputClass}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isUpdating}
            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            {isUpdating ? "Đang cập nhật..." : "LƯU CẬP NHẬT"}
          </button>
          {updateProduct.isError && (
             <div className="text-red-600 text-sm mt-3">
                Cập nhật thất bại: {updateProduct.error.message || "Lỗi không xác định"}
             </div>
          )}
        </form>
      </div>
    </div>
  )
}