// client/pages/CheckoutPage.jsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { useCreateOrder } from "../hooks/useOrders";
import { removeMany } from "../store/slices/cartSlice"; // dùng để xóa các món đã mua (cart-mode)
import { formatPrice } from "../utils/formatters";
import LoadingSpinner from "../components/LoadingSpinner";
import { useProvinces } from "../hooks/useProvinces";
import { useWards } from "../hooks/useWards";
import MapPicker from "../components/MapPicker";
import PaymentOptions from "../components/PaymentOptions";

/**
 * CheckoutPage phân nhánh theo "checkout intent"
 * - navigate("/checkout", { state: { mode: "buy_now", items: [{variation_id, quantity}] } })
 * - navigate("/checkout", { state: { mode: "cart",    items: [{variation_id, quantity}] } })
 *
 * LƯU Ý: Không tự ý lấy toàn bộ cart nữa; chỉ render & submit theo items đã truyền.
 */
export default function CheckoutPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // ====== 1) ĐỌC CHECKOUT INTENT ======
  const intentMode = location.state?.mode || null; // "buy_now" | "cart" | null
  const intentItems = Array.isArray(location.state?.items)
    ? location.state.items
    : [];

  // Dùng cart Redux chỉ để "làm giàu" dữ liệu hiển thị và xác định id của item để removeMany (cart-mode)
  const { items: cartItems } = useSelector((state) => state.cart);
  const { user } = useSelector((state) => state.auth);

  // Chuẩn hóa items để hiển thị: ghép thêm thông tin product/ảnh nếu tìm thấy trong cart
  const viewItems = useMemo(() => {
    // key theo variation_id để tìm trên cart
    const byVarId = new Map(cartItems.map((ci) => [ci.variation_id, ci]));
    return intentItems.map((it) => {
      const inCart = byVarId.get(it.variation_id);
      // fallback khi không tìm thấy trong cart (buy_now có thể không qua cart)
      return {
        variation_id: it.variation_id,
        quantity: Math.max(1, Number(it.quantity) || 1),
        product: inCart?.product || null, // {images, thumbnail_url, product_name, variation, ...}
        // giữ lại id của cart item để xóa chính xác sau COD (cart-mode)
        cart_id: inCart?.id || null,
      };
    });
  }, [intentItems, cartItems]);

  // Nếu không có intent hợp lệ → quay về giỏ để tránh nhầm luồng
  useEffect(() => {
    if (!intentMode || intentItems.length === 0) {
      navigate("/cart", { replace: true });
    }
  }, [intentMode, intentItems.length, navigate]);

  // ====== 2) DỮ LIỆU ĐỊA GIỚI/HÌNH THỨC THANH TOÁN ======
  const { data: provinces = [] } = useProvinces(true);
  const [provinceId, setProvinceId] = useState("");
  const { data: wards = [] } = useWards(provinceId || null);
  const [wardId, setWardId] = useState("");

  const [locationLL, setLocationLL] = useState(null); // {lat, lng}
  const [locationConfirmed, setLocationConfirmed] = useState(false);

  const [payment, setPayment] = useState({
    payment_provider: "COD",
    payment_method: "COD",
  });

  const [formData, setFormData] = useState({
    full_name: user?.full_name || "",
    email: user?.email || "",
    phone: user?.phone_number || "",
    address: "",
    city: "",
    ward: "",
    notes: "",
  });

  const provinceName = useMemo(
    () => provinces.find((p) => +p.province_id === +provinceId)?.name || "",
    [provinces, provinceId]
  );
  const wardName = useMemo(
    () => wards.find((w) => +w.ward_id === +wardId)?.name || "",
    [wards, wardId]
  );

  const handleProvinceChange = (e) => {
    const id = e.target.value;
    setProvinceId(id);
    setWardId("");
    setFormData((prev) => ({
      ...prev,
      city: provinces.find((p) => +p.province_id === +id)?.name || "",
    }));
  };
  const handleWardChange = (e) => {
    const id = e.target.value;
    setWardId(id);
    setFormData((prev) => ({
      ...prev,
      ward: wards.find((w) => +w.ward_id === +id)?.name || "",
    }));
  };
  const handleChange = (e) =>
    setFormData((s) => ({ ...s, [e.target.name]: e.target.value }));

  // ====== 3) GEOCODE ĐỊA CHỈ (giữ nguyên tinh thần cũ) ======
  function removeAccents(s = "") {
    return s
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/đ/gi, "d");
  }
  function cleanAddressDetail(addr = "", wardName = "", provinceName = "") {
    let a = addr.trim();
    const adminWords = [
      "phường",
      "p.",
      "p ",
      "xã",
      "x.",
      "x ",
      "quận",
      "huyện",
      "thành phố",
      "tp.",
      "tp ",
      "tỉnh",
    ];
    const patterns = [wardName, provinceName, ...adminWords.map((w) => `\\b${w}\\b`)]
      .filter(Boolean)
      .map((w) => removeAccents(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    if (patterns.length) {
      const re = new RegExp(`(?:${patterns.join("|")})`, "gi");
      a = a.replace(re, " ");
    }
    a = a.replace(/[,]+/g, " ").replace(/\s{2,}/g, " ").trim();
    return a;
  }

  async function geocodeAddress(addressDetail) {
    if (!provinceId || !wardId || !addressDetail) return;
    const q = `${addressDetail}, ${wardName}, ${provinceName}, Vietnam`;
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
        q
      )}`;
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "laptopstore-checkout/1.0 (contact: your-email@example.com)",
        },
      });
      const arr = await res.json();
      if (Array.isArray(arr) && arr.length > 0) {
        const lat = parseFloat(arr[0].lat);
        const lng = parseFloat(arr[0].lon);
        setLocationLL({ lat, lng });
        setLocationConfirmed(true);
      } else {
        alert("Không tìm thấy vị trí phù hợp. Hãy nhập địa chỉ chi tiết hơn.");
      }
    } catch (e) {
      console.error("GEOCODE ERROR:", e);
      alert("Không thể tìm vị trí. Vui lòng thử lại.");
    }
  }

  useEffect(() => {
    if (!provinceId || !wardId || !formData.address?.trim()) return;
    const cleaned = cleanAddressDetail(formData.address, wardName, provinceName);
    const t = setTimeout(() => geocodeAddress(cleaned), 500);
    return () => clearTimeout(t);
  }, [provinceId, wardId, formData.address, wardName, provinceName]);

  // ====== 4) TÍNH TOÁN HIỂN THỊ TẠM TÍNH (chỉ để UI) ======
  // Lấy giá từ cart (nếu tìm thấy), nếu không thì 0—BE sẽ tính thật.
  const subtotal = useMemo(() => {
    return viewItems.reduce((sum, it) => {
      const price = Number(it.product?.variation?.price || 0);
      const pct = Number(it.product?.discount_percentage || 0);
      const final = price * (1 - pct / 100);
      return sum + final * it.quantity;
    }, 0);
  }, [viewItems]);

  const shipping = 30000;
  const total = subtotal + shipping;

  // ====== 5) ĐIỀU KIỆN SUBMIT ======
  const canSubmit = useMemo(() => {
    return (
      viewItems.length > 0 &&
      formData.full_name &&
      formData.phone &&
      formData.email &&
      formData.address &&
      provinceId &&
      wardId &&
      locationLL &&
      locationConfirmed
    );
  }, [viewItems.length, formData, provinceId, wardId, locationLL, locationConfirmed]);

  // ====== 6) SUBMIT ORDER (LUÔN gửi items theo intent) ======
  const createOrder = useCreateOrder();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit || createOrder.isPending) return;

    const addressDetail = cleanAddressDetail(formData.address, wardName, provinceName);
    const shipping_address = [addressDetail, wardName, provinceName].filter(Boolean).join(", ");

    const orderData = {
      shipping_address,
      shipping_phone: formData.phone,
      shipping_name: formData.full_name,
      note: formData.notes,
      payment_provider: payment.payment_provider,
      payment_method: payment.payment_method,
      province_id: +provinceId,
      ward_id: +wardId,
      geo_lat: locationLL.lat,
      geo_lng: locationLL.lng,
      // QUAN TRỌNG: chỉ gửi variation_id & quantity — BE tự tính giá/giảm giá & trừ kho
      items: viewItems.map((it) => ({
        variation_id: it.variation_id,
        quantity: it.quantity,
      })),
    };

    try {
      const res = await createOrder.mutateAsync(orderData); // POST /orders
      // VNPAY: nếu có redirect -> đi ngay, không đụng cart
      if (res?.redirect) {
        window.location.href = res.redirect;
        return;
      }

      // COD:
      if (intentMode === "cart") {
        // Xóa CHỈ những món đã mua khỏi giỏ
        const idsToRemove = viewItems
          .map((it) => it.cart_id)
          .filter(Boolean); // chỉ những item có mặt trong cart Redux
        if (idsToRemove.length > 0) {
          dispatch(removeMany({ ids: idsToRemove }));
        }
      }
      // buy_now: không chạm vào cart
      navigate("/orders");
    } catch (error) {
      console.error("CREATE ORDER ERROR:", error?.response?.data || error.message);
      // todo: hiển thị toast hoặc thông báo lỗi cụ thể
    }
  };

  // ====== 7) UI ======
  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Thanh toán</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* ===== CỘT TRÁI: THÔNG TIN GIAO HÀNG + THANH TOÁN ===== */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Thông tin giao hàng
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Họ và tên *
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
                      Số điện thoại *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tỉnh/Thành phố *
                    </label>
                    <select
                      name="city"
                      value={provinceId}
                      onChange={handleProvinceChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Chọn Tỉnh/Thành --</option>
                      {provinces.map((p) => (
                        <option key={p.province_id} value={p.province_id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phường/Xã *
                    </label>
                    <select
                      name="ward"
                      value={wardId}
                      onChange={handleWardChange}
                      required
                      disabled={!provinceId}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="">
                        {provinceId ? "-- Chọn Phường/Xã --" : "Chọn Phường/Xã"}
                      </option>
                      {wards.map((w) => (
                        <option key={w.ward_id} value={w.ward_id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Địa chỉ *
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={(e) => {
                        handleChange(e);
                        setLocationConfirmed(false);
                      }}
                      required
                      disabled={!provinceId || !wardId}
                      placeholder="Số nhà, tên đường (vd: 109 Hiệp Bình)"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                  </div>

                  {/* Map chọn & xác nhận vị trí */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Xác định vị trí trên bản đồ *
                    </label>
                    <MapPicker
                      value={locationLL}
                      onChange={(latlng) => {
                        setLocationLL(latlng);
                        setLocationConfirmed(false);
                      }}
                      onConfirm={(latlng) => {
                        setLocationLL(latlng);
                        setLocationConfirmed(true);
                      }}
                    />
                    {!locationConfirmed && (
                      <p className="text-xs text-amber-600 mt-1">
                        Bạn cần nhấn “Xác nhận vị trí” để tiếp tục.
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ghi chú
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Ghi chú về đơn hàng (thời gian giao, chỉ dẫn chi tiết...)"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Phương thức thanh toán
                </h2>
                <div className="space-y-3">
                  <PaymentOptions onChange={setPayment} />
                </div>
              </div>
            </div>

            {/* ===== CỘT PHẢI: ĐƠN HÀNG ===== */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-20">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Đơn hàng của bạn
                </h2>

                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                  {viewItems.map((it) => {
                    const img =
                      it.product?.images?.[0]?.image_url ||
                      it.product?.thumbnail_url ||
                      "/placeholder.svg?height=60&width=60&query=laptop";
                    const name =
                      it.product?.product_name ||
                      it.product?.name ||
                      `Variation #${it.variation_id}`;
                    const price = Number(it.product?.variation?.price || 0);
                    const pct = Number(it.product?.discount_percentage || 0);
                    const final = price * (1 - pct / 100);

                    return (
                      <div key={`${it.variation_id}`} className="flex gap-3">
                        <img
                          src={img}
                          alt={name}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 line-clamp-2">
                            {name}
                          </div>
                          <div className="text-sm text-gray-600">x{it.quantity}</div>
                          <div className="text-sm font-semibold text-blue-600">
                            {formatPrice(final * it.quantity)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-gray-200 pt-4 space-y-3">
                  <div className="flex justify-between text-gray-600">
                    <span>Tạm tính</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Phí vận chuyển</span>
                    <span>{formatPrice(shipping)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3 flex justify-between text-lg font-bold text-gray-900">
                    <span>Tổng cộng</span>
                    <span className="text-blue-600">{formatPrice(total)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!canSubmit || createOrder.isPending}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold mt-6 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {createOrder.isPending ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    "Đặt hàng"
                  )}
                </button>

                {intentMode && (
                  <p className="text-xs text-gray-500 mt-3">
                    Chế độ: <b>{intentMode === "buy_now" ? "Mua ngay" : "Giỏ hàng"}</b>
                  </p>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
  