import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from ..models import Instrument, Price
import math

def calculate_rrg(db: Session, symbols: list, benchmark_symbol: str, trail_length: int = 15):
    # Fetch benchmark prices
    bench = db.query(Instrument).filter(Instrument.symbol == benchmark_symbol).first()
    if not bench:
        return {}
    
    bench_prices = db.query(Price).filter(Price.instrument_id == bench.id).order_by(Price.date).all()
    if not bench_prices:
        return {}
    
    bench_df = pd.DataFrame([{"date": p.date, "bench_close": p.close} for p in bench_prices])
    bench_df.set_index("date", inplace=True)
    bench_df.index = pd.to_datetime(bench_df.index)

    rrg_data = {}

    for sym in symbols:
        inst = db.query(Instrument).filter(Instrument.symbol == sym).first()
        if not inst:
            continue
        
        prices = db.query(Price).filter(Price.instrument_id == inst.id).order_by(Price.date).all()
        if not prices:
            continue
        
        inst_df = pd.DataFrame([{"date": p.date, "close": p.close} for p in prices])
        inst_df.set_index("date", inplace=True)
        inst_df.index = pd.to_datetime(inst_df.index)
        
        # Merge with benchmark
        merged = inst_df.join(bench_df, how="inner")
        if merged.empty or len(merged) < 60:
            continue
        
        # 1. Compute RS-Ratio: Asset / Benchmark
        merged["rs_raw"] = merged["close"] / merged["bench_close"]
        
        # Smooth the raw RS with rolling average (typically 14-period SMA or EMA)
        merged["rs_ratio"] = merged["rs_raw"].rolling(window=14).mean()
        
        # 2. Compute RS-Momentum: Rate of change of RS-Ratio (e.g. 14-day percent change + offset)
        # We can use the difference or rate of change over a 14-day window
        merged["rs_mom"] = merged["rs_ratio"].pct_change(14)
        
        # 3. Normalize to a 100-centered index using rolling z-scores
        # Normalization lookback (typically 60-120 days)
        lookback = 100
        
        mean_ratio = merged["rs_ratio"].rolling(window=lookback).mean()
        std_ratio = merged["rs_ratio"].rolling(window=lookback).std()
        std_ratio = std_ratio.replace(0, 1e-6)
        
        mean_mom = merged["rs_mom"].rolling(window=lookback).mean()
        std_mom = merged["rs_mom"].rolling(window=lookback).std()
        std_mom = std_mom.replace(0, 1e-6)
        
        # Center around 100. Scale by adding 100 and multiplying z-score by a scaling factor (e.g., 1 or 2)
        merged["x"] = 100 + ((merged["rs_ratio"] - mean_ratio) / std_ratio) * 1.5
        merged["y"] = 100 + ((merged["rs_mom"] - mean_mom) / std_mom) * 1.5
        
        merged.dropna(subset=["x", "y"], inplace=True)
        if merged.empty:
            continue
            
        # Get the trail of coordinates
        trail_df = merged.tail(trail_length)
        trail_points = []
        for idx, row in trail_df.iterrows():
            x_val = float(row["x"])
            y_val = float(row["y"])
            
            # Quadrant calculation
            if x_val >= 100 and y_val >= 100:
                quad = "Leading"
            elif x_val >= 100 and y_val < 100:
                quad = "Weakening"
            elif x_val < 100 and y_val < 100:
                quad = "Lagging"
            else:
                quad = "Improving"
                
            # Angle: from (100, 100) center
            dx = x_val - 100
            dy = y_val - 100
            angle_rad = math.atan2(dy, dx)
            angle_deg = math.degrees(angle_rad)
            if angle_deg < 0:
                angle_deg += 360
                
            # Distance from center
            dist = math.sqrt(dx**2 + dy**2)
            
            trail_points.append({
                "date": idx.strftime('%Y-%m-%d'),
                "x": round(x_val, 2),
                "y": round(y_val, 2),
                "quadrant": quad,
                "angle": round(angle_deg, 1),
                "distance": round(dist, 2),
            })
            
        # Speed: change in position vs previous day (last point speed)
        speed = 0.0
        if len(trail_points) > 1:
            last = trail_points[-1]
            prev = trail_points[-2]
            speed = math.sqrt((last["x"] - prev["x"])**2 + (last["y"] - prev["y"])**2)
            
        # Persistence score: how many days in the same quadrant consecutively
        persistence = 1
        current_quad = trail_points[-1]["quadrant"]
        # check backwards from end
        rev_trail = list(reversed(trail_points))
        for p in rev_trail[1:]:
            if p["quadrant"] == current_quad:
                persistence += 1
            else:
                break
                
        rrg_data[sym] = {
            "symbol": sym,
            "name": inst.name,
            "current_quadrant": current_quad,
            "angle": trail_points[-1]["angle"],
            "distance": trail_points[-1]["distance"],
            "speed": round(speed, 2),
            "persistence": persistence,
            "trail": trail_points
        }
        
    return rrg_data
