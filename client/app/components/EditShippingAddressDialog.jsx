// client/app/components/EditShippingAddressDialog.jsx
import { useEffect, useState } from "react";

export default function EditShippingAddressDialog({
  open,
  onClose,
  onSubmit, // (payload) => void
  initialValue = {},
  disabled,
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
    }
  }, [open, initialValue]);

  if (!open) return null;

  const handleChange = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  const submit = () => {
    const payload = { ...form };
    // ép kiểu số cho các trường numeric nếu có
    if (payload.province_id !== "") payload.province_id = Number(payload.province_id);
    if (payload.ward_id !== "") payload.ward_id = Number(payload.ward_id);
    if (payload.geo_lat !== "") payload.geo_lat = Number(payload.geo_lat);
    if (payload.geo_lng !== "") payload.geo_lng = Number(payload.geo_lng);
    onSubmit(payload);
  };

  return (
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

          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Địa chỉ</label>
            <input className="mt-1 w-full border rounded px-3 py-2"
              value={form.shipping_address} onChange={handleChange("shipping_address")} />
          </div>

          <div>
            <label className="block text-sm font-medium">Tỉnh/Thành (ID)</label>
            <input className="mt-1 w-full border rounded px-3 py-2"
              value={form.province_id} onChange={handleChange("province_id")} />
          </div>
          <div>
            <label className="block text-sm font-medium">Phường/Xã (ID)</label>
            <input className="mt-1 w-full border rounded px-3 py-2"
              value={form.ward_id} onChange={handleChange("ward_id")} />
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

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded border" disabled={disabled}>
            Hủy
          </button>
          <button onClick={submit} className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50" disabled={disabled}>
            Lưu
          </button>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          * Lưu ý: Nếu đơn đã thanh toán và thay đổi này làm phí ship khác đi, hệ thống sẽ từ chối.
        </p>
      </div>
    </div>
  );
}
