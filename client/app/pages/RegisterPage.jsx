"use client"

import { useState, useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useRegister } from "../hooks/useAuth"
import LoadingSpinner from "../components/LoadingSpinner"

export default function RegisterPage() {
  const navigate = useNavigate()
  const register = useRegister()

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    full_name: "",
    phone_number: "",
  })

  const [fieldErrors, setFieldErrors] = useState({})

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setFieldErrors((prev) => ({ ...prev, [e.target.name]: null }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      setFieldErrors((prev) => ({ ...prev, confirmPassword: "Mật khẩu không khớp" }))
      return
    }
    try {
      await register.mutateAsync({
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        full_name: formData.full_name.trim(),
        phone_number: formData.phone_number.trim(),
      })
      navigate("/login")
    } catch (error) {
    const res = error?.response?.data
    const next = {}
    // Map 2 dạng:
    // 1) Duplicate/tuỳ chỉnh: { errors: [{ field, message }] }
    // 2) express-validator: { errors: [{ param, msg }] }
    if (Array.isArray(res?.errors)) {
      for (const err of res.errors) {
        const fieldName = err.field || err.param || err.path
        const message = err.message || err.msg
        if (fieldName && message) next[fieldName] = message
      }
    }
    if (!Object.keys(next).length) {
      next.general = res?.message || "Đăng ký thất bại. Vui lòng thử lại."
    }
    setFieldErrors(next)
  }
  }

  const dupHints = useMemo(() => {
    const arr = []
    if (fieldErrors.username) arr.push(fieldErrors.username)
    if (fieldErrors.email) arr.push(fieldErrors.email)
    if (fieldErrors.phone_number) arr.push(fieldErrors.phone_number)
    return arr
  }, [fieldErrors])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Đăng ký</h2>
            <p className="mt-2 text-gray-600">Tạo tài khoản mới</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                autoComplete="username"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  fieldErrors.username ? "border-red-500" : "border-gray-300"
                }`}
              />
              {fieldErrors.username && <p className="text-sm text-red-600 mt-1">{fieldErrors.username}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
              <input
                type="tel"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                minLength={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
               {fieldErrors.confirmPassword && (
                <p className="text-sm text-red-600 mt-1">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            {(fieldErrors.general || dupHints.length > 0) && (
              <div className="text-red-600 text-sm space-y-1">
                {fieldErrors.general && <p>{fieldErrors.general}</p>}
                {dupHints.map((m, i) => (
                  <p key={i}>• {m}</p>
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={register.isPending}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {register.isPending ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Đang đăng ký...</span>
                </>
              ) : (
                "Đăng ký"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Đã có tài khoản?{" "}
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Đăng nhập
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
