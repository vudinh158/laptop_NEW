import { useState } from "react";

const VNPAY_METHODS = [
  { key: "VNPAYQR", label: "Quét mã VNPAY-QR" },
  { key: "VNBANK", label: "Thẻ nội địa (ATM/NAPAS)" },
  { key: "INTCARD", label: "Thẻ quốc tế (Visa/Master/JCB)" },
  { key: "INSTALLMENT", label: "Trả góp qua thẻ tín dụng" },
];

export default function PaymentOptions({ onChange }) {
  const [provider, setProvider] = useState("COD");
  const [method, setMethod] = useState("COD");

  const selectProvider = (p) => {
    setProvider(p);
    const m = p === "COD" ? "COD" : VNPAY_METHODS[0].key;
    setMethod(m);
    onChange({ payment_provider: p, payment_method: m });
  };

  const selectMethod = (m) => {
    setMethod(m);
    onChange({ payment_provider: provider, payment_method: m });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <button type="button"
          onClick={() => selectProvider("COD")}
          className={`rounded-2xl border p-4 text-left shadow-sm ${provider==="COD"?"border-blue-600 ring-2 ring-blue-100":"border-gray-200"}`}>
          <div className="font-semibold">Thanh toán khi nhận hàng (COD)</div>
          <div className="text-sm text-gray-500">Thu tiền mặt khi giao</div>
        </button>

        <button type="button"
          onClick={() => selectProvider("VNPAY")}
          className={`rounded-2xl border p-4 text-left shadow-sm ${provider==="VNPAY"?"border-blue-600 ring-2 ring-blue-100":"border-gray-200"}`}>
          <div className="font-semibold">VNPAY</div>
          <div className="text-sm text-gray-500">QR, Thẻ nội địa, Thẻ quốc tế, Trả góp</div>
        </button>
      </div>

      {provider === "VNPAY" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {VNPAY_METHODS.map(m => (
            <button key={m.key} type="button"
              onClick={() => selectMethod(m.key)}
              className={`rounded-xl border p-3 text-left ${method===m.key ? "border-blue-600 ring-1 ring-blue-200":"border-gray-200"}`}>
              <div className="text-sm font-medium">{m.label}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
