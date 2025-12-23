import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAdminQuestions, useCreateAnswer, useDeleteAnswer } from "../../hooks/useQuestions"
import { formatPrice } from "../../utils/formatters"
import LoadingSpinner from "../../components/LoadingSpinner"
import { Eye, MessageCircle, CheckCircle, XCircle, ArrowUp, ArrowDown, Filter, MessageSquare } from "lucide-react"

const AdminQuestions = () => {
  const [page, setPage] = useState(1)
  const [answeredFilter, setAnsweredFilter] = useState('all') // 'all', 'true', 'false'
  const [productFilter, setProductFilter] = useState('all') // 'all', 'true', 'false'
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('DESC')
  const [showFilters, setShowFilters] = useState(false)
  const [answerModal, setAnswerModal] = useState({ show: false, question: null, answer: '' })

  const navigate = useNavigate()

  const { data, isLoading, error, refetch } = useAdminQuestions({
    page,
    limit: 20,
    answered: answeredFilter === 'all' ? undefined : answeredFilter,
    has_product: productFilter === 'all' ? undefined : productFilter,
    sort_by: sortBy,
    sort_order: sortOrder
  })

  const createAnswer = useCreateAnswer()
  const deleteAnswer = useDeleteAnswer()

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')
    } else {
      setSortBy(field)
      setSortOrder('DESC')
    }
  }

  const handleCreateAnswer = async () => {
    if (!answerModal.answer.trim()) return

    try {
      await createAnswer.mutateAsync({
        questionId: answerModal.question.question_id,
        answerText: answerModal.answer
      })
      setAnswerModal({ show: false, question: null, answer: '' })
    } catch (error) {
      alert('Có lỗi khi tạo câu trả lời')
    }
  }

  const handleDeleteAnswer = async (questionId, answerId) => {
    if (!confirm('Bạn có chắc muốn xóa câu trả lời này?')) return

    try {
      await deleteAnswer.mutateAsync({
        questionId,
        answerId
      })
    } catch (error) {
      alert('Có lỗi khi xóa câu trả lời')
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-600 py-10 text-center">
        Không tải được dữ liệu câu hỏi
      </div>
    )
  }

  const { questions = [], pagination = {} } = data || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quản lý câu hỏi</h1>
          <p className="text-gray-600 mt-1">Trả lời và quản lý câu hỏi từ khách hàng</p>
        </div>
        <button
          onClick={() => refetch()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Làm mới
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Bộ lọc</h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Filter className="w-4 h-4 mr-2" />
            {showFilters ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trạng thái trả lời
              </label>
              <select
                value={answeredFilter}
                onChange={(e) => setAnsweredFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="all">Tất cả</option>
                <option value="false">Chưa trả lời</option>
                <option value="true">Đã trả lời</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Liên quan sản phẩm
              </label>
              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="all">Tất cả</option>
                <option value="true">Có sản phẩm</option>
                <option value="false">Câu hỏi chung</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setAnsweredFilter('all')
                  setProductFilter('all')
                  setPage(1)
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Xóa bộ lọc
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Questions Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  STT
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Câu hỏi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Khách hàng
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Sản phẩm
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  <button
                    onClick={() => handleSort('created_at')}
                    className="flex items-center hover:text-gray-700"
                  >
                    Thời gian
                    {sortBy === 'created_at' && (
                      sortOrder === 'ASC' ?
                        <ArrowUp className="w-4 h-4 ml-1" /> :
                        <ArrowDown className="w-4 h-4 ml-1" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {questions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    Không có câu hỏi nào
                  </td>
                </tr>
              ) : (
                questions.map((question, index) => (
                  <tr key={question.question_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      #{(page - 1) * 20 + index + 1}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                      <div className="truncate" title={question.question_text}>
                        {question.question_text}
                      </div>
                      {question.answers && question.answers.length > 0 && (
                        <div className="text-xs text-green-600 mt-1">
                          {question.answers.length} câu trả lời
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-700">
                      <div>
                        <div className="font-medium">{question.user?.full_name}</div>
                        <div className="text-xs text-gray-500">{question.user?.email}</div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-700">
                      {question.product ? (
                        <div>
                          <div className="font-medium">{question.product.product_name}</div>
                          <div className="text-xs text-gray-500">ID: {question.product.product_id}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Câu hỏi chung</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(question.created_at)}
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        question.is_answered
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {question.is_answered ? 'Đã trả lời' : 'Chưa trả lời'}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => navigate(`/admin/questions/${question.question_id}`)}
                          className="p-2 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {!question.is_answered ? (
                          <button
                            onClick={() => setAnswerModal({
                              show: true,
                              question,
                              answer: ''
                            })}
                            className="p-2 text-gray-400 hover:text-green-600 rounded hover:bg-green-50"
                            title="Trả lời"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-green-500">
                            <CheckCircle className="w-5 h-5" />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 px-6 py-4 border-t border-gray-200">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Trước
            </button>

            {[...Array(pagination.totalPages)].map((_, i) => {
              const pageNum = i + 1
              if (
                pageNum === 1 ||
                pageNum === pagination.totalPages ||
                Math.abs(pageNum - page) <= 1
              ) {
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-4 py-2 rounded-lg ${
                      page === pageNum
                        ? "bg-blue-600 text-white"
                        : "border border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              } else if (
                (pageNum === 2 && page > 3) ||
                (pageNum === pagination.totalPages - 1 && page < pagination.totalPages - 2)
              ) {
                return <span key={pageNum} className="px-2">...</span>
              }
              return null
            })}

            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sau
            </button>
          </div>
        )}
      </div>

      {/* Answer Modal */}
      {answerModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Trả lời câu hỏi
              </h3>

              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="font-medium text-gray-900 mb-2">
                  Câu hỏi từ {answerModal.question.user?.full_name}:
                </div>
                <div className="text-gray-700">
                  {answerModal.question.question_text}
                </div>
                {answerModal.question.product && (
                  <div className="text-sm text-gray-500 mt-2">
                    Về sản phẩm: {answerModal.question.product.product_name}
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Câu trả lời của bạn
                </label>
                <textarea
                  value={answerModal.answer}
                  onChange={(e) => setAnswerModal(prev => ({ ...prev, answer: e.target.value }))}
                  rows={6}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nhập câu trả lời của bạn..."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setAnswerModal({ show: false, question: null, answer: '' })}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleCreateAnswer}
                  disabled={!answerModal.answer.trim() || createAnswer.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createAnswer.isPending ? 'Đang gửi...' : 'Gửi trả lời'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminQuestions

