import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from ..models import TimeSeries, Observation


def _fetch_series(db: Session, symbol: str) -> pd.Series:
    """Fetch a time series from DB and return as a pandas Series indexed by date."""
    ts = db.query(TimeSeries).filter(TimeSeries.symbol == symbol).first()
    if not ts:
        return pd.Series(dtype=float, index=pd.DatetimeIndex([]))
    obs = db.query(Observation).filter(
        Observation.time_series_id == ts.id
    ).order_by(Observation.date).all()
    if not obs:
        return pd.Series(dtype=float, index=pd.DatetimeIndex([]))
    return pd.Series(
        [o.value for o in obs],
        index=pd.to_datetime([o.date for o in obs])
    )


def _compute_changes(series: pd.Series, label: str) -> dict:
    """Compute latest value, 3M and 1Y absolute/% changes for a series."""
    if series.empty:
        return {"label": label, "latest": 0, "change_3m": 0, "change_3m_pct": 0, "change_1y": 0, "change_1y_pct": 0}
    latest = float(series.iloc[-1])
    val_3m = float(series.iloc[-90]) if len(series) > 90 else float(series.iloc[0])
    val_1y = float(series.iloc[-365]) if len(series) > 365 else float(series.iloc[0])
    return {
        "label": label,
        "latest": round(latest, 2),
        "change_3m": round(latest - val_3m, 2),
        "change_3m_pct": round((latest - val_3m) / val_3m * 100, 2) if val_3m else 0,
        "change_1y": round(latest - val_1y, 2),
        "change_1y_pct": round((latest - val_1y) / val_1y * 100, 2) if val_1y else 0,
    }


def _series_to_json(series: pd.Series, resample: str = "ME") -> list:
    """Convert a pandas Series to a list of {date, value} dicts, resampled."""
    if series.empty:
        return []
    resampled = series.resample(resample).last().dropna()
    return [
        {"date": dt.strftime("%Y-%m-%d"), "value": round(float(v), 2)}
        for dt, v in resampled.items()
    ]


