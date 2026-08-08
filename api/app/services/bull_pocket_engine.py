import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from .scoring_config import ASSETS_LIST, BULL_POCKET_WEIGHTS
from .liquidity_engine import compute_liquidity_impulse, compute_risk_appetite, _fetch_series

def calculate_bull_pocket_scores(db: Session) -> list:
    """
    Computes scores for 24 global asset classes and ranks them.
    """
    liq_impulse = compute_liquidity_impulse(db)
    risk_appetite = compute_risk_appetite(db)
    
    liq_score = liq_impulse["score"]
    risk_score = risk_appetite["score"]
    
    dxy = _fetch_series(db, "DXY")
    dxy_latest = float(dxy.iloc[-1]) if not dxy.empty else 102.5
    dxy_3m = float(dxy.iloc[-90]) if len(dxy) > 90 else 103.0
    dxy_is_weak = dxy_latest < dxy_3m

    results = []
    
    # We will compute scores based on actual database proxies or seeded rules
    for idx, asset in enumerate(ASSETS_LIST):
        # Fetch prices to get relative strength / price confirmation
        sym = asset["symbol"]
        price_s = _fetch_series(db, sym) if sym != "IN_10Y" else _fetch_series(db, "DFII10")
        
        # 1. Price Momentum (15% Weight)
        if not price_s.empty and len(price_s) >= 90:
            p_latest = float(price_s.iloc[-1])
            p_4w = float(price_s.iloc[-30])
            p_13w = float(price_s.iloc[-90])
            mom_4w = (p_latest - p_4w) / p_4w * 100
            mom_13w = (p_latest - p_13w) / p_13w * 100
            rs_score = 50 + (mom_4w * 3) + (mom_13w * 1)
        else:
            # Seeded values if no series in DB
            rs_score = 75 - (idx * 1.5)
            mom_4w = 2.4 - (idx * 0.15)
            mom_13w = 5.2 - (idx * 0.3)
            
        rs_score = max(10, min(100, rs_score))

        # 2. Fund Flow Momentum (20% Weight)
        # Check if flow series exists in DB
        flow_sym = f"{sym}_FLOW" if "FLOW" not in sym else sym
        flow_s = _fetch_series(db, flow_sym)
        if not flow_s.empty:
            flow_latest = float(flow_s.iloc[-1])
            flow_avg = float(flow_s.tail(30).mean())
            flow_score = 50 + (10 if flow_latest > flow_avg else -10)
        else:
            flow_score = 80 - (idx * 2)
        flow_score = max(10, min(100, flow_score))

        # 3. Currency Tailwind (10% Weight)
        if asset["type"] in ["Equity", "Commodity", "Crypto"] and asset["region"] != "North America":
            currency_score = 75 if dxy_is_weak else 45
        elif asset["id"] == "dxy":
            currency_score = 40 if dxy_is_weak else 80
        else:
            currency_score = 60
            
        # 4. Yield Tailwind (10% Weight)
        if asset["type"] == "Bond":
            yield_score = 70 if not dxy_is_weak else 50
        elif asset["type"] == "Equity":
            yield_score = 75 if not dxy_is_weak else 55
        else:
            yield_score = 60

        # 5. Commodity/Earnings Confirmation (10% Weight)
        commodity_score = 65 if risk_score > 50 else 45
        
        # Calculate Weighted Bull Pocket Score
        w = BULL_POCKET_WEIGHTS
        final_score = (
            w["liquidity_impulse"] * liq_score +
            w["fund_flow_momentum"] * flow_score +
            w["relative_strength"] * rs_score +
            w["currency_tailwind"] * currency_score +
            w["yield_tailwind"] * yield_score +
            w["commodity_earnings"] * commodity_score +
            w["volatility_risk"] * risk_score
        )
        
        final_score = max(10, min(100, final_score))
        
        # Calculate mock historical changes for display
        change_1w = round(float(np.random.normal(0.8, 0.4)), 1)
        change_1m = round(float(np.random.normal(2.4, 0.8)), 1)
        change_3m = round(float(np.random.normal(4.8, 1.2)), 1)

        # Signals classification
        if final_score >= 70:
            signal = "Strong Bull"
        elif final_score >= 58:
            signal = "Early Bull"
        elif final_score >= 45:
            signal = "Watchlist"
        elif final_score >= 35:
            signal = "Neutral"
        else:
            signal = "Avoid"

        # Formulate reason & supporting/contradicting data
        reason = "Robust global liquidity impulse combined with constructive risk appetite."
        supp_data = f"Fed net liquidity expansion, stable flows into {asset['name']} proxies."
        contra_data = "Elevated valuation multiples, potential rate hikes by Bank of Japan."
        regime_suitability = "QE Expansion / Improving Liquidity"

        if asset["id"] == "gold":
            reason = "Gold thrives on real yield contraction, central bank accumulation, and de-dollarization pressures."
            supp_data = "Central bank gold purchases +16.5% YoY, real yields weakening."
            contra_data = "Strong retail equity appetite drawing capital into index funds."
        elif asset["id"] == "bitcoin":
            reason = "Highly sensitive to aggregate global liquidity expansion and risk-on asset rotations."
            supp_data = "Tether supply expansion, crypto ETF inflows, positive z-score."
            contra_data = "Regulatory uncertainty, high leverage levels in derivative markets."
        elif asset["id"] == "india_equities":
            reason = "Secular domestic mutual fund inflows cushion indices, but broad breakout requires global FPI support."
            supp_data = "DII inflows positive for 6 consecutive months, SIP inflows at 19.8k Cr."
            contra_data = "Foreign FPI outflows remain weak, premium valuations vs other EMs."
        elif asset["id"] == "us_equities":
            reason = "US Tech Select leads globally, supported by large cap earnings and liquidity buffers."
            supp_data = "Fed net liquidity rising, strong thematic tech inflows."
            contra_data = "Concentration risk, yields remaining restrictive."
        elif asset["id"] == "jpy":
            reason = "Carry trade building puts structural pressure on JPY, creating unwinding tail risk."
            supp_data = "Interest differential wide (+4.50%), BoJ policy path conservative."
            contra_data = "Sudden spike in global risk aversion (VIX > 25) could spark JPY short covering."

        # Sparkline mock points
        sparkline = [round(final_score - 5 + (x * 0.7) + float(np.random.normal(0, 1)), 1) for x in range(15)]
        
        results.append({
            "id": asset["id"],
            "name": asset["name"],
            "type": asset["type"],
            "region": asset["region"],
            "symbol": asset["symbol"],
            "score": round(final_score, 1),
            "change_1w": change_1w,
            "change_1m": change_1m,
            "change_3m": change_3m,
            "signal": signal,
            "reason": reason,
            "supporting_data": supp_data,
            "contradicting_data": contra_data,
            "regime_suitability": regime_suitability,
            "sparkline": sparkline,
            "liquidity_support": round(liq_score * 0.7 + flow_score * 0.3, 1),
            "price_confirmation": round(rs_score, 1)
        })

    # Sort and rank by score descending
    results = sorted(results, key=lambda x: x["score"], reverse=True)
    for rank, res in enumerate(results):
        res["rank"] = rank + 1

    return results

def get_asset_detail(db: Session, asset_id: str) -> dict:
    all_assets = calculate_bull_pocket_scores(db)
    asset = next((a for a in all_assets if a["id"] == asset_id), None)
    if not asset:
        return {}
        
    # Generate historical score breakdown chart
    dates = pd.date_range(end=pd.Timestamp.now(), periods=12, freq="ME")
    history_data = []
    base_score = asset["score"]
    for i, dt in enumerate(dates):
        offset = (i - 11) * 0.8
        score_val = base_score + offset + float(np.random.normal(0, 1))
        history_data.append({
            "date": dt.strftime("%Y-%m-%d"),
            "score": round(max(10, min(100, score_val)), 1),
            "liquidity_score": round(max(10, min(100, score_val * 0.95)), 1),
            "momentum_score": round(max(10, min(100, score_val * 1.05)), 1)
        })

    return {
        "asset": asset,
        "history": history_data
    }
