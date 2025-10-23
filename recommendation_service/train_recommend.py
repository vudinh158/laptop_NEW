import os, re, json, math
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
import joblib
import psycopg2
from dotenv import load_dotenv

load_dotenv()

# ===== Paths =====
ARTEFACTS_DIR = os.getenv("ARTEFACTS_DIR", "artefacts")
DATA_DIR      = os.getenv("DATA_DIR", "data")
os.makedirs(ARTEFACTS_DIR, exist_ok=True)

CPU_JSON_PATH = os.path.join(DATA_DIR, "cpu_benchmark.json")
GPU_JSON_PATH = os.path.join(DATA_DIR, "gpu_benchmark.json")

# ===== Weights & scale =====
CPU_WEIGHT = 0.40
GPU_WEIGHT = 0.35
RAM_WEIGHT = 0.15
STO_WEIGHT = 0.10

FUZZY_THRESHOLD = 0.60
SCALE_METHOD = os.getenv("SCALE_METHOD", "log_p99")  # log_p99|quantile|p99

# ---------- DB ----------
def fetch_data_from_db():
    conn_string = os.getenv("DATABASE_URL")
    if not conn_string:
        raise RuntimeError("DATABASE_URL missing in .env")
    conn = psycopg2.connect(conn_string)
    query = """
    SELECT 
        pv.variation_id,
        pv.product_id,
        p.product_name,
        pv.processor,
        pv.ram,
        pv.storage,
        pv.graphics_card,
        pv.price
    FROM product_variations pv
    LEFT JOIN products p ON pv.product_id = p.product_id
    WHERE pv.is_available = true;
    """
    df = pd.read_sql(query, conn)
    conn.close()
    return df

# ---------- normalizers ----------
_ALNUM = re.compile(r"[^a-z0-9\s\-\+]")

def norm_text(s: str) -> str:
    s = (s or "").lower()
    s = _ALNUM.sub(" ", s)
    return re.sub(r"\s+", " ", s).strip()

def simplify_cpu_name(s: str) -> str:
    s = norm_text(s)
    s = re.sub(r"\b(processor|cpu|with|tm|®|™)\b", " ", s)
    s = s.replace("intel core ", "i").replace("intel ", " ")
    s = s.replace("amd ryzen ", "ryzen ").replace("amd epyc ", "epyc ").replace("amd ", " ")
    s = s.replace("apple ", " ").replace("m series ", "m")
    return re.sub(r"\s+", " ", s).strip()

def simplify_gpu_name(s: str) -> str:
    s = norm_text(s)
    s = re.sub(r"\b(graphics|graphic|card|gpu|with|tm|®|™)\b", " ", s)
    s = s.replace("nvidia geforce rtx ", "rtx ").replace("geforce rtx ", "rtx ").replace("nvidia rtx ", "rtx ")
    s = s.replace("geforce gtx ", "gtx ").replace("nvidia ", " ")
    s = s.replace("amd radeon rx ", "rx ").replace("radeon rx ", "rx ").replace("radeon ", " ")
    s = s.replace("laptop gpu", "").replace("mobile", "")
    s = s.replace("core gpu", "core")
    return re.sub(r"\s+", " ", s).strip()

def tokens(s: str) -> set:
    return set([t for t in s.split() if t])

def jaccard(a: set, b: set) -> float:
    if not a or not b: return 0.0
    return len(a & b) / len(a | b)

# ---------- load benchmark ----------
def load_benchmarks(json_path, is_cpu=True):
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    rows = []
    for rec in data:
        name = rec.get("Device Name") or rec.get("name") or rec.get("device") or ""
        score = rec.get("Median Score") or rec.get("median_score") or rec.get("score")
        nbench = rec.get("Number of Benchmarks") or rec.get("count") or 0
        if name and score is not None:
            simp = simplify_cpu_name(name) if is_cpu else simplify_gpu_name(name)
            rows.append({
                "name": name,
                "name_lc": name.lower(),
                "simple": simp,
                "tokens": tokens(simp),
                "score": float(score),
                "count": int(nbench or 0)
            })
    df = pd.DataFrame(rows)
    if not df.empty:
        df.sort_values(["simple", "count", "score"], ascending=[True, False, False], inplace=True)
        df = df.drop_duplicates(subset=["simple"], keep="first")
    return df

def best_match_score(query_str: str, bench_df: pd.DataFrame, is_cpu=True):
    """
    return (score, source):
      'json-exact'   : match exact sau chuẩn hoá
      'json-contains': match mờ theo Jaccard >= FUZZY_THRESHOLD
      (None, None)   : không match
    """
    if not query_str or bench_df is None or bench_df.empty:
        return (None, None)

    simp = simplify_cpu_name(query_str) if is_cpu else simplify_gpu_name(query_str)
    tok = tokens(simp)

    r = bench_df.loc[bench_df["simple"] == simp]
    if not r.empty:
        return (float(r.iloc[0]["score"]), "json-exact")

    variants = {simp,
                re.sub(r"\b(laptop|max\-q|maxq|mobile)\b", "", simp).strip(),
                re.sub(r"\b(processor|cpu)\b", "", simp).strip()}
    for v in variants:
        if not v: continue
        rr = bench_df.loc[bench_df["simple"] == v]
        if not rr.empty:
            return (float(rr.iloc[0]["score"]), "json-exact")

    best, best_sim = None, 0.0
    for _, row in bench_df.iterrows():
        sim = jaccard(tok, row["tokens"])
        if sim > best_sim:
            best_sim, best = sim, row
    if best is not None and best_sim >= float(FUZZY_THRESHOLD):
        return (float(best["score"]), "json-contains")

    return (None, None)

