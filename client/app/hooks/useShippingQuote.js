// client/app/hooks/useShippingQuote.js
import { useState, useEffect } from "react";
import api from "../services/api";

export function useShippingQuote({ provinceId, wardId, subtotal }) {
  const [state, setState] = useState({
    loading: false,
    error: null,
    data: null, // { shipping_fee, reason }
  });

  useEffect(() => {
    // không gọi khi thiếu dữ liệu cần thiết
    if (!provinceId || !subtotal) {
      setState({ loading: false, error: null, data: null });
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setState((s) => ({ ...s, loading: true, error: null }));
        const params = {
          province_id: Number(provinceId),
          ward_id: wardId ? Number(wardId) : undefined,
          subtotal: Number(subtotal || 0)
        };
        const { data } = await api.get("/quote", { params }); // Updated path
        if (!cancelled) setState({ loading: false, error: null, data });
      } catch (e) {
        if (!cancelled) setState({ loading: false, error: e?.response?.data?.error || "QUOTE_FAILED", data: null });
      }
    }, 300); // debounce ngắn hơn vì chỉ tính shipping

    return () => { cancelled = true; clearTimeout(timer); };
  }, [provinceId, wardId, subtotal]); // khi province, ward, hoặc subtotal thay đổi

  return state;
}
