// client/app/components/ChangePaymentMethodDialog.jsx
import { useState } from "react";

const PROVIDERS = [
  { key: "COD", label: "COD", methods: [{ key: "COD", label: "Thanh toán khi nhận hàng" }] },
  {
    key: "VNPAY",
    label: "VNPAY",
    methods: [
      { key: "VNPAYQR", label: "VNPAY QR" },
      { key: "VNBANK", label: "Thẻ/Tài khoản ngân hàng" },
      { key: "INTCARD", label: "Thẻ quốc tế" },
      { key: "INSTALLMENT", label: "Trả góp" },
    ],
  },
];

export default function ChangePaymentMethodDialog({
  open,
  onClose,
  onSubmit, // ({ provider, method }) => void
  initialProvider,
  initialMethod,
  disabled,
}) {
  // Chỉ cho phép chuyển từ COD sang VNPAY
  const [provider, setProvider] = useState("VNPAY");
  const [method, setMethod] = useState("VNPAYQR");

  if (!open) return null;

  const current = PROVIDERS.find(p => p.key === provider);
  const availableMethods = current ? current.methods : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white w-full max-w-md rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-3">Đổi phương thức thanh toán</h3>

        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-sm text-blue-800">
              Bạn sẽ chuyển từ <strong>Thanh toán khi nhận hàng (COD)</strong> sang <strong>VNPAY</strong>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium">Chọn phương thức VNPAY</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2"
            >
              {PROVIDERS.find(p => p.key === "VNPAY")?.methods.map(m => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded border"
            disabled={disabled}
          >
            Hủy
          </button>
          <button
            onClick={() => onSubmit({ provider, method })}
            className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
            disabled={disabled}
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}
