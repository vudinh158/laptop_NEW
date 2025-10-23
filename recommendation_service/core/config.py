import os
from dotenv import load_dotenv
from sqlalchemy import create_engine

load_dotenv()

# ---- hyperparams & weights
TOPK = int(os.getenv("RECS_TOPK", 10))
ALPHA = float(os.getenv("RECS_ALPHA_PRICE", 0.6))
BETA  = float(os.getenv("RECS_BETA_PERF", 0.4))
LAMBDA_PRICE_JUMP = float(os.getenv("RECS_PRICE_JUMP_LAMBDA", 0.6))

# ---- fresh/recency
FRESH_LIMIT = int(os.getenv("RECS_FRESH_LIMIT", 200))
FRESH_WINDOW_DAYS = int(os.getenv("RECS_FRESH_WINDOW_DAYS", 60))
RECENCY_GAMMA = float(os.getenv("RECS_RECENCY_GAMMA", 0.12))
RECENCY_HALFLIFE = float(os.getenv("RECS_RECENCY_HALFLIFE", 21))

# ---- benchmark mapping
USE_BENCH = os.getenv("USE_BENCH_IN_API", "true").lower() == "true"
BENCH_METHOD = os.getenv("BENCH_SCALE_METHOD", "logminmax")     # logminmax|minmax
BENCH_DOMAIN = os.getenv("BENCH_DOMAIN", "all")                  # consumer|all

# ---- paths
ARTEFACTS_DIR = os.getenv("ARTEFACTS_DIR", "artefacts")
DATA_DIR = os.getenv("DATA_DIR", "data")

CPU_JSON_PATH = os.path.join(DATA_DIR, "cpu_benchmark.json")
GPU_JSON_PATH = os.path.join(DATA_DIR, "gpu_benchmark.json")
DF_PATH       = os.path.join(ARTEFACTS_DIR, "products_df_from_db.pkl")
SCALER_PATH   = os.path.join(ARTEFACTS_DIR, "scaler.joblib")
XALL_PATH     = os.path.join(ARTEFACTS_DIR, "knn_X_all.npy")
VARIDS_PATH   = os.path.join(ARTEFACTS_DIR, "knn_variation_ids.npy")

# ---- DB
DB_URL = os.getenv("DATABASE_URL")
ENGINE = create_engine(DB_URL, pool_pre_ping=True) if DB_URL else None