def compute_reserve_flow_data(db: Session) -> dict:
    """
    Compute FX reserves, gold reserves, COFER composition, TIC flows,
    SWF AUM, and credit impulse data.

    Returns
    -------
    dict with keys:
        fx_reserves       – per-country FX reserve data + history
        gold_reserves     – per-country gold reserve data + history
        cofer             – COFER currency composition history
        tic_flows         – TIC cross-border flow data
        swf               – SWF AUM data
        credit_impulse    – credit impulse data
    """

    # ===== FX Reserves =====
    fx_symbols = {
        "FX_RESERVES_CN": "China",
        "FX_RESERVES_JP": "Japan",
        "FX_RESERVES_IN": "India",
        "FX_RESERVES_SA": "Saudi Arabia",
        "FX_RESERVES_KR": "South Korea",
    }
    fx_data = {}
    fx_history = {}
    for sym, label in fx_symbols.items():
        s = _fetch_series(db, sym)
        if s.empty:
            continue
        fx_data[sym] = _compute_changes(s, label)
        fx_history[sym] = {"label": label, "data": _series_to_json(s)}

    # Total FX reserves
    fx_total_latest = sum(d["latest"] for d in fx_data.values())

    # ===== Gold Reserves =====
    gold_symbols = {
        "GOLD_RESERVES_CN": "China",
        "GOLD_RESERVES_IN": "India",
        "GOLD_RESERVES_PL": "Poland",
    }
    gold_data = {}
    gold_history = {}
    for sym, label in gold_symbols.items():
        s = _fetch_series(db, sym)
        if s.empty:
            continue
        gold_data[sym] = _compute_changes(s, label)
        # Accumulation rate (annualized): 1Y change
        gold_data[sym]["accumulation_rate_1y_pct"] = gold_data[sym]["change_1y_pct"]
        gold_history[sym] = {"label": label, "data": _series_to_json(s)}

    # ===== COFER Currency Composition =====
    cofer_symbols = {
        "COFER_USD_PCT": "USD Share",
        "COFER_EUR_PCT": "EUR Share",
        "COFER_CNY_PCT": "CNY Share",
        "COFER_GOLD_PCT": "Gold Share",
    }
    cofer_data = {}
    cofer_history = {}
    for sym, label in cofer_symbols.items():
        s = _fetch_series(db, sym)
        if s.empty:
            continue
        latest = float(s.iloc[-1]) if not s.empty else 0
        first = float(s.iloc[0]) if not s.empty else 0
        cofer_data[sym] = {
            "label": label,
            "latest_pct": round(latest, 2),
            "change_since_2020": round(latest - first, 2),
            "trend": "Declining" if latest < first else "Rising",
        }
        cofer_history[sym] = {"label": label, "data": _series_to_json(s, resample="QS")}

    # USD share trend: compute rolling quarterly
    usd_share = _fetch_series(db, "COFER_USD_PCT")
    usd_trend = "Declining" if not usd_share.empty and float(usd_share.iloc[-1]) < float(usd_share.iloc[0]) else "Stable"

    # ===== TIC Flows =====
    tic_symbols = {
        "TIC_JP_UST": "Japan UST Holdings",
        "TIC_CN_UST": "China UST Holdings",
        "TIC_TOTAL_FOREIGN": "Total Foreign UST Holdings",
    }
    tic_data = {}
    tic_history = {}
    for sym, label in tic_symbols.items():
        s = _fetch_series(db, sym)
        if s.empty:
            continue
        tic_data[sym] = _compute_changes(s, label)
        # Momentum: direction of 6M change
        val_6m = float(s.iloc[-180]) if len(s) > 180 else float(s.iloc[0])
        latest = float(s.iloc[-1])
        tic_data[sym]["momentum_6m"] = "Selling" if latest < val_6m else "Buying"
        tic_history[sym] = {"label": label, "data": _series_to_json(s)}

    # ===== SWF AUM =====
    swf_symbols = {
        "SWF_NBIM": "Norway GPFG",
        "SWF_ADIA": "ADIA (Abu Dhabi)",
        "SWF_PIF": "Saudi PIF",
        "SWF_CIC": "China CIC",
        "SWF_GIC": "Singapore GIC",
    }
    swf_data = {}
    swf_history = {}
    total_swf_latest = 0
    for sym, label in swf_symbols.items():
        s = _fetch_series(db, sym)
        if s.empty:
            continue
        swf_data[sym] = _compute_changes(s, label)
        total_swf_latest += swf_data[sym]["latest"]
        swf_history[sym] = {"label": label, "data": _series_to_json(s, resample="QS")}

    # ===== Credit Impulse =====
    credit_symbols = {
        "CREDIT_IMPULSE_US": "US Credit Impulse",
        "CREDIT_IMPULSE_CN": "China Credit Impulse",
        "CREDIT_IMPULSE_GLOBAL": "Global Credit Impulse",
    }
    credit_data = {}
    credit_history = {}
    for sym, label in credit_symbols.items():
        s = _fetch_series(db, sym)
        if s.empty:
            continue
        latest = float(s.iloc[-1]) if not s.empty else 0
        credit_data[sym] = {
            "label": label,
            "latest_pct": round(latest, 2),
            "signal": "Expansionary" if latest > 2 else "Contractionary" if latest < -2 else "Neutral",
        }
        credit_history[sym] = {"label": label, "data": _series_to_json(s, resample="QS")}

    return {
        "fx_reserves": {
            "countries": fx_data,
            "total_tracked_bn": round(fx_total_latest, 1),
            "history": fx_history,
        },
        "gold_reserves": {
            "countries": gold_data,
            "history": gold_history,
        },
        "cofer": {
            "composition": cofer_data,
            "usd_trend": usd_trend,
            "history": cofer_history,
        },
        "tic_flows": {
            "holdings": tic_data,
            "history": tic_history,
        },
        "swf": {
            "funds": swf_data,
            "total_aum_bn": round(total_swf_latest, 1),
            "history": swf_history,
        },
        "credit_impulse": {
            "impulses": credit_data,
            "history": credit_history,
        },
    }
