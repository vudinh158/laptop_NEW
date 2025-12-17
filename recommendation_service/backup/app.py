import os
import re
import json
import math
import numpy as np
import pandas as pd
import joblib
from functools import lru_cache
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from sqlalchemy import create_engine

load_dotenv()

# =========================
# ENV / Tham số
# =========================
TOPK = int(os.getenv("RECS_TOPK", 10))
ALPHA = float(os.getenv("RECS_ALPHA_PRICE", 0.6))   # weight cho chênh lệch giá (trong khoảng cách)
BETA  = float(os.getenv("RECS_BETA_PERF", 0.4))     # weight cho chênh lệch hiệu năng (trong khoảng cách)
LAMBDA_PRICE_JUMP = float(os.getenv("RECS_PRICE_JUMP_LAMBDA", 0.6))

DB_URL = os.getenv("DATABASE_URL")
ENGINE = create_engine(DB_URL, pool_pre_ping=True)

# Fresh pool & recency boost
FRESH_LIMIT = int(os.getenv("RECS_FRESH_LIMIT", 200))
FRESH_WINDOW_DAYS = int(os.getenv("RECS_FRESH_WINDOW_DAYS", 60))
RECENCY_GAMMA = float(os.getenv("RECS_RECENCY_GAMMA", 0.12))
RECENCY_HALFLIFE = float(os.getenv("RECS_RECENCY_HALFLIFE", 21))

# Benchmark mapping
USE_BENCH = os.getenv("USE_BENCH_IN_API", "true").lower() == "true"
BENCH_METHOD = os.getenv("BENCH_SCALE_METHOD", "logminmax")  # logminmax | minmax
BENCH_DOMAIN = os.getenv("BENCH_DOMAIN", "all")              # consumer | all (nếu file đã sạch thì all)

app = Flask(__name__)
CORS(app)

# =========================
# Load artefacts (model/scaler/DF)
# =========================
try:
    DF = pd.read_pickle("products_df_from_db.pkl")
    SCALER = joblib.load("scaler.joblib")
    KNN = joblib.load("knn_model.joblib")
except Exception as e:
    raise RuntimeError(f"Không load được artefacts: {e}")

# =========================
# Benchmark loader & helpers
# =========================
VENDOR_STOPWORDS = [
    "nvidia", "geforce", "rtx", "gtx", "graphics", "gpu",
    "intel", "amd", "radeon", "core", "processor", "cpu",
    "laptop gpu"
]
SERVER_KEYWORDS = [
    "epyc", "xeon", "threadripper", "workstation", "server",
    "quadro", "tesla", "a100", "h100", "b100", "b200", "mi300",
    "instinct", "radeon pro w", "blackwell", "pro 6000"
]

def _norm(s: str) -> str:
    s = (s or "").lower()
    s = re.sub(r'[\(\)\[\]\+\-_,/]', ' ', s)
    for w in VENDOR_STOPWORDS:
        s = s.replace(w, ' ')
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def _is_server_name(s: str) -> bool:
    t = (s or "").lower()
    return any(k in t for k in SERVER_KEYWORDS)

def _load_json(path):
    try:
        return json.load(open(path, "r", encoding="utf-8"))
    except Exception:
        return []

def _build_bench_map(raw_list):
    m = {}
    for x in raw_list:
        name = str(x.get("Device Name", "")).strip()
        if not name:
            continue
        if BENCH_DOMAIN == "consumer" and _is_server_name(name):
            continue
        score = x.get("Median Score")
        if score is None:
            continue
        m[name.lower()] = float(score)
    return m

CPU_RAW = _load_json("cpu_benchmark.json") if USE_BENCH else []
GPU_RAW = _load_json("gpu_benchmark.json") if USE_BENCH else []
CPU_MAP = _build_bench_map(CPU_RAW) if USE_BENCH else {}
GPU_MAP = _build_bench_map(GPU_RAW) if USE_BENCH else {}

# Chỉ số nhanh đã chuẩn hoá
CPU_IDX = { _norm(k): v for k, v in CPU_MAP.items() } if USE_BENCH else {}
GPU_IDX = { _norm(k): v for k, v in GPU_MAP.items() } if USE_BENCH else {}

