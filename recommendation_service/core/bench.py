import re, json, math
import numpy as np
from functools import lru_cache
from .config import (
    USE_BENCH, BENCH_METHOD, BENCH_DOMAIN,
    CPU_JSON_PATH, GPU_JSON_PATH
)

VENDOR_STOPWORDS = [
    "nvidia","geforce","rtx","gtx","graphics","gpu",
    "intel","amd","radeon","core","processor","cpu","laptop gpu"
]
SERVER_KEYWORDS = [
    "epyc","xeon","threadripper","workstation","server",
    "quadro","tesla","a100","h100","b100","b200","mi300",
    "instinct","radeon pro w","blackwell","pro 6000"
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
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def _build_bench_map(raw_list, domain="all"):
    m = {}
    for x in raw_list:
        name = str(x.get("Device Name", "")).strip()
        if not name:
            continue
        if domain == "consumer" and _is_server_name(name):
            continue
        score = x.get("Median Score")
        if score is None:
            continue
        m[name.lower()] = float(score)
    return m

CPU_RAW = _load_json(CPU_JSON_PATH) if USE_BENCH else []
GPU_RAW = _load_json(GPU_JSON_PATH) if USE_BENCH else []
CPU_MAP = _build_bench_map(CPU_RAW, BENCH_DOMAIN) if USE_BENCH else {}
GPU_MAP = _build_bench_map(GPU_RAW, BENCH_DOMAIN) if USE_BENCH else {}
CPU_IDX = { _norm(k): v for k, v in CPU_MAP.items() } if USE_BENCH else {}
GPU_IDX = { _norm(k): v for k, v in GPU_MAP.items() } if USE_BENCH else {}

def _percentile(arr, p):
    if not arr: return None
    arr = sorted(arr)
    k = (len(arr) - 1) * (p / 100.0)
    f = math.floor(k); c = math.ceil(k)
    return arr[int(k)] if f == c else arr[f] + (arr[c] - arr[f]) * (k - f)

CPU_P5  = _percentile(list(CPU_MAP.values()), 5)  if USE_BENCH else None
CPU_P95 = _percentile(list(CPU_MAP.values()), 95) if USE_BENCH else None
GPU_P5  = _percentile(list(GPU_MAP.values()), 5)  if USE_BENCH else None
GPU_P95 = _percentile(list(GPU_MAP.values()), 95) if USE_BENCH else None

if CPU_P5  is None: CPU_P5  = 1000.0
if CPU_P95 is None: CPU_P95 = CPU_P5 + 20000.0
if GPU_P5  is None: GPU_P5  = 1000.0
if GPU_P95 is None: GPU_P95 = GPU_P5 + 30000.0

def scale_0_100(x, lo=CPU_P5, hi=CPU_P95, method=BENCH_METHOD):
    if x is None: return None
    lo = max(lo, 1e-6); hi = max(hi, lo + 1e-6)
    if method == "logminmax":
        return float(min(1.0, max(0.0, (math.log(max(x,1e-6))-math.log(lo))/(math.log(hi)-math.log(lo))))) * 100.0
    return float(min(1.0, max(0.0, (x - lo) / (hi - lo)))) * 100.0

@lru_cache(maxsize=8192)
def lookup_cpu_raw(name: str):
    if not (USE_BENCH and name): return (None, "none")
    key = name.strip().lower()
    if key in CPU_MAP: return (CPU_MAP[key], "json-exact")
    nk = _norm(key)
    if nk in CPU_IDX:  return (CPU_IDX[nk], "json-norm")
    for k, v in CPU_MAP.items():
        if nk and (nk in _norm(k) or _norm(k) in nk):
            return (v, "json-contains")
    return (None, "none")

@lru_cache(maxsize=8192)
def lookup_gpu_raw(name: str):
    if not (USE_BENCH and name): return (None, "none")
    key = name.strip().lower()
    if key in GPU_MAP: return (GPU_MAP[key], "json-exact")
    nk = _norm(key)
    if nk in GPU_IDX:  return (GPU_IDX[nk], "json-norm")
    for k, v in GPU_MAP.items():
        if nk and (nk in _norm(k) or _norm(k) in nk):
            return (v, "json-contains")
    return (None, "none")
