// client/hooks/useOrderPreview.js
import { useEffect, useState } from "react";
import api from "../services/api";

export function useOrderPreview({ provinceId, wardId, viewItems }) {
  const [state, setState] = useState({
    loading: false,
    error: null,
    data: null, // { total_amount, discount_amount, subtotal_after_discount, shipping_fee, final_amount, items_breakdown, stock_warnings }
  });

  useEffect(() => {
    // không gọi khi chưa có items hoặc chưa chọn province
    if (!Array.isArray(viewItems) || viewItems.length === 0 || !provinceId) {
      setState({ loading: false, error: null, data: null });
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setState((s) => ({ ...s, loading: true, error: null }));
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const payload = {
          province_id: Number(provinceId),
          ward_id: wardId ? Number(wardId) : null,
          items: viewItems.map((it) => ({
            variation_id: it.variation_id,
            quantity: it.quantity,
          })),
        };
        const { data } = await api.post("/orders/preview", payload, { headers });
        if (!cancelled) setState({ loading: false, error: null, data });
      } catch (e) {
        if (!cancelled) setState({ loading: false, error: e?.response?.data?.message || "PREVIEW_FAILED", data: null });
      }
    }, 500); // debounce 0.5s để user gõ địa chỉ / đổi phường không bị spam

    return () => { cancelled = true; clearTimeout(timer); };
  }, [provinceId, wardId, JSON.stringify(viewItems)]); // stringify để theo dõi qty thay đổi

  return state;
}