def _percentile(arr, p):
    if not arr:
        return None
    arr = sorted(arr)
    k = (len(arr) - 1) * (p / 100.0)
    f, c = math.floor(k), math.ceil(k)
    if f == c:
        return arr[int(k)]
    return arr[f] + (arr[c] - arr[f]) * (k - f)

CPU_P5  = _percentile(list(CPU_MAP.values()), 5)  if USE_BENCH else None
CPU_P95 = _percentile(list(CPU_MAP.values()), 95) if USE_BENCH else None
GPU_P5  = _percentile(list(GPU_MAP.values()), 5)  if USE_BENCH else None
GPU_P95 = _percentile(list(GPU_MAP.values()), 95) if USE_BENCH else None

# fallback mặc định nếu không có file benchmark
if CPU_P5 is None:  CPU_P5 = 1000.0
if CPU_P95 is None: CPU_P95 = CPU_P5 + 20000.0
if GPU_P5 is None:  GPU_P5 = 1000.0
if GPU_P95 is None: GPU_P95 = GPU_P5 + 30000.0

def _scale_0_100(x, lo, hi, method=BENCH_METHOD):
    if x is None:
        return None
    lo = max(lo, 1e-6)
    hi = max(hi, lo + 1e-6)
    if method == "logminmax":
        return float(min(1.0, max(0.0, (math.log(max(x, 1e-6)) - math.log(lo)) / (math.log(hi) - math.log(lo))))) * 100.0
    return float(min(1.0, max(0.0, (x - lo) / (hi - lo)))) * 100.0

@lru_cache(maxsize=8192)
def _lookup_cpu_raw(name: str):
    if not (USE_BENCH and name):
        return (None, "none")
    key = name.strip().lower()
    if key in CPU_MAP:
        return (CPU_MAP[key], "json-exact")
    nk = _norm(key)
    if nk in CPU_IDX:
        return (CPU_IDX[nk], "json-norm")
    for k, v in CPU_MAP.items():
        if nk and (nk in _norm(k) or _norm(k) in nk):
            return (v, "json-contains")
    return (None, "none")

@lru_cache(maxsize=8192)
def _lookup_gpu_raw(name: str):
    if not (USE_BENCH and name):
        return (None, "none")
    key = name.strip().lower()
    if key in GPU_MAP:
        return (GPU_MAP[key], "json-exact")
    nk = _norm(key)
    if nk in GPU_IDX:
        return (GPU_IDX[nk], "json-norm")
    for k, v in GPU_MAP.items():
        if nk and (nk in _norm(k) or _norm(k) in nk):
            return (v, "json-contains")
    return (None, "none")

# =========================
# Rule fallback (CPU/GPU/RAM/Storage)
# =========================
def _rule_cpu_100(cpu: str) -> float:
    s = (cpu or "").lower()
    if any(x in s for x in ["m3 max", "m4 max", "i9", "ryzen 9", "ultra 9"]): return 100.0
    if any(x in s for x in ["m3 pro", "m4 pro", "i7", "ryzen 7", "ultra 7"]): return 80.0
    if any(x in s for x in ["m3 ", "m4 ", "i5", "ryzen 5", "ultra 5"]):       return 60.0
    return 40.0

def _rule_gpu_100(gpu: str) -> float:
    g = (gpu or "").lower()
    if any(x in g for x in ["4080", "4090", "5070", "5080", "5090", "30-core", "40-core"]): return 100.0
    if "4070" in g: return 90.0
    if "4060" in g: return 85.0
    if "4050" in g: return 75.0
    if any(x in g for x in ["3050", "2050"]): return 60.0
    if any(x in g for x in ["arc", "14-core", "16-core", "18-core"]): return 40.0
    return 20.0

def _extract_ram_gb(ram_str: str) -> int:
    m = re.search(r"(\d+)", str(ram_str) or "")
    return int(m.group(1)) if m else 8

def _ram_100(ram: str) -> float:
    gb = _extract_ram_gb(ram)
    if gb >= 32: return 100.0
    if gb >= 18: return 80.0
    if gb >= 16: return 70.0
    return 40.0

