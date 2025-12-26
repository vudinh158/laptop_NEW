// app/components/CompareModal.jsx
import { X } from "lucide-react";
import React, { useEffect } from "react";

function toTitle(s) {
  return String(s).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function toText(val) {
  if (val == null) return "";
  if (Array.isArray(val)) return val.map(toText).filter(Boolean).join(", ");
  if (typeof val === "object")
    return val.value ?? val.name ?? val.label ?? Object.values(val).join(" ");
  return String(val);
}
function normalizeSpecs(specs) {
  if (!specs) return {};
  const out = {};
  Object.entries(specs).forEach(([section, entries]) => {
    if (Array.isArray(entries)) {
      entries.forEach((item, i) => {
        const k =
          item?.key ?? item?.name ?? item?.label ?? `${toTitle(section)} ${i + 1}`;
        out[k] = toText(item?.value ?? item);
      });
    } else if (typeof entries === "object") {
      Object.entries(entries).forEach(([k, v]) => {
        out[`${toTitle(section)} - ${toTitle(k)}`] = toText(v);
      });
    } else {
      out[toTitle(section)] = toText(entries);
    }
  });
  return out;
}

export default function CompareModal({ open, onClose, products = [] }) {
  // Đóng bằng phím ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const normalized = products.map((p) => ({
    ...p,
    _flatSpecs: normalizeSpecs(p.specs),
  }));
  const keys = Array.from(
    new Set(normalized.flatMap((p) => Object.keys(p._flatSpecs || {})))
  );

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      {/* Nền mờ + blur */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Hộp modal nhỏ gọn, tối đa 80vh */}
      <div className="relative w-full max-w-4xl max-h-[80vh] bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 overflow-hidden">
        {/* Header sticky + nút X */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 border-b bg-white/80 backdrop-blur">
          <h3 className="text-base font-semibold">So sánh sản phẩm</h3>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nội dung cuộn */}
        <div className="p-4 overflow-auto">
          {products.length === 0 ? (
            <div className="text-sm text-gray-500">Chưa có sản phẩm để so sánh.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="p-3 text-left w-64">Thông số</th>
                    {normalized.map((p) => (
                      <th key={p.product_id} className="p-3 text-left">
                        <div className="font-medium">{p.product_name}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Hàng giá gốc */}
                  <tr className="border-t bg-blue-50">
                    <td className="p-3 font-medium align-top text-blue-800">Giá gốc</td>
                    {normalized.map((p) => (
                      <td key={p.product_id + "price"} className="p-3 align-top text-gray-600">
                        {p.specs?.price ? `${Number(p.specs.price).toLocaleString()}₫` : <span className="text-gray-400">—</span>}
                      </td>
                    ))}
                  </tr>
                  {/* Hàng giá sau giảm */}
                  <tr className="border-t bg-green-50">
                    <td className="p-3 font-medium align-top text-green-800">Giá sau giảm</td>
                    {normalized.map((p) => {
                      const originalPrice = Number(p.specs?.price || 0);
                      const discountPercent = Number(p.discount_percentage || 0);
                      const discountedPrice = originalPrice * (1 - discountPercent / 100);

                      return (
                        <td key={p.product_id + "discounted"} className="p-3 align-top">
                          {originalPrice > 0 ? (
                            <div className="flex flex-col gap-1">
                              <span className="font-semibold text-green-600">
                                {discountedPrice.toLocaleString()}₫
                              </span>
                              {discountPercent > 0 && (
                                <span className="text-xs text-red-500">
                                  Giảm {discountPercent}%
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Các hàng specs */}
                  {keys.filter(k => k !== 'price').map((k) => (
                    <tr key={k} className="border-t">
                      <td className="p-3 font-medium align-top">{k}</td>
                      {normalized.map((p) => (
                        <td key={p.product_id + k} className="p-3 align-top">
                          {p._flatSpecs?.[k] || <span className="text-gray-400">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
