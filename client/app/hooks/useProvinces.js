// client/src/hooks/useProvinces.js
import { useEffect, useState } from "react";
import api from "../services/api"; // axios instance bạn đang dùng

export function useProvinces() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    api.get("/provinces").then(res => { if (mounted) setData(res.data); })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);
  return { data, loading };
}

