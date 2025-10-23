import pandas as pd
from .config import ENGINE, FRESH_LIMIT, FRESH_WINDOW_DAYS

def fetch_one_variation_from_db(variation_id: int) -> pd.DataFrame:
    if ENGINE is None:
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
        return pd.read_sql(sql, con=ENGINE, params={"vid": variation_id})
    except Exception:
        return pd.DataFrame()

def fetch_fresh_items_from_db(exclude_variation_ids=None) -> pd.DataFrame:
    if ENGINE is None:
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
        return pd.read_sql(sql, con=ENGINE, params=params)
    except Exception:
        return pd.DataFrame()