# ---------- fallbacks ----------
def fallback_cpu_score(cpu: str) -> int:
    s = (cpu or "").lower()
    if any(x in s for x in ["m3 max","m4 max","i9","ryzen 9","ultra 9"]): return 100
    if any(x in s for x in ["m3 pro","m4 pro","i7","ryzen 7","ultra 7"]): return 80
    if any(x in s for x in ["m3","m4","i5","ryzen 5","ultra 5"]): return 60
    return 40

def fallback_gpu_score(gpu: str) -> int:
    s = (gpu or "").lower()
    if any(x in s for x in ['4080','4090','5070','5080','5090','30-core','40-core']): return 100
    if '4070' in s: return 90
    if '4060' in s: return 85
    if '4050' in s: return 75
    if any(x in s for x in ['3050','2050']): return 60
    if any(x in s for x in ['arc','14-core','16-core','18-core']): return 40
    return 20

def score_ram(ram_str: str) -> int:
    m = re.search(r"\d+", (ram_str or "").lower())
    gb = int(m.group()) if m else 8
    return 100 if gb>=32 else 80 if gb>=18 else 70 if gb>=16 else 40

def score_storage(sto_str: str) -> int:
    s = (sto_str or "").lower()
    return 100 if "4tb" in s else 90 if "2tb" in s else 80 if "1tb" in s else 60 if "512gb" in s else 40

# ---------- scaling ----------
def scale_bench_to_100(series: pd.Series, method="log_p99"):
    s = pd.to_numeric(series, errors="coerce").astype(float).fillna(0.0)
    if method == "quantile":
        pct = (s.rank(method="average") - 1) / max(len(s)-1, 1)
        return (pct * 100).astype(float)

    def clip_minmax(arr, p_lo=1, p_hi=99):
        lo, hi = np.percentile(arr, p_lo), np.percentile(arr, p_hi)
        if lo == hi: return np.full_like(arr, 0.5, dtype=float)
        arr = np.clip(arr, lo, hi)
        return (arr - lo) / (hi - lo)

    if method == "p99":
        return (clip_minmax(s.values) * 100).astype(float)

    if method == "log_p99":
        logged = np.log1p(s.values)
        return (clip_minmax(logged) * 100).astype(float)

    raise ValueError("Unknown SCALE_METHOD")

# ---------- main ----------
def main():
    print("==> Load DB")
    df = fetch_data_from_db()
    if df.empty:
        print("No data.")
        return
    print(f"Items: {len(df)}")

    print("==> Load benchmarks JSON")
    cpu_bench = load_benchmarks(CPU_JSON_PATH, is_cpu=True)
    gpu_bench = load_benchmarks(GPU_JSON_PATH, is_cpu=False)

    cpu_raw, gpu_raw, cpu_src, gpu_src = [], [], [], []

    for _, row in df.iterrows():
        c = row.get("processor", "")
        g = row.get("graphics_card", "")

        c_score, c_label = best_match_score(c, cpu_bench, True) if cpu_bench is not None else (None, None)
        g_score, g_label = best_match_score(g, gpu_bench, False) if gpu_bench is not None else (None, None)

        # CPU
        if c_score is None:
            base = fallback_cpu_score(c)
            m_multi = re.search(r"\b(\d+)x\b", (c or "").lower())  # hỗ trợ 2x/4x...
            if m_multi:
                try: base *= int(m_multi.group(1))
                except Exception: pass
            cpu_raw.append(base); cpu_src.append("rule")
        else:
            cpu_raw.append(c_score); cpu_src.append(c_label or "json-exact")

        # GPU
        if g_score is None:
            gpu_raw.append(fallback_gpu_score(g)); gpu_src.append("rule")
        else:
            gpu_raw.append(g_score); gpu_src.append(g_label or "json-exact")

    df["cpu_score_raw"] = cpu_raw
    df["gpu_score_raw"] = gpu_raw
    df["cpu_source"] = cpu_src
    df["gpu_source"] = gpu_src

    # scale về 0–100 (đồng nhất & robust)
    df["cpu_score_100"] = scale_bench_to_100(df["cpu_score_raw"], method=SCALE_METHOD)
    df["gpu_score_100"] = scale_bench_to_100(df["gpu_score_raw"], method=SCALE_METHOD)
    df["ram_score"] = df["ram"].map(score_ram)
    df["storage_score"] = df["storage"].map(score_storage)
    df["performance_score"] = (
        df["cpu_score_100"]*CPU_WEIGHT +
        df["gpu_score_100"]*GPU_WEIGHT +
        df["ram_score"]*RAM_WEIGHT +
        df["storage_score"]*STO_WEIGHT
    ).round(2)

    df["price"] = pd.to_numeric(df["price"], errors="coerce")
    df.dropna(subset=["price","performance_score"], inplace=True)

    # === Fit scaler & lưu ma trận đã scale (để app dùng KNN thủ công) ===
    features = df[["price","performance_score"]].copy()
    scaler = MinMaxScaler()
    X = scaler.fit_transform(features).astype(np.float64)

    # Lưu artefacts đúng thư mục
    joblib.dump(scaler, os.path.join(ARTEFACTS_DIR, "scaler.joblib"))
    df.to_pickle(os.path.join(ARTEFACTS_DIR, "products_df_from_db.pkl"))
    np.save(os.path.join(ARTEFACTS_DIR, "knn_X_all.npy"), X)
    np.save(os.path.join(ARTEFACTS_DIR, "knn_variation_ids.npy"), df["variation_id"].to_numpy(np.int64))

    print(f"Saved artefacts to '{ARTEFACTS_DIR}': scaler.joblib, products_df_from_db.pkl, knn_X_all.npy, knn_variation_ids.npy")

if __name__ == "__main__":
    main()
