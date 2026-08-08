from typing import Dict, Any

def classify_macro_regime(fed_rate: float, us_credit_impulse: float, dxy_score: float) -> Dict[str, Any]:
    """
    Classifies the current global macro regime and provides dynamic indicator weight adjustments.
    Regimes:
    1. Goldilocks Reflation (Rate cuts + Positive credit impulse)
    2. Severe Tightening / QT (High rates + Negative credit impulse + Strong USD)
    3. Post-Hike Stabilization / Pause (Stable rates + Flattening credit impulse)
    4. Emerging Market Outperformance (DXY weakening + EM credit expansion)
    """
    if fed_rate > 4.5 and us_credit_impulse < 0:
        regime_name = "Severe Tightening & Deficit Drag"
        risk_level = "High"
        favored_assets = ["Gold", "USD Cash", "Short Bonds"]
        factor_weights = {
            "liquidity_creation": 0.35,
            "credit_transmission": 0.25,
            "dollar_liquidity": 0.20,
            "carry_trade": 0.20
        }
    elif us_credit_impulse > 1.0 and fed_rate < 3.5:
        regime_name = "Goldilocks Reflation"
        risk_level = "Low"
        favored_assets = ["US Tech / AI", "India Nifty 50", "Emerging Equities"]
        factor_weights = {
            "liquidity_creation": 0.40,
            "credit_transmission": 0.30,
            "dollar_liquidity": 0.15,
            "carry_trade": 0.15
        }
    elif dxy_score < 45.0:
        regime_name = "Emerging Market & Commodities Expansion"
        risk_level = "Moderate"
        favored_assets = ["India Nifty 50", "Gold Reserves", "Copper & Metals"]
        factor_weights = {
            "liquidity_creation": 0.30,
            "credit_transmission": 0.35,
            "dollar_liquidity": 0.15,
            "carry_trade": 0.20
        }
    else:
        regime_name = "Post-Hike Stabilization / Late Cycle"
        risk_level = "Moderate"
        favored_assets = ["India Nifty 50", "US Mega-Cap Tech", "Gold"]
        factor_weights = {
            "liquidity_creation": 0.30,
            "credit_transmission": 0.30,
            "dollar_liquidity": 0.20,
            "carry_trade": 0.20
        }
        
    return {
        "regime_name": regime_name,
        "risk_level": risk_level,
        "favored_assets": favored_assets,
        "factor_weights": factor_weights
    }
