import { useState } from "react"
import { useProducts, useDeleteProduct } from "../../hooks/useProducts"
import LoadingSpinner from "../../components/LoadingSpinner"
import { Plus, Edit, Trash2 } from "lucide-react"
import { formatPrice } from "../../utils/formatters"
import { useNavigate } from "react-router-dom"

export default function AdminProducts() {
  const navigate = useNavigate()
  // Lấy dữ liệu products. API getProducts trả về các cột như product_id, product_name, category...
  const [page, setPage] = useState(1)
  const { data, isLoading } = useProducts({ page, limit: 20 })
  const deleteProduct = useDeleteProduct()

  // SỬA: Hàm DELETE sử dụng ID chính xác
  const handleDelete = async (id) => {
    if (window.confirm("Bạn có chắc muốn xóa sản phẩm này?")) {
      try {
        await deleteProduct.mutateAsync(id)
      } catch (error) {
        console.error("Delete failed:", error)
      }
    }
  }

  const handleAddProduct = () => {
    navigate("/admin/products/new")
  }

  // SỬA: Hàm EDIT sử dụng ID chính xác
  const handleEdit = (id) => {
    // ID được truyền vào sẽ là product.product_id
    if (id) {
      navigate(`/admin/products/edit/${id}`)
    } else {
      console.error("Lỗi: Product ID không xác định khi chỉnh sửa.", id)
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
  const pagination = data?.pagination || {};

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Quản lý sản phẩm</h1>
          <button 
            onClick={handleAddProduct}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            <span>Thêm sản phẩm</span>
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sản phẩm</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Danh mục</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giá</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data?.products?.map((product) => (
                // SỬA KEY VÀ TRUY CẬP ID: Dùng product.product_id để chắc chắn (dù product.id vẫn nên hoạt động)
                <tr key={product.product_id}> 
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        // Dùng product.thumbnail_url hoặc image đầu tiên (images là mảng object ProductImage)
                        src={product.images?.[0]?.image_url || product.thumbnail_url || "/placeholder.svg"} 
                        alt={product.product_name}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div className="font-medium text-gray-900">{product.product_name}</div>
                    </div>
                  </td>
                  {/* FIX LỖI N/A: Truy cập đúng thuộc tính category_name */}
                  <td className="px-6 py-4 text-sm text-gray-600">{product.category?.category_name || "N/A"}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {formatPrice(product.variations?.[0]?.price || 0)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        product.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {/* SỬA: Dùng is_active thay cho status */}
                      {product.is_active ? "Hoạt động" : "Không hoạt động"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* GÁN HÀM CHỈNH SỬA: Truyền product.product_id */}
                      <button 
                        onClick={() => handleEdit(product.product_id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {/* GÁN HÀM XÓA: Truyền product.product_id */}
                      <button
                        onClick={() => handleDelete(product.product_id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
    </div>
  )
}