def _sto_100(storage: str) -> float:
    s = (storage or "").lower()
    if "4tb" in s:   return 100.0
    if "2tb" in s:   return 90.0
    if "1tb" in s:   return 80.0
    if "512" in s:   return 60.0
    return 40.0

def calculate_perf_from_mapping_or_rule(row: pd.Series):
    """
    Trả về: (score, cpu_src, gpu_src, cpu100, gpu100)
    - Ưu tiên điểm từ JSON benchmark (đã scale 0..100 theo p5→p95).
    - Fallback rule nếu không match (từng phần CPU/GPU).
    - RAM/Storage luôn tính rule (nhẹ, ổn định).
    """
    cpu_name = str(row.get("processor", ""))
    gpu_name = str(row.get("graphics_card", ""))

    cpu_raw, cpu_src = _lookup_cpu_raw(cpu_name)
    gpu_raw, gpu_src = _lookup_gpu_raw(gpu_name)

    cpu100 = _scale_0_100(cpu_raw, CPU_P5, CPU_P95) if cpu_raw is not None else _rule_cpu_100(cpu_name)
    gpu100 = _scale_0_100(gpu_raw, GPU_P5, GPU_P95) if gpu_raw is not None else _rule_gpu_100(gpu_name)

    if cpu_raw is None: cpu_src = "rule"
    if gpu_raw is None: gpu_src = "rule"

    ram100 = _ram_100(row.get("ram", ""))
    sto100 = _sto_100(row.get("storage", ""))

    score = round(0.40 * cpu100 + 0.35 * gpu100 + 0.15 * ram100 + 0.10 * sto100, 2)
    return score, cpu_src, gpu_src, cpu100, gpu100

# =========================
# Khoảng cách & tiện ích
# =========================
def euclid_weighted(q, x):
    dp = q[0] - x[0]
    df = q[1] - x[1]
    return np.sqrt(ALPHA * dp * dp + BETA * df * df)

def fetch_one_variation_from_db(variation_id: int) -> pd.DataFrame:
    if not DB_URL:
        return pd.DataFrame()
    sql = """
        SELECT
            pv.variation_id,
            pv.product_id,
            p.product_name AS product_name,
            pv.processor,
            pv.ram,
            pv.storage,
            pv.graphics_card,
            pv.price
        FROM product_variations pv
        JOIN products p ON p.product_id = pv.product_id
        WHERE pv.is_available = true AND pv.variation_id = %(vid)s
    """
    try:
        df = pd.read_sql(sql, con=ENGINE, params={"vid": variation_id})
        return df
    except Exception as e:
        print(f"[WARN] fetch_one_variation_from_db lỗi: {e}")
        return pd.DataFrame()

def _kneighbors_for_query_vec(q_price: float, q_perf: float, base_row: pd.Series, topk: int):
    q_raw = np.array([[q_price, q_perf]], dtype=float)
    q = SCALER.transform(q_raw)[0]

    X_all = SCALER.transform(DF[["price", "performance_score"]].values)
    n_neighbors = min(int(topk) + 15, len(DF))
    dists, idxs = KNN.kneighbors([q], n_neighbors=n_neighbors)
    idxs = idxs[0].tolist()

    candidates = []
    base_price = float(base_row["price"])
    for i in idxs:
        if int(DF.iloc[i]["variation_id"]) == int(base_row["variation_id"]):
            continue
        x = X_all[i]
        d = euclid_weighted(q, x)
        p_i = float(DF.iloc[i]["price"])
        price_jump_pen = 0.0
        if p_i > base_price and base_price > 0:
            price_jump_pen = LAMBDA_PRICE_JUMP * ((p_i - base_price) / base_price)
        sim = 1.0 / (1e-6 + d * (1.0 + price_jump_pen))
        candidates.append((i, sim))
    candidates.sort(key=lambda t: t[1], reverse=True)
    return candidates[:topk]

