// client/app/pages/OAuthSuccess.jsx
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setCredentials } from "../store/slices/authSlice";
import api from "../services/api";

export default function OAuthSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    const token = params.get("token");
    if (token) {
      // set header + fetch /auth/me để lấy user
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      localStorage.setItem("token", token);
      // gọi /auth/me để lấy user rồi set vào store
      api.get("/auth/me").then(({ data }) => {
        dispatch(setCredentials({ token, user: data.user }));

        // Kiểm tra xem có pending checkout data không
        const pendingCheckout = localStorage.getItem('pendingCheckout');
        if (pendingCheckout) {
          try {
            const checkoutData = JSON.parse(pendingCheckout);
            localStorage.removeItem('pendingCheckout'); // Xóa sau khi sử dụng
            // Navigate đến checkout với data đã lưu
            navigate('/checkout', { state: checkoutData, replace: true });
            return;
          } catch (e) {
            console.error('Error parsing pending checkout data:', e);
          }
        }

        navigate("/", { replace: true });
      }).catch(() => {
        navigate("/login?oauth=failed", { replace: true });
      });
    } else {
      navigate("/login?oauth=missing", { replace: true });
    }
  }, [params, navigate, dispatch]);

  return <div className="p-6 text-center">Đang hoàn tất đăng nhập...</div>;
}
