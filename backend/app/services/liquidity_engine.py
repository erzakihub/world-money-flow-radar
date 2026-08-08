import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from ..models import TimeSeries, Observation
from .scoring_config import GLOBAL_LIQUIDITY_IMPULSE_WEIGHTS

def _fetch_series(db: Session, symbol: str) -> pd.Series:
    ts = db.query(TimeSeries).filter(TimeSeries.symbol == symbol).first()
    if not ts:
        return pd.Series(dtype=float)
    obs = db.query(Observation).filter(Observation.time_series_id == ts.id).order_by(Observation.date).all()
    if not obs:
        return pd.Series(dtype=float)
    return pd.Series(
        [o.value for o in obs],
        index=pd.to_datetime([o.date for o in obs])
    )

def _normalize_series(s: pd.Series, lookback: int = 120) -> pd.Series:
    """Normalize a series using a rolling min-max or z-score scaled to 0-100."""
    if s.empty:
        return pd.Series(dtype=float)
    rolling_min = s.rolling(window=lookback, min_periods=10).min()
    rolling_max = s.rolling(window=lookback, min_periods=10).max()
    denom = (rolling_max - rolling_min).replace(0, 1e-6)
    normalized = (s - rolling_min) / denom * 100
    return normalized.fillna(50)

def compute_liquidity_impulse(db: Session) -> dict:
    """
    Computes Global Liquidity Impulse Score out of 100.
    Outputs: Score (0-100), Momentum, Acceleration, Regime, History
    """
    # Fetch core series
    fed = _fetch_series(db, "WALCL")
    tga = _fetch_series(db, "TGA")
    rrp = _fetch_series(db, "RRP")
    ecb = _fetch_series(db, "ECB_ASSETS")
    boj = _fetch_series(db, "BOJ_ASSETS")
    pboc = _fetch_series(db, "PBOC_ASSETS")
    m2 = _fetch_series(db, "M2SL")
    dxy = _fetch_series(db, "DXY")
    yields = _fetch_series(db, "DFII10")

    # Compute Fed Net Liquidity
    fed_net = pd.Series(dtype=float)
    if not fed.empty and not tga.empty and not rrp.empty:
        df_fed = pd.DataFrame({"walcl": fed, "tga": tga, "rrp": rrp}).ffill().bfill()
        fed_net = (df_fed["walcl"] / 1000.0) - df_fed["tga"] - df_fed["rrp"]

    # Align all on weekly frequency
    data_dict = {}
    if not fed_net.empty: data_dict["fed_net_liquidity"] = _normalize_series(fed_net)
    if not ecb.empty: data_dict["ecb_assets"] = _normalize_series(ecb)
    if not boj.empty: data_dict["boj_assets"] = _normalize_series(boj)
    if not pboc.empty: data_dict["pboc_assets"] = _normalize_series(pboc)
    if not m2.empty: data_dict["global_m2"] = _normalize_series(m2)
    if not dxy.empty: data_dict["dxy_inverted"] = 100 - _normalize_series(dxy)
    if not yields.empty: data_dict["real_yields_inverted"] = 100 - _normalize_series(yields)

    if not data_dict:
        return {"score": 50, "regime": "Neutral", "momentum": 0.0, "acceleration": 0.0, "history": []}

    df = pd.DataFrame(data_dict).resample("W").last().ffill().bfill()
    
    # Apply weights
    weights = GLOBAL_LIQUIDITY_IMPULSE_WEIGHTS
    active_weights = {k: weights[k] for k in weights if k in df.columns}
    weight_sum = sum(active_weights.values())
    if weight_sum > 0:
        active_weights = {k: v / weight_sum for k, v in active_weights.items()}
    
    df["impulse"] = sum(df[col] * active_weights[col] for col in active_weights)
    
    # Calculate Momentum (1M change) and Acceleration (change in momentum)
    df["momentum"] = df["impulse"].diff(4).fillna(0)
    df["acceleration"] = df["momentum"].diff(4).fillna(0)
    
    latest_score = float(df["impulse"].iloc[-1]) if not df.empty else 50.0
    latest_mom = float(df["momentum"].iloc[-1]) if not df.empty else 0.0
    latest_acc = float(df["acceleration"].iloc[-1]) if not df.empty else 0.0

    regime = "Expansion" if latest_score > 60 else "Contraction" if latest_score < 40 else "Neutral"
    
    # Form history list
    history = []
    for dt, row in df.iterrows():
        history.append({
            "date": dt.strftime("%Y-%m-%d"),
            "score": round(float(row["impulse"]), 1),
            "momentum": round(float(row["momentum"]), 2),
            "acceleration": round(float(row["acceleration"]), 2)
        })

    return {
        "score": round(latest_score, 1),
        "momentum": round(latest_mom, 2),
        "acceleration": round(latest_acc, 2),
        "regime": regime,
        "history": history[-52:]  # Last year
    }