# =========================
# Fresh pool (item mới)
# =========================
def fetch_fresh_items_from_db(exclude_variation_ids=None) -> pd.DataFrame:
    if not DB_URL:
        return pd.DataFrame()
    exclude_variation_ids = exclude_variation_ids or []
    sql = f"""
        SELECT
            pv.variation_id,
            pv.product_id,
            p.product_name AS product_name,
            pv.processor, pv.ram, pv.storage, pv.graphics_card, pv.price,
            GREATEST(pv.updated_at, pv.created_at) AS ts
        FROM product_variations pv
        JOIN products p ON p.product_id = pv.product_id
        WHERE pv.is_available = true
          AND GREATEST(pv.updated_at, pv.created_at) >= NOW() - INTERVAL '{FRESH_WINDOW_DAYS} days'
          {"AND pv.variation_id <> ALL(%(ex)s)" if exclude_variation_ids else ""}
        ORDER BY ts DESC
        LIMIT {FRESH_LIMIT}
    """
    try:
        params = {"ex": exclude_variation_ids} if exclude_variation_ids else {}
        df = pd.read_sql(sql, con=ENGINE, params=params)
        return df
    except Exception as e:
        print(f"[WARN] fetch_fresh_items_from_db lỗi: {e}")
        return pd.DataFrame()

def score_fresh_candidates(q_scaled: np.ndarray, q_base_price: float, fresh_df: pd.DataFrame):
    if fresh_df is None or fresh_df.empty:
        return []

    # Tính performance cho fresh item bằng mapping + fallback
    fresh_df = fresh_df.copy()
    perf_list, cpu_srcs, gpu_srcs = [], [], []
    for _, r in fresh_df.iterrows():
        score, cpu_src, gpu_src, _, _ = calculate_perf_from_mapping_or_rule(r)
        perf_list.append(score)
        cpu_srcs.append(cpu_src)
        gpu_srcs.append(gpu_src)
    fresh_df["performance_score"] = perf_list
    fresh_df["cpu_source"] = cpu_srcs
    fresh_df["gpu_source"] = gpu_srcs
    fresh_df["score_source"] = np.where(
        (fresh_df["cpu_source"] != "rule") | (fresh_df["gpu_source"] != "rule"),
        "fresh:benchmark",
        "fresh:rule"
    )

    X_fresh = SCALER.transform(fresh_df[["price", "performance_score"]].values)

    out = []
    ages = None
    if "ts" in fresh_df.columns:
        ages = (pd.Timestamp.utcnow() - pd.to_datetime(fresh_df["ts"], utc=True)).dt.total_seconds() / (3600 * 24)
        ages = np.clip(ages, 0, 3650)

    for i in range(X_fresh.shape[0]):
        x = X_fresh[i]
        d = euclid_weighted(q_scaled, x)
        p_i = float(fresh_df.iloc[i]["price"])
        price_jump_pen = 0.0
        if p_i > q_base_price and q_base_price > 0:
            price_jump_pen = LAMBDA_PRICE_JUMP * ((p_i - q_base_price) / q_base_price)
        sim = 1.0 / (1e-6 + d * (1.0 + price_jump_pen))

        if ages is not None and RECENCY_GAMMA > 0:
            age = float(ages.iloc[i])
            recency = np.exp(-age / max(RECENCY_HALFLIFE, 1e-6))
            sim = sim * (1.0 + RECENCY_GAMMA * recency)

        out.append((i, sim, fresh_df))  # trả cả DF để dùng ở ngoài
    return out

# =========================
# Endpoints
# =========================
@app.get("/health")
def health():
    return jsonify({
        "ok": True,
        "items": int(DF.shape[0]),
        "use_bench": bool(USE_BENCH),
        "bench_entries": {"cpu": len(CPU_MAP), "gpu": len(GPU_MAP)}
    })

