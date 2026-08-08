import numpy as np
import pandas as pd
import json
from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta
from ..models import TimeSeries, Observation, DerivedIndicator, Instrument, Price
import random

# Helper to fetch observations from database
def _fetch_series(db: Session, symbol: str) -> pd.Series:
    ts = db.query(TimeSeries).filter(TimeSeries.symbol == symbol).first()
    if not ts:
        return pd.Series(dtype=float, index=pd.DatetimeIndex([]))
    obs = db.query(Observation).filter(Observation.time_series_id == ts.id).order_by(Observation.date).all()
    if not obs:
        return pd.Series(dtype=float, index=pd.DatetimeIndex([]))
    return pd.Series(
        [o.value for o in obs],
        index=pd.to_datetime([o.date for o in obs])
    )

def _normalize(val, min_val=0, max_val=100):
    return max(0.0, min(100.0, float((val - min_val) / (max_val - min_val) * 100.0) if max_val != min_val else 50.0))

# 1. Master Indicators Calculations
def calculate_liquidity_creation_score(db: Session, target_date: date) -> dict:
    # Fetch WALCL, ECB, BOJ assets
    walcl = _fetch_series(db, "WALCL")
    ecb = _fetch_series(db, "ECB_ASSETS")
    boj = _fetch_series(db, "BOJ_ASSETS")
    
    # Filter up to target_date
    t_dt = pd.to_datetime(target_date)
    walcl = walcl[walcl.index <= t_dt]
    ecb = ecb[ecb.index <= t_dt]
    boj = boj[boj.index <= t_dt]
    
    # Defaults
    cb_growth = 5.0
    if not walcl.empty and len(walcl) > 12:
        cb_growth = float(walcl.pct_change(12).iloc[-1]) * 100
        
    score = _normalize(cb_growth, -10.0, 20.0)
    
    # Adjust for QE status
    if score >= 85: status = "Expanding"
    elif score >= 70: status = "Neutral"
    elif score >= 45: status = "Contracting"
    elif score >= 20: status = "Crisis Liquidity"
    else: status = "Liquidity Drain"
    
    return {
        "score": round(score, 1),
        "status": status,
        "details": f"Central bank assets year-over-year expansion rate is {cb_growth:.2f}%."
    }

def calculate_liquidity_transmission_score(db: Session, target_date: date) -> dict:
    # This is the most important score. Tracks credit impulse and spread tightness.
    credit_us = _fetch_series(db, "CREDIT_IMPULSE_US")
    credit_cn = _fetch_series(db, "CREDIT_IMPULSE_CN")
    spreads = _fetch_series(db, "BAMLH0A0HYM2")
    
    t_dt = pd.to_datetime(target_date)
    credit_us = credit_us[credit_us.index <= t_dt]
    credit_cn = credit_cn[credit_cn.index <= t_dt]
    spreads = spreads[spreads.index <= t_dt]
    
    ci_us = float(credit_us.iloc[-1]) if not credit_us.empty else 1.2
    ci_cn = float(credit_cn.iloc[-1]) if not credit_cn.empty else 2.5
    spr_val = float(spreads.iloc[-1]) if not spreads.empty else 4.2
    
    # Lower spread, higher impulse -> better transmission
    spread_factor = _normalize(8.0 - spr_val, 0.0, 6.0)
    impulse_factor = _normalize(ci_us + ci_cn, -5.0, 10.0)
    
    score = 0.4 * spread_factor + 0.6 * impulse_factor
    score = round(max(0.0, min(100.0, score)), 1)
    
    if score >= 80: status = "Transmitting strongly"
    elif score >= 60: status = "Transmitting slowly"
    elif score >= 40: status = "Blocked transmission"
    elif score >= 20: status = "Credit contraction"
    else: status = "Stress transmission"
    
    return {
        "score": score,
        "status": status,
        "details": f"US Credit Impulse is {ci_us:.2f}%, China Credit Impulse is {ci_cn:.2f}%, and BofA HY Spread is {spr_val:.2f}%."
    }

