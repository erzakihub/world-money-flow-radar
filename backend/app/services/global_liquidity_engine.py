import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from ..models import TimeSeries, Observation


# Approximate exchange rates for converting to USD
FX_RATES = {
    "EUR": 1.10,      # EUR -> USD
    "JPY": 1 / 150,   # JPY -> USD
    "CNY": 1 / 7.2,   # CNY -> USD
    "GBP": 1.27,      # GBP -> USD
    "INR": 1 / 83,    # INR -> USD
    "CHF": 1.10,      # CHF -> USD
}

# Central bank symbols and their currency / unit-scaling
CB_CONFIG = {
    "WALCL":      {"currency": "USD", "scale": 1e-3,  "label": "Fed (US)"},        # USD Millions -> Billions
    "ECB_ASSETS": {"currency": "EUR", "scale": 1.0,   "label": "ECB (Eurozone)"},  # EUR Billions
    "BOJ_ASSETS": {"currency": "JPY", "scale": 1e3,   "label": "BoJ (Japan)"},     # JPY Trillions -> Billions
    "PBOC_ASSETS":{"currency": "CNY", "scale": 1e3,   "label": "PBoC (China)"},    # CNY Trillions -> Billions
    "BOE_ASSETS": {"currency": "GBP", "scale": 1.0,   "label": "BoE (UK)"},        # GBP Billions
    "RBI_ASSETS": {"currency": "INR", "scale": 1e3,   "label": "RBI (India)"},     # INR Trillions -> Billions
    "SNB_ASSETS": {"currency": "CHF", "scale": 1.0,   "label": "SNB (Switzerland)"},# CHF Billions
}


def _fetch_series(db: Session, symbol: str) -> pd.Series:
    """Fetch a time series from DB and return as a pandas Series indexed by date."""
    ts = db.query(TimeSeries).filter(TimeSeries.symbol == symbol).first()
    if not ts:
        return pd.Series(dtype=float)
    obs = db.query(Observation).filter(
        Observation.time_series_id == ts.id
    ).order_by(Observation.date).all()
    if not obs:
        return pd.Series(dtype=float)
    return pd.Series(
        [o.value for o in obs],
        index=pd.to_datetime([o.date for o in obs])
    )


def _to_usd_billions(series: pd.Series, currency: str, scale: float) -> pd.Series:
    """Convert a series from native currency/unit to USD Billions."""
    # First convert to native-currency billions via scale
    native_billions = series * scale
    # Then convert to USD
    if currency == "USD":
        return native_billions
    rate = FX_RATES.get(currency, 1.0)
    return native_billions * rate


