import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text
import pandas as pd
import numpy as np

def detect_market_regime(db: Session, target_date: datetime.date) -> dict:
    """
    Detects market regime for Indian equities on target_date based on:
    - % of stocks above 200-day moving average (Breadth)
    - 30-day Market Momentum
    - Volatility / Downside Risk
    """
    # 1. Fetch price dates up to target_date
    date_str = target_date.strftime("%Y-%m-%d")
    
    # Calculate % of stocks close > 200 DMA
    query_breadth = text("""
        SELECT 
            COUNT(CASE WHEN ap.close > dma.avg_200 THEN 1 END) * 100.0 / COUNT(*) as pct_above_200dma,
            AVG((ap.close - dma.avg_200) / dma.avg_200) * 100.0 as avg_dist_200dma,
            COUNT(*) as total_stocks
        FROM adjusted_prices ap
        JOIN (
            SELECT stock_id, AVG(close) as avg_200
            FROM (
                SELECT stock_id, close, ROW_NUMBER() OVER (PARTITION BY stock_id ORDER BY date DESC) as rn
                FROM adjusted_prices
                WHERE date <= :target_date
            ) sub
            WHERE rn <= 200
            GROUP BY stock_id
            HAVING COUNT(*) >= 50
        ) dma ON dma.stock_id = ap.stock_id
        WHERE ap.date = :target_date
    """)
    
    res = db.execute(query_breadth, {"target_date": target_date}).fetchone()
    
    pct_above_200dma = float(res[0]) if res and res[0] is not None else 50.0
    avg_dist_200dma = float(res[1]) if res and res[1] is not None else 0.0
    
    # Classify Regime
    if pct_above_200dma >= 60.0:
        regime = "BULL_TREND"
        description = "Strong market breadth. Risk-on environment favoring Momentum and Growth factors."
        adaptive_weights = {
            "quality": 0.20,
            "growth": 0.30,
            "value": 0.10,
            "momentum": 0.30,
            "risk": 0.10
        }
    elif pct_above_200dma <= 35.0:
        regime = "STRESS_BEAR"
        description = "Market under severe stress / downside correction. Defensive mode favoring Quality & Low Risk."
        adaptive_weights = {
            "quality": 0.40,
            "growth": 0.10,
            "value": 0.20,
            "momentum": 0.05,
            "risk": 0.25
        }
    elif avg_dist_200dma > 0 and pct_above_200dma < 50.0:
        regime = "VALUE_RECOVERY"
        description = "Market recovering from oversold conditions. High alpha potential in Deep Value & Financial Health."
        adaptive_weights = {
            "quality": 0.25,
            "growth": 0.15,
            "value": 0.35,
            "momentum": 0.10,
            "risk": 0.15
        }
    else:
        regime = "NEUTRAL_BALANCED"
        description = "Balanced market conditions. Standard multi-factor weighting applies."
        adaptive_weights = {
            "quality": 0.30,
            "growth": 0.25,
            "value": 0.15,
            "momentum": 0.20,
            "risk": 0.10
        }
        
    return {
        "date": date_str,
        "regime": regime,
        "description": description,
        "pct_above_200dma": round(pct_above_200dma, 2),
        "avg_dist_200dma_pct": round(avg_dist_200dma, 2),
        "adaptive_weights": adaptive_weights
    }