def calculate_asset_confirmation_score(db: Session, target_date: date) -> dict:
    spy_flow = _fetch_series(db, "SPY_FLOW")
    vix = _fetch_series(db, "VIX")
    
    t_dt = pd.to_datetime(target_date)
    spy_flow = spy_flow[spy_flow.index <= t_dt]
    vix = vix[vix.index <= t_dt]
    
    flow_val = float(spy_flow.rolling(12).mean().iloc[-1]) if len(spy_flow) >= 12 else 100.0
    vix_val = float(vix.iloc[-1]) if not vix.empty else 16.0
    
    vix_score = _normalize(30 - vix_val, 0, 20)
    flow_score = _normalize(flow_val, -200, 500)
    
    score = 0.5 * vix_score + 0.5 * flow_score
    score = round(max(0.0, min(100.0, score)), 1)
    
    if score >= 80: status = "Confirmed bull"
    elif score >= 60: status = "Early accumulation"
    elif score >= 40: status = "Weak confirmation"
    elif score >= 20: status = "Divergence"
    else: status = "Breakdown"
    
    return {
        "score": score,
        "status": status,
        "details": f"Net fund flow proxy average is {flow_val:.1f}M. Volatility index (VIX) stands at {vix_val:.2f}."
    }

def calculate_euphoria_distribution_score(db: Session, target_date: date) -> dict:
    vix = _fetch_series(db, "VIX")
    small_cap = _fetch_series(db, "MF_SMALL_CAP_FLOW")
    
    t_dt = pd.to_datetime(target_date)
    vix = vix[vix.index <= t_dt]
    small_cap = small_cap[small_cap.index <= t_dt]
    
    vix_val = float(vix.iloc[-1]) if not vix.empty else 16.0
    sm_val = float(small_cap.iloc[-1]) if not small_cap.empty else 800.0
    
    # Highly suppressed VIX (< 12) + high speculative flows -> Euphoria
    vix_factor = _normalize(20 - vix_val, 0, 10)
    sm_factor = _normalize(sm_val, 200, 3000)
    
    score = 0.5 * vix_factor + 0.5 * sm_factor
    score = round(max(0.0, min(100.0, score)), 1)
    
    if score >= 85: status = "Bubble risk"
    elif score >= 70: status = "Euphoria warning"
    elif score >= 55: status = "Distribution started"
    elif score >= 40: status = "Smart money exit"
    elif score >= 25: status = "Extended bull"
    else: status = "Healthy bull"
    
    return {
        "score": score,
        "status": status,
        "details": f"Speculative small cap flow stands at {sm_val:.1f}Cr. Suppressed volatility indicates retail options chase."
    }

def calculate_liquidity_drain_score(db: Session, target_date: date) -> dict:
    dxy = _fetch_series(db, "DXY")
    swap_line = _fetch_series(db, "FED_SWAP_LINE")
    
    t_dt = pd.to_datetime(target_date)
    dxy = dxy[dxy.index <= t_dt]
    swap_line = swap_line[swap_line.index <= t_dt]
    
    dxy_val = float(dxy.iloc[-1]) if not dxy.empty else 101.5
    swap_val = float(swap_line.iloc[-1]) if not swap_line.empty else 0.0
    
    dxy_factor = _normalize(dxy_val - 95.0, 0, 10)
    swap_factor = _normalize(swap_val, 0, 300)
    
    score = 0.5 * dxy_factor + 0.5 * swap_factor
    score = round(max(0.0, min(100.0, score)), 1)
    
    if score >= 80: status = "Forced deleveraging"
    elif score >= 65: status = "Stress outflow"
    elif score >= 50: status = "Liquidity sucking"
    elif score >= 30: status = "Active drain"
    else: status = "Mild drain"
    
    return {
        "score": score,
        "status": status,
        "details": f"USD strength (DXY) is {dxy_val:.2f}. Fed swap line usage stands at {swap_val:.2f}B."
    }

# 2. Asset-Specific Bull Models
def get_equity_bull_model(db: Session, country: str, target_date: date) -> dict:
    # Fetch Master Scores
    cr = calculate_liquidity_creation_score(db, target_date)["score"]
    tr = calculate_liquidity_transmission_score(db, target_date)["score"]
    co = calculate_asset_confirmation_score(db, target_date)["score"]
    eu = calculate_euphoria_distribution_score(db, target_date)["score"]
    
    # Combined score
    score = 0.3 * cr + 0.4 * tr + 0.3 * co
    
    if score >= 80:
        if eu >= 70: status = "Exhaustion"
        else: status = "Confirmed Bull"
    elif score >= 60:
        if eu >= 55: status = "Distribution"
        else: status = "Extended Bull"
    elif score >= 45:
        status = "Early Bull"
    else:
        status = "Breakdown"
        
    return {
        "score": round(score, 1),
        "status": status,
        "confidence": 85.0
    }

