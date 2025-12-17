import numpy as np
import pandas as pd
from .config import (
    TOPK, LAMBDA_PRICE_JUMP,
    DF_PATH, SCALER_PATH, XALL_PATH, VARIDS_PATH
)
from .db import fetch_one_variation_from_db, fetch_fresh_items_from_db
from .features import calculate_perf_from_mapping_or_rule
from .knn_numpy import knn_kneighbors_numpy, euclid_weighted
from .recency import score_fresh_candidates
import joblib

# ---- load artifacts tại import-time
DF = pd.read_pickle(DF_PATH)
SCALER = joblib.load(SCALER_PATH)
X_ALL = np.load(XALL_PATH)                 # (N,2)
VAR_IDS = np.load(VARIDS_PATH)             # (N,)

def health_info():
    return {
        "ok": True,
        "items": int(DF.shape[0]),
        "x_all_shape": list(X_ALL.shape)
    }

def recommend_core(var_id: int):
    df_ids = set(DF["variation_id"].tolist())

    # 1) chuẩn bị query vector
    base_product_id = None # <-- Biến mới để lưu product_id gốc

    if var_id in df_ids:
        base = DF.loc[DF["variation_id"] == var_id].iloc[0]
        q_price = float(base["price"]); q_perf = float(base["performance_score"])
        q_scaled = SCALER.transform(np.array([[q_price, q_perf]], dtype=float))[0]
        base_row = base
        base_product_id = int(base["product_id"]) # <-- Lấy product_id gốc
    else:
        fresh_one = fetch_one_variation_from_db(var_id)
        if fresh_one is None or fresh_one.empty:
            return None, 404
        fresh_one = fresh_one.iloc[0].copy()
        perf, cpu_src, gpu_src, _, _ = calculate_perf_from_mapping_or_rule(fresh_one)
        fresh_one["performance_score"] = perf
        q_price = float(fresh_one["price"]); q_perf = float(fresh_one["performance_score"])
        q_scaled = SCALER.transform(np.array([[q_price, q_perf]], dtype=float))[0]
        base_row = pd.Series({"variation_id": int(fresh_one["variation_id"]), "price": q_price, "performance_score": q_perf})
        base_product_id = int(fresh_one["product_id"]) # <-- Lấy product_id gốc

    # 2) ứng viên từ index
    n_neighbors = min(int(TOPK) + 15, len(DF))
    dists, idxs = knn_kneighbors_numpy(X_ALL, q_scaled, n_neighbors=n_neighbors)
    idxs = [i for i in idxs[0].tolist()
            if int(DF.iloc[i]["variation_id"]) != int(base_row["variation_id"])]
    base_price = float(q_price)
    cand_knn = []
    for i in idxs:
        p_i = float(DF.iloc[i]["price"])
        d = euclid_weighted(q_scaled, X_ALL[i])
        price_jump_pen = LAMBDA_PRICE_JUMP * ((p_i - base_price) / base_price) if (p_i > base_price and base_price > 0) else 0.0
        sim = 1.0 / (1e-6 + d * (1.0 + price_jump_pen))
        cand_knn.append(("indexed", i, sim, None))

    # 3) ứng viên từ fresh pool
    fresh_df = fetch_fresh_items_from_db(exclude_variation_ids=[int(base_row["variation_id"])])
    cand_fresh = []
    if fresh_df is not None and not fresh_df.empty:
        mask_new = ~fresh_df["variation_id"].isin(df_ids)
        fresh_df = fresh_df.loc[mask_new].reset_index(drop=True)
        perf_list, cpu_srcs, gpu_srcs = [], [], []
        for _, r in fresh_df.iterrows():
            score, cpu_src, gpu_src, _, _ = calculate_perf_from_mapping_or_rule(r)
            perf_list.append(score); cpu_srcs.append(cpu_src); gpu_srcs.append(gpu_src)
        fresh_df["performance_score"] = perf_list
        fresh_df["cpu_source"] = cpu_srcs
        fresh_df["gpu_source"] = gpu_srcs
        fresh_df["score_source"] = np.where(
            (fresh_df["cpu_source"] != "rule") | (fresh_df["gpu_source"] != "rule"),
            "fresh:benchmark", "fresh:rule"
        )
        scored = score_fresh_candidates(SCALER, q_scaled, q_price, fresh_df)
        for i, sim in scored:
            cand_fresh.append(("fresh", i, sim, fresh_df))


    # 4) gộp & rerank
    pool = cand_knn + cand_fresh
    pool.sort(key=lambda t: t[2], reverse=True)

    # 5) response 
    out = []
    
    # Thêm product_id GỐC vào danh sách đã thấy
    seen_product_ids = {base_product_id}

    for src, i, _, fdf in pool:
        current_product_id = None
        current_variation_id = None
        r = None # Khai báo r

        if src == "indexed":
            r = DF.iloc[i]
            current_product_id = int(r["product_id"])
            current_variation_id = int(r["variation_id"])
        else: # src == "fresh"
            r = fdf.iloc[i]
            current_product_id = int(r["product_id"])
            current_variation_id = int(r["variation_id"])
            
        # Kiểm tra trùng lặp
        if current_product_id not in seen_product_ids:
            seen_product_ids.add(current_product_id)
            
            # Build object
            if src == "indexed":
                out.append({
                    "variation_id": current_variation_id,
                    "product_id": current_product_id,
                    "product_name": str(r["product_name"]),
                    "price": float(r["price"]),
                    "performance_score": float(r["performance_score"]),
                    "cpu_source": str(r.get("cpu_source", "unknown")),
                    "gpu_source": str(r.get("gpu_source", "unknown")),
                    "score_source": f"cpu:{r.get('cpu_source','?')},gpu:{r.get('gpu_source','?')}",
                    "source": "indexed"
                })
            else:
                out.append({
                    "variation_id": current_variation_id,
                    "product_id": current_product_id,
                    "product_name": str(r["product_name"]),
                    "price": float(r["price"]),
                    "performance_score": float(r["performance_score"]),
                    "cpu_source": str(r.get("cpu_source", "rule")),
                    "gpu_source": str(r.get("gpu_source", "rule")),
                    "score_source": str(r.get("score_source", "fresh:rule")),
                    "source": "fresh"
                })

        # Dừng khi đủ TOPK
        if len(out) >= TOPK:
            break
            
    return out, 200
