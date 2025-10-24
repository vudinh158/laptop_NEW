"use client";
import { useState, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useCreateOrder } from "../hooks/useOrders";
import { clearCart } from "../store/slices/cartSlice";
import { formatPrice } from "../utils/formatters";
import LoadingSpinner from "../components/LoadingSpinner";
import { useProvinces } from "../hooks/useProvinces";
import { useWards } from "../hooks/useWards";
import MapPicker from "../components/MapPicker";

export default function CheckoutPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items } = useSelector((state) => state.cart);
  const { user } = useSelector((state) => state.auth);
  const createOrder = useCreateOrder();

  // --- Province / Ward data ---
  const { data: provinces = [] } = useProvinces(true); // chỉ gọi ở Checkout
  const [provinceId, setProvinceId] = useState(""); // number/string id
  const { data: wards = [] } = useWards(provinceId || null);
  const [wardId, setWardId] = useState("");

  // --- Map (toạ độ + xác nhận) ---
  const [location, setLocation] = useState(null); // {lat, lng}
  const [locationConfirmed, setLocationConfirmed] = useState(false);

  // --- Form ---
  const [formData, setFormData] = useState({
    full_name: user?.full_name || "",
    email: user?.email || "",
    phone: user?.phone_number || "",
    address: "", // số nhà, tên đường
    city: "", // sẽ set theo province name
    district: "", // (tuỳ bạn dùng hay không)
    ward: "", // sẽ set theo ward name
    notes: "",
    payment_method: "COD",
  });

  // Tên hiển thị theo id (để ghép địa chỉ & fill vào formData.*)
  const provinceName = useMemo(
    () => provinces.find((p) => +p.province_id === +provinceId)?.name || "",
    [provinces, provinceId]
  );
  const wardName = useMemo(
    () => wards.find((w) => +w.ward_id === +wardId)?.name || "",
    [wards, wardId]
  );

  // Khi chọn province/ward → đồng bộ vào formData.city / formData.ward
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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Điều kiện đủ để cho phép submit
  const canSubmit = useMemo(() => {
    return (
      items?.length > 0 &&
      formData.full_name &&
      formData.phone &&
      formData.email &&
      formData.address &&
      provinceId &&
      wardId &&
      location &&
      locationConfirmed
    );
  }, [items, formData, provinceId, wardId, location, locationConfirmed]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    // Ghép địa chỉ hiển thị
    const shipping_address = [formData.address, wardName, provinceName]
      .filter(Boolean)
      .join(", ");

    const orderData = {
      shipping_address,
      shipping_phone: formData.phone,
      shipping_name: formData.full_name,
      notes: formData.notes,
      payment_method: formData.payment_method,

      // gửi thêm để BE lưu/phân tích phí ship
      province_id: +provinceId,
      ward_id: +wardId,
      geo_lat: location.lat,
      geo_lng: location.lng,

      items: items.map((item) => ({
        variation_id: item.variation_id,
        quantity: item.quantity,
        price: item.product?.variation?.price || 0,
      })),
    };

    try {
      await createOrder.mutateAsync(orderData);
      dispatch(clearCart());
      navigate("/orders");
    } catch (error) {
      console.error("Order creation failed:", error);
    }
  };

  // Tính tiền (giữ nguyên)
  const subtotal = items.reduce((total, item) => {
    const price = item.product?.variation?.price || 0;
    const discount = item.product?.variation?.discount_percentage || 0;
    const finalPrice = price * (1 - discount / 100);
    return total + finalPrice * item.quantity;
  }, 0);

  const shipping = 30000;
  const total = subtotal + shipping;

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Thanh toán</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                      Email *
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

                  {/* <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quận/Huyện *</label>
                    <input
                      type="text"
                      name="district"
                      value={formData.district}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div> */}

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
                        {provinceId
                          ? "-- Chọn Phường/Xã --"
                          : "Chọn Tỉnh/Thành trước"}
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
                      onChange={handleChange}
                      required
                      placeholder="Số nhà, tên đường"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {/* Map chọn & xác nhận vị trí */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Xác định vị trí trên bản đồ *
                    </label>
                    <MapPicker
                      value={location}
                      onChange={(latlng) => {
                        setLocation(latlng);
                        setLocationConfirmed(false);
                      }}
                      onConfirm={(latlng) => {
                        setLocation(latlng);
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
                      placeholder="Ghi chú về đơn hàng, ví dụ: thời gian hay chỉ dẫn địa điểm giao hàng chi tiết hơn"
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
                  <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-600">
                    <input
                      type="radio"
                      name="payment_method"
                      value="COD"
                      checked={formData.payment_method === "COD"}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div>
                      <div className="font-medium text-gray-900">
                        Thanh toán khi nhận hàng (COD)
                      </div>
                      <div className="text-sm text-gray-600">
                        Thanh toán bằng tiền mặt khi nhận hàng
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-600">
                    <input
                      type="radio"
                      name="payment_method"
                      value="BANK_TRANSFER"
                      checked={formData.payment_method === "BANK_TRANSFER"}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div>
                      <div className="font-medium text-gray-900">
                        Chuyển khoản ngân hàng
                      </div>
                      <div className="text-sm text-gray-600">
                        Chuyển khoản trực tiếp vào tài khoản ngân hàng
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-20">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Đơn hàng của bạn
                </h2>

                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                  {items.map((item) => {
                    const variation = item.product?.variation;
                    const price = variation?.price || 0;
                    const discount = variation?.discount_percentage || 0;
                    const finalPrice = price * (1 - discount / 100);

                    return (
                      <div key={item.id} className="flex gap-3">
                        <img
                          src={
                            item.product?.images?.[0]?.image_url ||
                            "/placeholder.svg?height=60&width=60&query=laptop"
                          }
                          alt={item.product?.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 line-clamp-2">
                            {item.product?.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            x{item.quantity}
                          </div>
                          <div className="text-sm font-semibold text-blue-600">
                            {formatPrice(finalPrice * item.quantity)}
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
                  disabled={createOrder.isPending}
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
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