def get_bond_bull_model(db: Session, target_date: date) -> dict:
    real_yield = _fetch_series(db, "DFII10")
    t_dt = pd.to_datetime(target_date)
    real_yield = real_yield[real_yield.index <= t_dt]
    ry = float(real_yield.iloc[-1]) if not real_yield.empty else 1.2
    
    # High real yields -> duration risk, falling real yields -> bond bull
    score = _normalize(3.0 - ry, 0.0, 4.0)
    
    if score >= 75: status = "Bond bull"
    elif score >= 50: status = "Neutral"
    elif score >= 30: status = "Duration risk"
    else: status = "Bear steepening stress"
    
    return {
        "score": round(score, 1),
        "status": status,
        "confidence": 80.0
    }

def get_gold_bull_model(db: Session, target_date: date) -> dict:
    real_yield = _fetch_series(db, "DFII10")
    dxy = _fetch_series(db, "DXY")
    
    t_dt = pd.to_datetime(target_date)
    real_yield = real_yield[real_yield.index <= t_dt]
    dxy = dxy[dxy.index <= t_dt]
    
    ry = float(real_yield.iloc[-1]) if not real_yield.empty else 1.2
    dxy_val = float(dxy.iloc[-1]) if not dxy.empty else 101.5
    
    # Inverted real yields + DXY weakness -> Gold bull
    ry_factor = _normalize(2.5 - ry, 0.0, 3.5)
    dxy_factor = _normalize(106.0 - dxy_val, 0, 12)
    
    score = 0.5 * ry_factor + 0.5 * dxy_factor
    score = round(max(0.0, min(100.0, score)), 1)
    
    if score >= 75: status = "Gold bull confirmed"
    elif score >= 55: status = "Defensive gold bid"
    elif score >= 35: status = "Neutral"
    else: status = "Gold risk-off failure"
    
    return {
        "score": score,
        "status": status,
        "confidence": 88.0
    }

def get_commodity_bull_model(db: Session, target_date: date) -> dict:
    # China credit impulse is key for commodity demand
    credit_cn = _fetch_series(db, "CREDIT_IMPULSE_CN")
    t_dt = pd.to_datetime(target_date)
    credit_cn = credit_cn[credit_cn.index <= t_dt]
    ci_cn = float(credit_cn.iloc[-1]) if not credit_cn.empty else 2.5
    
    score = _normalize(ci_cn, -5.0, 8.0)
    
    if score >= 75: status = "Commodity bull"
    elif score >= 55: status = "Early cyclical recovery"
    elif score >= 35: status = "Demand not confirmed"
    else: status = "Commodity breakdown"
    
    return {
        "score": round(score, 1),
        "status": status,
        "confidence": 82.0
    }

def get_india_equity_bull_model(db: Session, target_date: date) -> dict:
    fpi = _fetch_series(db, "FPI_EQ_FLOW")
    dii = _fetch_series(db, "DII_FLOW")
    sip = _fetch_series(db, "SIP_INFLOW")
    
    t_dt = pd.to_datetime(target_date)
    fpi = fpi[fpi.index <= t_dt]
    dii = dii[dii.index <= t_dt]
    sip = sip[sip.index <= t_dt]
    
    fpi_val = float(fpi.rolling(5).mean().iloc[-1]) if len(fpi) >= 5 else 0.0
    dii_val = float(dii.rolling(5).mean().iloc[-1]) if len(dii) >= 5 else 800.0
    sip_val = float(sip.iloc[-1]) if not sip.empty else 15000.0
    
    fpi_factor = _normalize(fpi_val, -1500, 1500)
    dii_factor = _normalize(dii_val, 0, 2000)
    sip_factor = _normalize(sip_val, 5000, 25000)
    
    score = 0.3 * fpi_factor + 0.3 * dii_factor + 0.4 * sip_factor
    score = round(max(0.0, min(100.0, score)), 1)
    
    if score >= 80: status = "India confirmed bull"
    elif score >= 65: status = "Domestic flow support"
    elif score >= 50: status = "India early bull"
    elif score >= 35: status = "FPI pressure"
    else: status = "Liquidity drain"
    
    return {
        "score": score,
        "status": status,
        "confidence": 87.0
    }
