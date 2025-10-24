// client/src/hooks/useWards.js
import { useEffect, useState } from "react";
import api from "../services/api";

export function useWards(provinceId) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!provinceId) { setData([]); return; }
    setLoading(true);
    let mounted = true;
    api.get(`/provinces/${provinceId}/wards`).then(res => { if (mounted) setData(res.data); })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [provinceId]);
  return { data, loading };
}
