import numpy as np
from .config import ALPHA, BETA, LAMBDA_PRICE_JUMP

def euclid_weighted(q, x):
    dp = q[0] - x[0]
    df = q[1] - x[1]
    return np.sqrt(ALPHA * dp * dp + BETA * df * df)

def knn_kneighbors_numpy(X_all: np.ndarray, q_scaled: np.ndarray, n_neighbors: int):
    """
    X_all: (N,2) đã scale; q_scaled: (2,) hoặc (1,2)
    return (dists[[...]], idxs[[...]])
    """
    q = np.asarray(q_scaled, dtype=np.float64).reshape(-1)
    dp = X_all[:, 0] - q[0]
    df = X_all[:, 1] - q[1]
    d2 = ALPHA * dp * dp + BETA * df * df
    d = np.sqrt(d2)

    n = min(int(n_neighbors), X_all.shape[0])
    idx_part = np.argpartition(d, n - 1)[:n]
    order = np.argsort(d[idx_part])
    idx_sorted = idx_part[order]
    d_sorted = d[idx_sorted]
    return d_sorted.reshape(1, -1), idx_sorted.reshape(1, -1)
