// client/app/pages/LoginPage.jsx
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useLogin } from "../hooks/useAuth";
import LoadingSpinner from "../components/LoadingSpinner";
import { FcGoogle } from "react-icons/fc";
import { FaFacebookSquare } from "react-icons/fa";

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const login = useLogin();
  const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login.mutateAsync({
        username: formData.username.trim(),
        password: formData.password,
      });
      const redirect = searchParams.get("redirect") || "/";
      navigate(redirect);
    } catch (error) {
      // lỗi đã hiển thị dưới form
    }
  };

  // helper lấy message lỗi từ BE
  const errorMsg =
    login.error?.response?.data?.message ||
    login.error?.message ||
    (login.error ? "Tên đăng nhập hoặc mật khẩu không đúng" : "");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Đăng nhập</h2>
            <p className="mt-2 text-gray-600">Chào mừng bạn quay trở lại</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                autoComplete="username"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mật khẩu
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {login.isError && (
              <div className="text-red-600 text-sm">{errorMsg}</div>
            )}

            <button
              type="submit"
              disabled={login.isPending}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {login.isPending ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                "Đăng nhập"
              )}
            </button>
            {/* NÚT SOCIAL */}
            <div className="space-y-3 mb-6">
              <button
                type="button"
                onClick={() =>
                  window.location.assign(`${BACKEND}/api/auth/google`)
                }
                className="w-full border py-3 rounded-lg font-semibold flex items-center justify-center gap-3 hover:bg-gray-50"
              >
                <FcGoogle className="text-xl" aria-hidden="true" />
                <span>Đăng ký bằng Google</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  window.location.assign(`${BACKEND}/api/auth/facebook`)
                }
                className="w-full border py-3 rounded-lg font-semibold flex items-center justify-center gap-3 hover:bg-gray-50"
              >
                <FaFacebookSquare
                  className="text-xl text-[#1877F2]"
                  aria-hidden="true"
                />
                <span>Đăng ký bằng Facebook</span>
              </button>

              <div className="flex items-center gap-3 my-3">
                <div className="h-px bg-gray-200 flex-1" />
                <span className="text-gray-500 text-sm">hoặc</span>
                <div className="h-px bg-gray-200 flex-1" />
              </div>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Chưa có tài khoản?{" "}
              <Link
                to="/register"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Đăng ký ngay
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