def compute_global_cb_data(db: Session) -> dict:
    """
    Compute global central-bank balance-sheet data.

    Returns
    -------
    dict with keys:
        cb_series      – per-CB historical USD Billions time-series (for stacked area)
        aggregate       – global aggregate USD Billions time-series
        fed_net_liq     – Fed net liquidity (WALCL - TGA - RRP) time-series
        latest          – latest snapshot metrics
        regime_history  – regime classification over time
    """

    # ---- 1. Fetch and convert each CB to USD Billions ----
    cb_frames = {}
    for symbol, cfg in CB_CONFIG.items():
        raw = _fetch_series(db, symbol)
        if raw.empty:
            continue
        usd = _to_usd_billions(raw, cfg["currency"], cfg["scale"])
        cb_frames[symbol] = usd

    if not cb_frames:
        return {"cb_series": [], "aggregate": [], "fed_net_liq": [], "latest": {}, "regime_history": []}

    # Align all series to daily, forward fill
    df = pd.DataFrame(cb_frames)
    df = df.resample("D").ffill().dropna(how="all").ffill().bfill()

    # ---- 2. Calculate aggregate ----
    df["AGGREGATE"] = df.sum(axis=1)

    # ---- 3. Individual CB change metrics (3M and 1Y) ----
    cb_changes = {}
    for symbol in cb_frames:
        if symbol not in df.columns:
            continue
        col = df[symbol]
        latest_val = float(col.iloc[-1])
        val_3m_ago = float(col.iloc[-90]) if len(col) > 90 else float(col.iloc[0])
        val_1y_ago = float(col.iloc[-365]) if len(col) > 365 else float(col.iloc[0])
        cb_changes[symbol] = {
            "label": CB_CONFIG[symbol]["label"],
            "latest_usd_bn": round(latest_val, 1),
            "change_3m_usd_bn": round(latest_val - val_3m_ago, 1),
            "change_3m_pct": round((latest_val - val_3m_ago) / val_3m_ago * 100, 2) if val_3m_ago else 0,
            "change_1y_usd_bn": round(latest_val - val_1y_ago, 1),
            "change_1y_pct": round((latest_val - val_1y_ago) / val_1y_ago * 100, 2) if val_1y_ago else 0,
        }

    # ---- 4. Fed Net Liquidity = WALCL - TGA - RRP ----
    walcl = _fetch_series(db, "WALCL")
    tga = _fetch_series(db, "TGA")
    rrp = _fetch_series(db, "RRP")

    fed_net_liq_series = []
    if not walcl.empty and not tga.empty and not rrp.empty:
        fed_df = pd.DataFrame({"walcl": walcl, "tga": tga, "rrp": rrp})
        fed_df = fed_df.resample("D").ffill().dropna(how="all").ffill().bfill()
        # WALCL is in USD Millions, TGA and RRP in USD Billions
        fed_df["net_liq"] = (fed_df["walcl"] / 1000) - fed_df["tga"] - fed_df["rrp"]
        for dt, row in fed_df.iterrows():
            fed_net_liq_series.append({
                "date": dt.strftime("%Y-%m-%d"),
                "value": round(float(row["net_liq"]), 1),
            })

    # ---- 5. Global Net Liquidity Index (z-score) ----
    agg = df["AGGREGATE"]
    agg_pct = agg.pct_change(90)
    rolling_mean = agg_pct.rolling(window=252, min_periods=30).mean()
    rolling_std = agg_pct.rolling(window=252, min_periods=30).std().replace(0, 1e-6)
    z_score = (agg_pct - rolling_mean) / rolling_std
    z_score = z_score.fillna(0)
    scaled = (np.tanh(z_score / 1.5) * 100).round(1)

    # ---- 6. Regime classification ----
    regime_history = []
    for dt, val in scaled.items():
        v = float(val)
        if v >= 40:
            regime = "QE Expansion"
        elif v >= -10:
            regime = "Neutral"
        else:
            regime = "QT Contraction"
        regime_history.append({
            "date": dt.strftime("%Y-%m-%d"),
            "score": v,
            "regime": regime,
        })

    # ---- 7. Build per-CB time-series for stacked area chart ----
    cb_series_out = {}
    for symbol in cb_frames:
        if symbol not in df.columns:
            continue
        # Downsample to weekly for reasonable payload size
        weekly = df[symbol].resample("W").last().dropna()
        cb_series_out[symbol] = {
            "label": CB_CONFIG[symbol]["label"],
            "data": [
                {"date": dt.strftime("%Y-%m-%d"), "value": round(float(v), 1)}
                for dt, v in weekly.items()
            ],
        }

    # Aggregate weekly
    agg_weekly = df["AGGREGATE"].resample("W").last().dropna()
    aggregate_out = [
        {"date": dt.strftime("%Y-%m-%d"), "value": round(float(v), 1)}
        for dt, v in agg_weekly.items()
    ]

    # ---- 8. Latest snapshot ----
    latest_agg = float(df["AGGREGATE"].iloc[-1])
    agg_3m = float(df["AGGREGATE"].iloc[-90]) if len(df) > 90 else float(df["AGGREGATE"].iloc[0])
    agg_1y = float(df["AGGREGATE"].iloc[-365]) if len(df) > 365 else float(df["AGGREGATE"].iloc[0])

    latest = {
        "total_global_cb_usd_tn": round(latest_agg / 1000, 2),
        "change_3m_usd_tn": round((latest_agg - agg_3m) / 1000, 2),
        "change_1y_usd_tn": round((latest_agg - agg_1y) / 1000, 2),
        "current_regime": regime_history[-1]["regime"] if regime_history else "Unknown",
        "current_score": regime_history[-1]["score"] if regime_history else 0.0,
        "cb_details": cb_changes,
    }

    return {
        "cb_series": cb_series_out,
        "aggregate": aggregate_out,
        "fed_net_liq": fed_net_liq_series[-365:],  # last year
        "latest": latest,
        "regime_history": regime_history[-365:],    # last year
    }
