import { useSelector } from "react-redux"
import { User, Mail, Phone, Calendar } from "lucide-react"

export default function ProfilePage() {
  const { user } = useSelector((state) => state.auth)

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Thông tin tài khoản</h1>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{user?.full_name}</h2>
              <p className="text-gray-600">{user?.roles?.map((role) => role.name).join(", ") || "Khách hàng"}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-sm text-gray-600">Email</div>
                <div className="font-medium text-gray-900">{user?.email}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-sm text-gray-600">Số điện thoại</div>
                <div className="font-medium text-gray-900">{user?.phone_number || "Chưa cập nhật"}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-sm text-gray-600">Ngày tham gia</div>
                <div className="font-medium text-gray-900">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString("vi-VN") : "N/A"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