def compute_dollar_stress(db: Session) -> dict:
    """
    Computes Dollar Liquidity Stress Score (0-100).
    Scale: <40 Easy, 40-60 Neutral, 60-80 Tight, >80 Stress.
    """
    dxy = _fetch_series(db, "DXY")
    yields = _fetch_series(db, "DFII10")
    spreads = _fetch_series(db, "BAMLH0A0HYM2") # High Yield spreads
    vix = _fetch_series(db, "VIX")
    eurodollar = _fetch_series(db, "EURODOLLAR_SPREAD")

    data = {}
    if not dxy.empty: data["dxy"] = _normalize_series(dxy)
    if not yields.empty: data["yields"] = _normalize_series(yields)
    if not spreads.empty: data["spreads"] = _normalize_series(spreads)
    if not vix.empty: data["vix"] = _normalize_series(vix)
    if not eurodollar.empty: data["eurodollar"] = _normalize_series(eurodollar)

    if not data:
        return {"score": 50, "status": "Neutral", "change_4w": 0.0, "change_13w": 0.0, "history": []}

    df = pd.DataFrame(data).resample("W").last().ffill().bfill()
    df["stress"] = df.mean(axis=1)

    latest_score = float(df["stress"].iloc[-1]) if not df.empty else 50.0
    val_4w = float(df["stress"].iloc[-5]) if len(df) > 5 else latest_score
    val_13w = float(df["stress"].iloc[-14]) if len(df) > 14 else latest_score

    status = "Easy" if latest_score < 40 else "Neutral" if latest_score < 60 else "Tight" if latest_score < 80 else "Stress"
    
    history = [
        {"date": dt.strftime("%Y-%m-%d"), "value": round(float(v), 1)}
        for dt, v in df["stress"].items()
    ]

    return {
        "score": round(latest_score, 1),
        "status": status,
        "change_4w": round(latest_score - val_4w, 1),
        "change_13w": round(latest_score - val_13w, 1),
        "history": history[-52:]
    }

def compute_carry_stress(db: Session) -> dict:
    """
    Computes Carry Trade Stress Score (0-100).
    Status: Building (low stress), Stable (neutral), Warning, Unwind (high stress)
    """
    usdjpy = _fetch_series(db, "USDJPY=X")
    carry_idx = _fetch_series(db, "YEN_CARRY_INDEX")
    vol = _fetch_series(db, "VIX") # proxy for cross-asset volatility

    # Carry stress rises when JPY appreciates (USDJPY drops) and Volatility rises
    data = {}
    if not usdjpy.empty: data["jpy_appreciation"] = 100 - _normalize_series(usdjpy)
    if not carry_idx.empty: data["carry_unravel"] = 100 - _normalize_series(carry_idx)
    if not vol.empty: data["volatility"] = _normalize_series(vol)

    if not data:
        return {"score": 30, "status": "Stable", "change_4w": 0.0, "change_13w": 0.0, "history": []}

    df = pd.DataFrame(data).resample("W").last().ffill().bfill()
    df["carry_stress"] = df.mean(axis=1)

    latest_score = float(df["carry_stress"].iloc[-1]) if not df.empty else 30.0
    val_4w = float(df["carry_stress"].iloc[-5]) if len(df) > 5 else latest_score
    val_13w = float(df["carry_stress"].iloc[-14]) if len(df) > 14 else latest_score

    status = "Building" if latest_score < 35 else "Stable" if latest_score < 55 else "Warning" if latest_score < 75 else "Unwind"

    history = [
        {"date": dt.strftime("%Y-%m-%d"), "value": round(float(v), 1)}
        for dt, v in df["carry_stress"].items()
    ]

    return {
        "score": round(latest_score, 1),
        "status": status,
        "change_4w": round(latest_score - val_4w, 1),
        "change_13w": round(latest_score - val_13w, 1),
        "history": history[-52:]
    }

def compute_risk_appetite(db: Session) -> dict:
    """
    Computes Risk Appetite Score (0-100).
    Status: Risk-On (>60), Neutral (40-60), Risk-Off (<40)
    """
    spy = _fetch_series(db, "SPY")
    gld = _fetch_series(db, "GLD")
    vix = _fetch_series(db, "VIX")
    btc = _fetch_series(db, "BTC-USD")

    # Ratio of Risk / Safe
    data = {}
    if not spy.empty and not gld.empty:
        # Equities vs Gold ratio
        ratio = spy / gld.replace(0, 1e-6)
        data["equity_gold_ratio"] = _normalize_series(ratio)
    if not vix.empty:
        data["vix_inverted"] = 100 - _normalize_series(vix)
    if not btc.empty:
        data["crypto_impulse"] = _normalize_series(btc)

    if not data:
        return {"score": 50, "status": "Neutral", "change_4w": 0.0, "change_13w": 0.0, "history": []}

    df = pd.DataFrame(data).resample("W").last().ffill().bfill()
    df["risk_appetite"] = df.mean(axis=1)

    latest_score = float(df["risk_appetite"].iloc[-1]) if not df.empty else 50.0
    val_4w = float(df["risk_appetite"].iloc[-5]) if len(df) > 5 else latest_score
    val_13w = float(df["risk_appetite"].iloc[-14]) if len(df) > 14 else latest_score

    status = "Risk-On" if latest_score > 60 else "Risk-Off" if latest_score < 40 else "Neutral"

    history = [
        {"date": dt.strftime("%Y-%m-%d"), "value": round(float(v), 1)}
        for dt, v in df["risk_appetite"].items()
    ]

    return {
        "score": round(latest_score, 1),
        "status": status,
        "change_4w": round(latest_score - val_4w, 1),
        "change_13w": round(latest_score - val_13w, 1),
        "history": history[-52:]
    }
