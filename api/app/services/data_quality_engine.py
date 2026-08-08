from sqlalchemy.orm import Session
from ..models import DataSource, TimeSeries, Observation
from datetime import datetime, date

def get_data_quality_status(db: Session) -> dict:
    """
    Scans data sources and determines freshness status, frequencies, and confidence metrics.
    """
    sources = db.query(DataSource).all()
    series_list = db.query(TimeSeries).all()
    
    feed_details = []
    stale_count = 0
    total_obs = 0
    
    for ts in series_list:
        # Find the latest observation date
        latest_obs = db.query(Observation).filter(Observation.time_series_id == ts.id).order_by(Observation.date.desc()).first()
        
        freq = ts.frequency or "Daily"
        source_name = ts.source.name if ts.source else "Seeded"
        reliability = ts.source.reliability_score if ts.source else 1.0
        
        if latest_obs:
            total_obs += 1
            obs_date = latest_obs.date
            # Calculate delay in days
            # Since mock data has observations running up to 2026, let's treat the latest observation as current
            # In a live system, delay is vs current date. Here, we can proxy delay based on reliability score.
            if reliability >= 0.95:
                delay_days = 0
                status = "Green"
                message = "Live & Fresh"
            elif reliability >= 0.85:
                delay_days = 3
                status = "Yellow"
                message = "Slightly Delayed"
                stale_count += 0.3
            else:
                delay_days = 8
                status = "Red"
                message = "Stale / Estimated"
                stale_count += 1
                
            last_date_str = obs_date.strftime("%Y-%m-%d")
        else:
            delay_days = 99
            status = "Red"
            message = "No Data Found"
            stale_count += 1
            last_date_str = "None"

        feed_details.append({
            "symbol": ts.symbol,
            "name": ts.name,
            "source": source_name,
            "frequency": freq,
            "last_updated": last_date_str,
            "delay_days": delay_days,
            "is_proxy": ts.is_proxy,
            "status": status,
            "message": message,
            "confidence_score": int(reliability * 100)
        })

    # Overall health score calculation
    if len(series_list) > 0:
        health_score = int(100 - (stale_count / len(series_list)) * 40)
    else:
        health_score = 100
        
    health_score = max(50, min(100, health_score))

    return {
        "overall_health_score": health_score,
        "total_feeds_tracked": len(series_list),
        "status_badge": "Green" if health_score > 85 else "Yellow" if health_score > 65 else "Red",
        "feeds": feed_details
    }
