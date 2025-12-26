import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useAdminQuestionDetail, useCreateAnswer, useUpdateAnswer, useDeleteAnswer } from "../../hooks/useQuestions"
import LoadingSpinner from "../../components/LoadingSpinner"
import { ArrowLeft, MessageSquare, Edit, Trash2, Save, X } from "lucide-react"

const AdminQuestionDetail = () => {
  const { question_id } = useParams()
  const navigate = useNavigate()
  const [newAnswer, setNewAnswer] = useState('')
  const [editingAnswer, setEditingAnswer] = useState({ id: null, text: '' })

  const { data, isLoading, error } = useAdminQuestionDetail(question_id)
  const createAnswer = useCreateAnswer()
  const updateAnswer = useUpdateAnswer()
  const deleteAnswer = useDeleteAnswer()

  const handleCreateAnswer = async () => {
    if (!newAnswer.trim()) return

    try {
      await createAnswer.mutateAsync({
        questionId: question_id,
        answerText: newAnswer
      })
      setNewAnswer('')
    } catch (error) {
      alert('Có lỗi khi tạo câu trả lời')
    }
  }

  const handleUpdateAnswer = async (answerId) => {
    if (!editingAnswer.text.trim()) return

    try {
      await updateAnswer.mutateAsync({
        questionId: question_id,
        answerId,
        answerText: editingAnswer.text
      })
      setEditingAnswer({ id: null, text: '' })
    } catch (error) {
      alert('Có lỗi khi cập nhật câu trả lời')
    }
  }

  const handleDeleteAnswer = async (answerId) => {
    if (!confirm('Bạn có chắc muốn xóa câu trả lời này?')) return

    try {
      await deleteAnswer.mutateAsync({
        questionId: question_id,
        answerId
      })
    } catch (error) {
      alert('Có lỗi khi xóa câu trả lời')
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
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
        Không tải được chi tiết câu hỏi
      </div>
    )
  }

  const { question } = data || {}

  if (!question) {
    return (
      <div className="text-gray-600 py-10 text-center">
        Không tìm thấy câu hỏi
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/admin/questions')}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Quay lại danh sách
        </button>
        <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
          question.is_answered
            ? 'bg-green-100 text-green-800'
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {question.is_answered ? 'Đã trả lời' : 'Chưa trả lời'}
        </span>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Câu hỏi #{question.question_id}
              </h1>
              <p className="text-sm text-gray-500">
                Đặt bởi {question.user?.full_name} • {formatDate(question.created_at)}
              </p>
            </div>
          </div>
        </div>

        <div className="prose prose-gray max-w-none mb-4">
          <p className="text-gray-700 text-lg leading-relaxed">
            {question.question_text}
          </p>
        </div>

        {question.product && (
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <h3 className="font-medium text-blue-900 mb-2">Liên quan đến sản phẩm:</h3>
            <div className="flex items-center space-x-3">
              <div className="font-medium text-blue-800">
                {question.product.product_name}
              </div>
              <span className="text-sm text-blue-600">
                ID: {question.product.product_id}
              </span>
            </div>
          </div>
        )}

        <div className="border-t pt-4">
          <div className="text-sm text-gray-600">
            <strong>Thông tin khách hàng:</strong><br />
            Tên: {question.user?.full_name}<br />
            Email: {question.user?.email}<br />
            {question.user?.phone_number && `SĐT: ${question.user?.phone_number}`}
          </div>
        </div>
      </div>

      {/* Answers Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Câu trả lời ({question.answers?.length || 0})
          </h2>
        </div>

        {/* Existing Answers */}
        <div className="space-y-4 mb-6">
          {question.answers?.map((answer) => (
            <div key={answer.answer_id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-green-600">A</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Admin • {formatDate(answer.created_at)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Cập nhật: {formatDate(answer.updated_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setEditingAnswer({
                      id: answer.answer_id,
                      text: answer.answer_text
                    })}
                    className="p-1 text-gray-400 hover:text-blue-600"
                    title="Chỉnh sửa"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteAnswer(answer.answer_id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title="Xóa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {editingAnswer.id === answer.answer_id ? (
                <div className="space-y-3">
                  <textarea
                    value={editingAnswer.text}
                    onChange={(e) => setEditingAnswer(prev => ({ ...prev, text: e.target.value }))}
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setEditingAnswer({ id: null, text: '' })}
                      className="px-3 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={() => handleUpdateAnswer(answer.answer_id)}
                      disabled={!editingAnswer.text.trim() || updateAnswer.isPending}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {updateAnswer.isPending ? 'Đang lưu...' : 'Lưu'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {answer.answer_text}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add New Answer */}
        {!question.is_answered && (
          <div className="border-t pt-6">
            <h3 className="text-md font-medium text-gray-900 mb-4">
              Thêm câu trả lời mới
            </h3>

            <div className="space-y-4">
              <textarea
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                rows={5}
                placeholder="Nhập câu trả lời của bạn..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              <div className="flex justify-end">
                <button
                  onClick={handleCreateAnswer}
                  disabled={!newAnswer.trim() || createAnswer.isPending}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createAnswer.isPending ? 'Đang gửi...' : 'Gửi trả lời'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminQuestionDetail







