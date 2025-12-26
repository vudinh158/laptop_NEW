// client/app/components/EditShippingAddressDialog.jsx
import { useEffect, useState } from "react";
import { useWards } from "../hooks/useWards";
import { useShippingQuote } from "../hooks/useShippingQuote";
import MapPicker from "./MapPicker";

export default function EditShippingAddressDialog({
  open,
  onClose,
  onSubmit, // (payload) => void
  initialValue = {},
  disabled,
  currentShippingFee = 0, // phí ship hiện tại
  provincesData, // preload từ parent để tránh timing issues
  subtotal = 0, // subtotal sau discount để tính shipping
}) {
  const [form, setForm] = useState({
    shipping_name: "",
    shipping_phone: "",
    shipping_address: "",
    province_id: "",
    ward_id: "",
    geo_lat: "",
    geo_lng: "",
  });

  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    newShippingFee: 0,
    priceDifference: 0,
  });

  // Map picker states
  const [locationLL, setLocationLL] = useState(initialValue?.geo_lat && initialValue?.geo_lng ? {
    lat: initialValue.geo_lat,
    lng: initialValue.geo_lng
  } : null);
  const [mapCenter, setMapCenter] = useState(null);
  const [mapZoom, setMapZoom] = useState(15);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [locBanner, setLocBanner] = useState(null);

  // Use preloaded provinces data from parent to avoid modal timing issues
  const provinces = provincesData || [];

  // Always call useWards but with proper provinceId
  const provinceId = form.province_id ? Number(form.province_id) : null;
  const { data: wardsData } = useWards(provinceId);
  const wards = wardsData || [];

  // Sử dụng shippingService để tính phí ship chính xác
  const { data: shippingQuote, loading: shippingLoading, error: shippingError } = useShippingQuote({
    provinceId: form.province_id,
    wardId: form.ward_id,
    subtotal: subtotal,
  });

  // Tính phí ship mới từ shippingService
  const newShippingFee = shippingQuote?.shipping_fee || 0;
  const shippingReason = shippingQuote?.reason || null;

  // Geocode đơn giản
  const geocodeSimple = async (query) => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "laptopstore-checkout/1.0",
      },
    });
    const arr = await res.json();
    if (Array.isArray(arr) && arr.length > 0) {
      return { lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon) };
    }
    return null;
  };

  // Geocode địa chỉ chi tiết
  const geocodeAddress = async (addressDetail) => {
    if (!form.province_id || !form.ward_id || !addressDetail?.trim()) return;

    const province = provinces.find(p => p.province_id === Number(form.province_id));
    const ward = wards.find(w => w.ward_id === Number(form.ward_id));

    if (!province || !ward) return;

    const q = `${addressDetail.trim()}, ${ward.name || ward.ward_name}, ${province.name || province.province_name}, Vietnam`;

    try {
      const center = await geocodeSimple(q);
      if (center) {
        setLocationLL(center);
        setMapCenter(center);
        setMapZoom(17);
        setLocationConfirmed(false);
        setLocBanner({
          type: "warning",
          text: "Đã tìm thấy vị trí gần đúng từ địa chỉ. Hãy kiểm tra marker và nhấn 'Xác nhận vị trí'.",
        });
      } else {
        setLocBanner({
          type: "warning",
          text: "Không tìm thấy vị trí phù hợp, quý khách vui lòng định vị thủ công, xin lỗi vì sự bất tiện này"
        });
      }
    } catch (error) {
      console.error('Geocode error:', error);
      setLocBanner({
        type: "error",
        text: "Lỗi khi tìm kiếm vị trí, vui lòng thử lại hoặc định vị thủ công"
      });
    }
  };

  // Handle address blur (tìm vị trí khi blur khỏi ô địa chỉ)
  const handleAddressBlur = async () => {
    if (!form.province_id || !form.ward_id || !form.shipping_address?.trim()) return;

    const province = provinces.find(p => p.province_id === Number(form.province_id));
    const ward = wards.find(w => w.ward_id === Number(form.ward_id));

    if (!province || !ward) return;

    setLocBanner({ type: "info", text: "Đang tìm kiếm vị trí..." });

    try {
      const center = await geocodeSimple(
        `${form.shipping_address.trim()}, ${ward.name || ward.ward_name}, ${province.name || province.province_name}, Vietnam`
      );
      if (center) {
        setLocationLL(center);
        setLocationConfirmed(false);
        setMapCenter(center);
        setMapZoom(15);
        setLocBanner({ type: "success", text: "Đã tìm thấy vị trí phù hợp!" });
      } else {
        setLocBanner({
          type: "warning",
          text: "Không tìm thấy vị trí phù hợp, quý khách vui lòng định vị thủ công, xin lỗi vì sự bất tiện này"
        });
      }
    } catch (error) {
      console.error("Geocode error:", error);
      setLocBanner({
        type: "error",
        text: "Lỗi khi tìm kiếm vị trí, vui lòng thử lại hoặc định vị thủ công"
      });
    }
  };

  useEffect(() => {
    if (open) {
      setForm({
        shipping_name: initialValue.shipping_name || "",
        shipping_phone: initialValue.shipping_phone || "",
        shipping_address: initialValue.shipping_address || "",
        province_id: initialValue.province_id ?? "",
        ward_id: initialValue.ward_id ?? "",
        geo_lat: initialValue.geo_lat ?? "",
        geo_lng: initialValue.geo_lng ?? "",
      });

      // Reset map states
      if (initialValue?.geo_lat && initialValue?.geo_lng) {
        setLocationLL({ lat: initialValue.geo_lat, lng: initialValue.geo_lng });
        setMapCenter({ lat: initialValue.geo_lat, lng: initialValue.geo_lng });
      } else {
        setLocationLL(null);
        setMapCenter(null);
      }
      setMapZoom(15);
      setLocationConfirmed(false);
      setLocBanner(null);
    }
  }, [open, initialValue]);

  // Zoom to ward when ward selected
  useEffect(() => {
    (async () => {
      if (!form.ward_id) return;

      const province = provinces.find(p => p.province_id === Number(form.province_id));
      const ward = wards.find(w => w.ward_id === Number(form.ward_id));

      if (!province || !ward) return;

      const center = await geocodeSimple(`${ward.name || ward.ward_name}, ${province.name || province.province_name}, Vietnam`);
      if (center) {
        setLocationLL(center);
        setLocationConfirmed(false);
        setMapCenter(center);
        setMapZoom(15);
      }
    })();
  }, [form.ward_id, form.province_id, provinces, wards]);

  // Zoom to province when province selected and no ward selected
  useEffect(() => {
    (async () => {
      if (!form.province_id || form.ward_id) return; // chỉ khi có tỉnh và CHƯA chọn xã

      const province = provinces.find(p => p.province_id === Number(form.province_id));
      if (!province) return;

      const center = await geocodeSimple(`${province.name || province.province_name}, Vietnam`);
      if (center) {
        setLocationLL(center);
        setLocationConfirmed(false);
        setMapCenter(center);
        setMapZoom(12); // zoom xa hơn cho tỉnh
      }
    })();
  }, [form.province_id, form.ward_id, provinces]);

  if (!open) return null;

  const handleChange = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  const submit = () => {
    // Kiểm tra đã chọn tỉnh/xã
    if (!form.province_id || !form.ward_id) {
      alert("Vui lòng chọn tỉnh/thành phố và phường/xã");
      return;
    }

    // Kiểm tra đã xác nhận vị trí
    if (!locationConfirmed) {
      alert("Vui lòng xác nhận vị trí trên bản đồ trước khi lưu");
      return;
    }

    // Kiểm tra đang tính phí ship
    if (shippingLoading) {
      alert("Đang tính phí vận chuyển, vui lòng chờ...");
      return;
    }

    // Kiểm tra lỗi tính phí ship
    if (shippingError) {
      alert("Không thể tính phí vận chuyển. Vui lòng thử lại.");
      return;
    }

    // Tính phí ship mới từ shippingService
    const priceDifference = newShippingFee - (currentShippingFee || 0);

    // Nếu có thay đổi phí ship, hiển thị confirm dialog
    if (priceDifference !== 0) {
      setConfirmDialog({
        open: true,
        newShippingFee,
        priceDifference,
      });
    } else {
      // Không có thay đổi phí ship, submit trực tiếp
      doSubmit();
    }
  };

  const doSubmit = () => {
    const payload = { ...form };
    // ép kiểu số cho các trường numeric nếu có
    if (payload.province_id !== "") payload.province_id = Number(payload.province_id);
    if (payload.ward_id !== "") payload.ward_id = Number(payload.ward_id);
    if (payload.geo_lat !== "") payload.geo_lat = Number(payload.geo_lat);
    if (payload.geo_lng !== "") payload.geo_lng = Number(payload.geo_lng);

    // Đảm bảo sử dụng tọa độ đã xác nhận
    if (locationLL) {
      payload.geo_lat = locationLL.lat;
      payload.geo_lng = locationLL.lng;
    }

    onSubmit(payload);
    setConfirmDialog({ open: false, newShippingFee: 0, priceDifference: 0 });
  };

  return (
    <>
      {/* Main Edit Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
        <div className="bg-white w-full max-w-lg rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-3">Sửa địa chỉ giao hàng</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Người nhận</label>
              <input className="mt-1 w-full border rounded px-3 py-2"
                value={form.shipping_name} onChange={handleChange("shipping_name")} />
            </div>
            <div>
              <label className="block text-sm font-medium">Điện thoại</label>
              <input className="mt-1 w-full border rounded px-3 py-2"
                value={form.shipping_phone} onChange={handleChange("shipping_phone")} />
            </div>

          <div>
            <label className="block text-sm font-medium">Tỉnh/Thành phố</label>
            <select
              className="mt-1 w-full border rounded px-3 py-2"
              value={form.province_id}
              onChange={handleChange("province_id")}
            >
              <option value="">Chọn tỉnh/thành</option>
              {provinces.map(p => (
                <option key={p.province_id} value={p.province_id}>
                  {p.name || p.province_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Phường/Xã</label>
            <select
              className="mt-1 w-full border rounded px-3 py-2"
              value={form.ward_id}
              onChange={handleChange("ward_id")}
              disabled={!form.province_id}
            >
              <option value="">Chọn phường/xã</option>
              {wards.map(w => (
                <option key={w.ward_id} value={w.ward_id}>
                  {w.name || w.ward_name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Địa chỉ</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              value={form.shipping_address}
              onChange={handleChange("shipping_address")}
              onBlur={handleAddressBlur}
              placeholder="Ví dụ: 123 Đường ABC, Phường XYZ"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Lat</label>
            <input className="mt-1 w-full border rounded px-3 py-2"
              value={form.geo_lat} onChange={handleChange("geo_lat")} />
          </div>
          <div>
            <label className="block text-sm font-medium">Lng</label>
            <input className="mt-1 w-full border rounded px-3 py-2"
              value={form.geo_lng} onChange={handleChange("geo_lng")} />
          </div>
        </div>

        {/* Map Picker */}
        <div className="mt-6">
          <label className="block text-sm font-medium mb-2">Vị trí trên bản đồ</label>

          {/* Location Banner */}
          {locBanner && (
            <div className={`mb-3 p-3 rounded text-sm ${
              locBanner.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
              locBanner.type === 'warning' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
              locBanner.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
              'bg-blue-50 text-blue-800 border border-blue-200'
            }`}>
              {locBanner.text}
            </div>
          )}

          <MapPicker
            value={locationLL}
            onChange={(ll) => {
              setLocationLL(ll);
              setForm(s => ({ ...s, geo_lat: ll.lat, geo_lng: ll.lng }));
              setLocationConfirmed(false);
              setLocBanner({
                type: "warning",
                text: "Đã cập nhật vị trí thủ công. Hãy nhấn 'Xác nhận vị trí'."
              });
            }}
          />

          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {locationLL ? (
                <span>
                  Tọa độ: {locationLL.lat.toFixed(6)}, {locationLL.lng.toFixed(6)}
                  {locationConfirmed && <span className="text-green-600 ml-1">✓ Đã xác nhận</span>}
                </span>
              ) : (
                "Chưa có tọa độ"
              )}
            </div>

            {locationLL && !locationConfirmed && (
              <button
                type="button"
                onClick={() => {
                  setLocationConfirmed(true);
                  setLocBanner({ type: "success", text: "Đã xác nhận vị trí!" });
                }}
                className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
              >
                Xác nhận vị trí
              </button>
            )}
          </div>
        </div>

          <div className="mt-4 flex justify-end gap-2">
            <button onClick={onClose} className="px-3 py-2 rounded border" disabled={disabled}>
              Hủy
            </button>
            <button onClick={submit} className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50" disabled={disabled}>
              Lưu
            </button>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            * Lưu ý: Thay đổi địa chỉ có thể làm thay đổi phí vận chuyển.
          </p>
        </div>
      </div>

      {/* Confirm Dialog */}
      {confirmDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white w-full max-w-md rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-3">Xác nhận thay đổi địa chỉ</h3>

            <div className="space-y-3 mb-4">
              <div className="bg-gray-50 p-3 rounded">
                <div className="flex justify-between text-sm mb-1">
                  <span>Phí ship hiện tại:</span>
                  <span>{(currentShippingFee || 0).toLocaleString()}₫</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Phí ship mới:</span>
                  <span>
                    {confirmDialog.newShippingFee.toLocaleString()}₫
                    {shippingReason && (
                      <span className="text-xs text-gray-500 ml-1">({shippingReason})</span>
                    )}
                  </span>
                </div>
                <div className="border-t pt-1 flex justify-between font-semibold">
                  <span>Chênh lệch:</span>
                  <span className={confirmDialog.priceDifference > 0 ? "text-red-600" : "text-green-600"}>
                    {confirmDialog.priceDifference > 0 ? "+" : ""}
                    {confirmDialog.priceDifference.toLocaleString()}₫
                  </span>
                </div>
              </div>

              <p className="text-sm text-gray-600">
                {confirmDialog.priceDifference > 0
                  ? "Phí ship sẽ tăng thêm. Bạn có đồng ý thanh toán thêm không?"
                  : confirmDialog.priceDifference < 0
                  ? "Phí ship sẽ giảm. Bạn sẽ được hoàn lại phần chênh lệch."
                  : "Phí ship không thay đổi."}
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDialog({ open: false, newShippingFee: 0, priceDifference: 0 })}
                className="px-4 py-2 rounded border"
                disabled={disabled}
              >
                Hủy
              </button>
              <button
                onClick={doSubmit}
                className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
                disabled={disabled}
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
