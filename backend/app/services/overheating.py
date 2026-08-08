import numpy as np
from sqlalchemy.orm import Session
from ..models import Instrument, Price, FlowScore
import datetime

def calculate_overheating_metrics(db: Session):
    # Fetch all instruments
    instruments = db.query(Instrument).all()
    overheating_results = []

    for inst in instruments:
        # Fetch last 200 daily prices to calculate extensions and RSI
        prices = db.query(Price).filter(Price.instrument_id == inst.id).order_by(Price.date.desc()).limit(250).all()
        if not prices or len(prices) < 200:
            continue
        
        # Reverse to chronological order
        prices.reverse()
        closes = np.array([p.close for p in prices])
        volumes = np.array([p.volume for p in prices])
        
        latest_close = closes[-1]
        
        # 1. Price extension vs 200DMA
        dma200 = np.mean(closes[-200:])
        extension = (latest_close - dma200) / dma200 # e.g. 0.15 = 15% above 200DMA
        
        # 2. RSI (14 period)
        deltas = np.diff(closes)
        seed = deltas[:13]
        up = seed[seed >= 0].sum() / 14
        down = -seed[seed < 0].sum() / 14
        rs = up / down if down > 0 else 1
        rsi = 100 - 100 / (1 + rs)
        
        for d in deltas[13:]:
            if d > 0:
                upval = d
                downval = 0.0
            else:
                upval = 0.0
                downval = -d
            up = (up * 13 + upval) / 14
            down = (down * 13 + downval) / 14
            rs = up / down if down > 0 else 1
            rsi = 100 - 100 / (1 + rs)

        # 3. Volatility compression (Standard dev relative to mean over last 20 days vs 100 days)
        vol20 = np.std(closes[-20:]) / np.mean(closes[-20:])
        vol100 = np.std(closes[-100:]) / np.mean(closes[-100:])
        vol_comp = vol20 / vol100 if vol100 > 0 else 1.0

        # Simulate flow percentiles and retail spikes for mock consistency
        if inst.symbol in ["QQQ", "XLK", "CNXREALTY"]:
            flow_perc = 92.0
            retail_spike = 88.0
            valuation_perc = 85.0
            breadth_div = 0.15 # divergence
        elif inst.symbol in ["BTC-USD"]:
            flow_perc = 95.0
            retail_spike = 96.0
            valuation_perc = 90.0
            breadth_div = 0.20
        elif inst.symbol == "TLT":
            flow_perc = 20.0
            retail_spike = 15.0
            valuation_perc = 30.0
            breadth_div = 0.0
        else:
            flow_perc = 55.0
            retail_spike = 40.0
            valuation_perc = 50.0
            breadth_div = 0.02

        # 4. Overheating Score Formula
        # weights: flow_percentile * 0.25 + price_extension * 0.20 + valuation_percentile * 0.15 + RSI_extreme * 0.10 + breadth_divergence * 0.10 + volatility_compression * 0.10 + retail_flow_spike * 0.10
        # Scale price extension: 25% above 200DMA is a full 100 score
        ext_score = min(100.0, max(0.0, extension / 0.25 * 100))
        # Scale RSI: 70 is starting to overheat, 85 is bubble
        rsi_score = min(100.0, max(0.0, (rsi - 30) / 50 * 100))
        # Vol compression: lower vol relative to history means compression (score increases as vol_comp decreases)
        vol_score = min(100.0, max(0.0, (1.2 - vol_comp) / 0.8 * 100))
        
        overheating_score = (
            flow_perc * 0.25 + 
            ext_score * 0.20 + 
            valuation_perc * 0.15 + 
            rsi_score * 0.10 + 
            (breadth_div * 100) * 0.10 + 
            vol_score * 0.10 + 
            retail_spike * 0.10
        )
        
        overheating_score = round(min(100.0, max(0.0, overheating_score)), 1)
        
        if overheating_score >= 80:
            status = "Overheated"
            tag = "Avoid / Reduce"
        elif overheating_score >= 60:
            status = "Crowded"
            tag = "Caution / Hold"
        elif overheating_score >= 30:
            status = "Warming"
            tag = "Monitor"
        else:
            status = "Healthy"
            tag = "Accumulate"

        overheating_results.append({
            "symbol": inst.symbol,
            "name": inst.name,
            "asset_class": inst.asset_class,
            "country": inst.country,
            "rsi": round(float(rsi), 1),
            "extension": round(float(extension * 100), 1),
            "score": overheating_score,
            "status": status,
            "action_tag": tag
        })
        
    return sorted(overheating_results, key=lambda x: x["score"], reverse=True)
