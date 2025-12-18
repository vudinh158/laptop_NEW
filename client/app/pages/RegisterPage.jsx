// client/app/pages/RegisterPage.jsx
import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRegisterEmailVerification } from "../hooks/useAuth";
import { useDispatch } from "react-redux";
import { setCredentials } from "../store/slices/authSlice";
import api from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import { FcGoogle } from "react-icons/fc";
import { FaFacebookSquare } from "react-icons/fa";

export default function RegisterPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const register = useRegisterEmailVerification();

  const [emailSent, setEmailSent] = useState(false);
  const [sentTo, setSentTo] = useState("");

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    full_name: "",
    phone_number: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFieldErrors((prev) => ({ ...prev, [e.target.name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setFieldErrors((prev) => ({
        ...prev,
        confirmPassword: "Mật khẩu không khớp",
      }));
      return;
    }
    try {
      await register.mutateAsync({
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        full_name: formData.full_name.trim(),
        phone_number: formData.phone_number.trim(),
      });
      setEmailSent(true);
      setSentTo(formData.email.trim());
    } catch (error) {
      const res = error?.response?.data;
      const next = {};
      if (Array.isArray(res?.errors)) {
        for (const err of res.errors) {
          const fieldName = err.field || err.param || err.path;
          const message = err.message || err.msg;
          if (fieldName && message) next[fieldName] = message;
        }
      }
      if (!Object.keys(next).length) {
        next.general = res?.message || "Đăng ký thất bại. Vui lòng thử lại.";
      }
      setFieldErrors(next);
    }
  };

  // ======= SOCIAL AUTH (Google/Facebook) =======
  const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  // Nhận token từ callback OAuth và hoàn tất đăng nhập
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) return;
    (async () => {
      try {
        api.defaults.headers.common.Authorization = `Bearer ${token}`;
        const { data } = await api.get("/auth/me");
        dispatch(setCredentials({ token, user: data.user }));
        // Xoá token trên URL cho sạch
        window.history.replaceState({}, "", "/register");
        // Sau khi “đăng ký bằng mạng xã hội” xong -> vào trang chủ (hoặc profile tuỳ bạn)
        navigate("/");
      } catch (e) {
        // noop
      }
    })();
  }, [dispatch, navigate]);

  const dupHints = useMemo(() => {
    const arr = [];
    if (fieldErrors.username) arr.push(fieldErrors.username);
    if (fieldErrors.email) arr.push(fieldErrors.email);
    if (fieldErrors.phone_number) arr.push(fieldErrors.phone_number);
    return arr;
  }, [fieldErrors]);

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Kiểm tra email của bạn</h2>
              <p className="mt-3 text-gray-600">
                Hệ thống đã gửi email xác nhận.
              </p>
              {sentTo && (
                <p className="mt-2 text-gray-700 font-medium">{sentTo}</p>
              )}
              <p className="mt-3 text-gray-600">
                Vui lòng bấm nút <span className="font-semibold">Xác nhận</span> trong email để kích hoạt tài khoản.
              </p>
              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold"
                >
                  Về trang đăng nhập
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmailSent(false);
                    setSentTo("");
                  }}
                  className="w-full border py-3 rounded-lg font-semibold hover:bg-gray-50"
                >
                  Quay lại đăng ký
                </button>
              </div>
            </div>
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
            <h2 className="text-3xl font-bold text-gray-900">Đăng ký</h2>
            <p className="mt-2 text-gray-600">Tạo tài khoản mới</p>
          </div>

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

          {/* FORM ĐĂNG KÝ THƯỜNG */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Họ và tên
              </label>
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
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  fieldErrors.username ? "border-red-500" : "border-gray-300"
                }`}
              />
              {fieldErrors.username && (
                <p className="text-sm text-red-600 mt-1">
                  {fieldErrors.username}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số điện thoại
              </label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mật khẩu
              </label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Xác nhận mật khẩu
              </label>
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
                <p className="text-sm text-red-600 mt-1">
                  {fieldErrors.confirmPassword}
                </p>
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
              <Link
                to="/login"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Đăng nhập
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
