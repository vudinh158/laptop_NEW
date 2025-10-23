import numpy as np
import pandas as pd
from .config import RECENCY_GAMMA, RECENCY_HALFLIFE, LAMBDA_PRICE_JUMP, ALPHA, BETA

def recency_boost(sim: float, age_days: float) -> float:
    if RECENCY_GAMMA <= 0:
        return sim
    recency = np.exp(-float(age_days) / max(RECENCY_HALFLIFE, 1e-6))
    return sim * (1.0 + RECENCY_GAMMA * recency)

def score_fresh_candidates(SCALER, q_scaled, q_base_price, fresh_df):
    if fresh_df is None or fresh_df.empty:
        return []

    X_fresh = SCALER.transform(fresh_df[["price", "performance_score"]].values)
    out = []

    ages = None
    if "ts" in fresh_df.columns:
        ages = (pd.Timestamp.utcnow() - pd.to_datetime(fresh_df["ts"], utc=True)).dt.total_seconds() / (3600 * 24)
        ages = np.clip(ages, 0, 3650)

    for i in range(X_fresh.shape[0]):
        x = X_fresh[i]
        dp = q_scaled[0] - x[0]
        df = q_scaled[1] - x[1]
        d = np.sqrt(ALPHA * dp * dp + BETA * df * df)

        p_i = float(fresh_df.iloc[i]["price"])
        price_jump_pen = 0.0
        if p_i > q_base_price and q_base_price > 0:
            price_jump_pen = LAMBDA_PRICE_JUMP * ((p_i - q_base_price) / q_base_price)
        sim = 1.0 / (1e-6 + d * (1.0 + price_jump_pen))

        if ages is not None:
            sim = recency_boost(sim, float(ages.iloc[i]))

        out.append((i, sim))
    return out