def _recommend_core(var_id: int):
    df_ids = set(DF["variation_id"].tolist())

    # 1) Vector truy vấn (hot hoặc cold)
    if var_id in df_ids:
        base = DF.loc[DF["variation_id"] == var_id].iloc[0]
        q_price = float(base["price"])
        q_perf  = float(base["performance_score"])
        q_scaled = SCALER.transform(np.array([[q_price, q_perf]], dtype=float))[0]
        base_row = base
    else:
        fresh_one = fetch_one_variation_from_db(var_id)
        if fresh_one is None or fresh_one.empty:
            return jsonify({"error": "variation_id not found"}), 404
        fresh_one = fresh_one.iloc[0].copy()
        perf, cpu_src, gpu_src, _, _ = calculate_perf_from_mapping_or_rule(fresh_one)
        fresh_one["performance_score"] = perf
        # base_row chỉ dùng cho tính hàng xóm (không trả base item ra)
        q_price = float(fresh_one["price"])
        q_perf  = float(fresh_one["performance_score"])
        q_scaled = SCALER.transform(np.array([[q_price, q_perf]], dtype=float))[0]
        base_row = pd.Series({
            "variation_id": int(fresh_one["variation_id"]),
            "price": q_price,
            "performance_score": q_perf
        })

    # 2) Ứng viên từ index KNN (đã train)
    X_all = SCALER.transform(DF[["price", "performance_score"]].values)
    n_neighbors = min(int(TOPK) + 15, len(DF))
    dists, idxs = KNN.kneighbors([q_scaled], n_neighbors=n_neighbors)
    idxs = [i for i in idxs[0].tolist()
            if int(DF.iloc[i]["variation_id"]) != int(base_row["variation_id"])]
    cand_knn = []
    base_price = float(q_price)
    for i in idxs:
        d = euclid_weighted(q_scaled, X_all[i])
        p_i = float(DF.iloc[i]["price"])
        price_jump_pen = LAMBDA_PRICE_JUMP * ((p_i - base_price) / base_price) if (p_i > base_price and base_price > 0) else 0.0
        sim = 1.0 / (1e-6 + d * (1.0 + price_jump_pen))
        cand_knn.append(("indexed", i, sim, None))

    # 3) Ứng viên từ fresh pool (item mới thêm/cập nhật)
    fresh_df = fetch_fresh_items_from_db(exclude_variation_ids=[int(base_row["variation_id"])])
    cand_fresh = []
    if fresh_df is not None and not fresh_df.empty:
        # bỏ item đã có trong DF để tránh trùng
        mask_new = ~fresh_df["variation_id"].isin(df_ids)
        fresh_df = fresh_df.loc[mask_new].reset_index(drop=True)
        scored = score_fresh_candidates(q_scaled, q_price, fresh_df)
        for i, sim, fdf in scored:
            cand_fresh.append(("fresh", i, sim, fdf))

    # 4) Gộp & rerank → lấy TOPK
    pool = cand_knn + cand_fresh
    pool.sort(key=lambda t: t[2], reverse=True)
    pool = pool[:TOPK]

    # 5) Build response
    out = []
    for src, i, _, fdf in pool:
        if src == "indexed":
            r = DF.iloc[i]
            out.append({
                "variation_id": int(r["variation_id"]),
                "product_id": int(r["product_id"]),
                "product_name": str(r["product_name"]),
                "price": float(r["price"]),
                "performance_score": float(r["performance_score"]),
                "cpu_source": str(r.get("cpu_source", "unknown")),
                "gpu_source": str(r.get("gpu_source", "unknown")),
                "score_source": f"cpu:{r.get('cpu_source','?')},gpu:{r.get('gpu_source','?')}",
                "source": "indexed"
            })
        else:
            r = fdf.iloc[i]
            out.append({
                "variation_id": int(r["variation_id"]),
                "product_id": int(r["product_id"]),
                "product_name": str(r["product_name"]),
                "price": float(r["price"]),
                "performance_score": float(r["performance_score"]),
                "cpu_source": str(r.get("cpu_source", "rule")),
                "gpu_source": str(r.get("gpu_source", "rule")),
                "score_source": str(r.get("score_source", "fresh:rule")),
                "source": "fresh"
            })

    return jsonify(out)

# hỗ trợ 2 kiểu gọi
@app.get("/recommend/<int:variation_id>")
def recommend_path(variation_id: int):
    return _recommend_core(variation_id)

@app.get("/recommend")
def recommend_query():
    var_id = request.args.get("variation_id", type=int)
    if var_id is None:
        return jsonify({"error": "variation_id is required"}), 400
    return _recommend_core(var_id)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 8000)), debug=True)
