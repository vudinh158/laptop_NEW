// client/app/pages/LoginPage.jsx
import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForgotPassword, useLogin, useResetPassword } from "../hooks/useAuth";
import LoadingSpinner from "../components/LoadingSpinner";
import { FcGoogle } from "react-icons/fc";
import { FaFacebookSquare } from "react-icons/fa";

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const login = useLogin();
  const forgotPassword = useForgotPassword();
  const resetPassword = useResetPassword();
  const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  const mode = (searchParams.get("mode") || "").toLowerCase();
  const resetToken = searchParams.get("token") || "";
  const resetSuccess = searchParams.get("reset") === "success";
  const verifyMsg = searchParams.get("verify") || "";

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  const [resetForm, setResetForm] = useState({
    password: "",
    confirmPassword: "",
  });
  const [resetDone, setResetDone] = useState(false);
  const [localError, setLocalError] = useState("");

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

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");
    try {
      await forgotPassword.mutateAsync({ email: forgotEmail.trim() });
      setForgotSent(true);
    } catch (err) {
      const msg = err?.response?.data?.message || "Không thể gửi email. Vui lòng thử lại.";
      setLocalError(msg);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");
    if (!resetToken) {
      setLocalError("Thiếu token đặt lại mật khẩu.");
      return;
    }
    if (resetForm.password.length < 6) {
      setLocalError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }
    if (resetForm.password !== resetForm.confirmPassword) {
      setLocalError("Mật khẩu không khớp.");
      return;
    }
    try {
      await resetPassword.mutateAsync({ token: resetToken, password: resetForm.password });
      setResetDone(true);
      window.setTimeout(() => {
        navigate("/login?reset=success", { replace: true });
      }, 900);
    } catch (err) {
      const msg = err?.response?.data?.message || "Không thể đổi mật khẩu. Vui lòng thử lại.";
      setLocalError(msg);
    }
  };

  // helper lấy message lỗi từ BE
  const errorMsg =
    login.error?.response?.data?.message ||
    login.error?.message ||
    (login.error ? "Tên đăng nhập hoặc mật khẩu không đúng" : "");

  const verifyBanner = useMemo(() => {
    if (!verifyMsg) return "";
    if (verifyMsg === "missing") return "Thiếu thông tin xác nhận.";
    if (verifyMsg === "invalid") return "Link xác nhận không hợp lệ hoặc đã hết hạn.";
    if (verifyMsg === "notfound") return "Tài khoản không tồn tại.";
    if (verifyMsg === "error") return "Xác nhận thất bại. Vui lòng thử lại.";
    return "";
  }, [verifyMsg]);

  if (mode === "forgot") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-gray-900">Quên mật khẩu</h2>
              <p className="mt-2 text-gray-600">Nhập email để nhận link đặt lại mật khẩu</p>
            </div>

            {forgotSent ? (
              <div className="text-center space-y-4">
                <p className="text-gray-700">
                  Nếu email tồn tại trong hệ thống, chúng tôi đã gửi mail hướng dẫn đổi mật khẩu.
                </p>
                <Link
                  to="/login"
                  className="inline-block w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold text-center"
                >
                  Về trang đăng nhập
                </Link>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {localError && <div className="text-red-600 text-sm">{localError}</div>}

                <button
                  type="submit"
                  disabled={forgotPassword.isPending}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {forgotPassword.isPending ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Đang gửi...</span>
                    </>
                  ) : (
                    "Gửi email"
                  )}
                </button>

                <div className="text-center">
                  <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                    Quay lại đăng nhập
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (mode === "reset") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-gray-900">Đặt lại mật khẩu</h2>
              <p className="mt-2 text-gray-600">Nhập mật khẩu mới của bạn</p>
            </div>

            {resetDone ? (
              <div className="text-center text-green-700">
                Đổi mật khẩu thành công. Đang chuyển về đăng nhập...
              </div>
            ) : (
              <form onSubmit={handleResetSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
                  <input
                    type="password"
                    value={resetForm.password}
                    onChange={(e) => setResetForm((p) => ({ ...p, password: e.target.value }))}
                    required
                    minLength={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu</label>
                  <input
                    type="password"
                    value={resetForm.confirmPassword}
                    onChange={(e) =>
                      setResetForm((p) => ({ ...p, confirmPassword: e.target.value }))
                    }
                    required
                    minLength={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {localError && <div className="text-red-600 text-sm">{localError}</div>}
                {resetPassword.isError && !localError && (
                  <div className="text-red-600 text-sm">
                    {resetPassword.error?.response?.data?.message || "Đổi mật khẩu thất bại"}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={resetPassword.isPending}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {resetPassword.isPending ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    "Lưu mật khẩu mới"
                  )}
                </button>

                <div className="text-center">
                  <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                    Quay lại đăng nhập
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

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
              <div className="mt-2 text-right">
                <Link
                  to="/login?mode=forgot"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Quên mật khẩu?
                </Link>
              </div>
            </div>

            {resetSuccess && (
              <div className="text-green-700 text-sm">
                Đổi mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.
              </div>
            )}

            {verifyBanner && (
              <div className="text-red-600 text-sm">{verifyBanner}</div>
            )}

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
