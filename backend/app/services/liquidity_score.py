import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from ..models import TimeSeries, Observation
from datetime import date

DEFAULT_WEIGHTS = {
    "WALCL": 0.20,              # Fed Balance Sheet
    "M2SL": 0.15,               # Money Supply M2
    "DXY": -0.10,               # US Dollar (negative weight)
    "DFII10": -0.10,            # Real Yields (negative weight)
    "BAMLH0A0HYM2": -0.05,      # Credit Spreads (negative weight)
    "VIX": -0.05,               # Volatility (negative weight)
    "USDT_SUPPLY": 0.05,        # Stablecoin supply
    "YEN_CARRY_INDEX": 0.20,    # Yen Carry Trade score (high weight, fuels spec markets)
    "GLOBAL_SURPLUS_FLOW": 0.10 # Capital surplus exporters reserves (JP, CN, Gulf)
}

def compute_historical_liquidity_score(db: Session, custom_weights=None):
    weights = custom_weights if custom_weights is not None else DEFAULT_WEIGHTS
    symbols = list(weights.keys())
    
    data_dict = {}
    for sym in symbols:
        ts = db.query(TimeSeries).filter(TimeSeries.symbol == sym).first()
        if not ts:
            continue
        obs = db.query(Observation).filter(Observation.time_series_id == ts.id).order_by(Observation.date).all()
        if not obs:
            continue
        
        dates = [o.date for o in obs]
        vals = [o.value for o in obs]
        data_dict[sym] = pd.Series(vals, index=pd.to_datetime(dates))

    if not data_dict:
        return []

    df = pd.DataFrame(data_dict)
    df = df.resample('D').ffill()
    df = df.dropna(how='all').ffill().bfill()

    changes = pd.DataFrame(index=df.index)
    
    # 3M change
    if "WALCL" in df.columns:
        changes["WALCL"] = df["WALCL"].pct_change(90)
    # 6M change
    if "M2SL" in df.columns:
        changes["M2SL"] = df["M2SL"].pct_change(180)
    # 3M change
    if "DXY" in df.columns:
        changes["DXY"] = df["DXY"].pct_change(90)
    # Real yield
    if "DFII10" in df.columns:
        changes["DFII10"] = df["DFII10"].diff(90)
    # High-yield spreads
    if "BAMLH0A0HYM2" in df.columns:
        changes["BAMLH0A0HYM2"] = df["BAMLH0A0HYM2"].diff(90)
    # Volatility
    if "VIX" in df.columns:
        changes["VIX"] = df["VIX"].diff(30)
    # Stablecoin pct
    if "USDT_SUPPLY" in df.columns:
        changes["USDT_SUPPLY"] = df["USDT_SUPPLY"].pct_change(90)
    # Yen Carry Index (3M diff)
    if "YEN_CARRY_INDEX" in df.columns:
        changes["YEN_CARRY_INDEX"] = df["YEN_CARRY_INDEX"].diff(90)
    # Global Surplus flows pct
    if "GLOBAL_SURPLUS_FLOW" in df.columns:
        changes["GLOBAL_SURPLUS_FLOW"] = df["GLOBAL_SURPLUS_FLOW"].pct_change(90)

    z_scores = pd.DataFrame(index=df.index)
    for col in changes.columns:
        rolling_mean = changes[col].rolling(window=252, min_periods=30).mean()
        rolling_std = changes[col].rolling(window=252, min_periods=30).std()
        rolling_std = rolling_std.replace(0, 1e-6)
        z_scores[col] = (changes[col] - rolling_mean) / rolling_std

    z_scores = z_scores.fillna(0)

    composite = pd.Series(0.0, index=df.index)
    contributions = {}
    
    for sym, weight in weights.items():
        if sym in z_scores.columns:
            weighted_val = z_scores[sym] * weight
            composite += weighted_val
            contributions[sym] = (weighted_val * 20).round(2).tolist()

    scaled_score = (np.tanh(composite / 1.5) * 100).round(1)

    regime = []
    for val in scaled_score:
        if val >= 60:
            regime.append("Strong Expansion")
        elif val >= 20:
            regime.append("Improving")
        elif val >= -20:
            regime.append("Neutral")
        elif val >= -60:
            regime.append("Tightening")
        else:
            regime.append("Stress")

    results = []
    dates_str = df.index.strftime('%Y-%m-%d').tolist()
    scaled_list = scaled_score.tolist()

    for idx, dt in enumerate(dates_str):
        contrib_dict = {sym: contributions[sym][idx] for sym in contributions if idx < len(contributions[sym])}
        results.append({
            "date": dt,
            "score": scaled_list[idx],
            "regime": regime[idx],
            "contributions": contrib_dict
        })
        
    return results
