import numpy as np
import pandas as pd
import json
from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta
from ..models import DerivedIndicator
import random

def get_historical_similarity_analysis(db: Session, asset_name: str) -> list:
    # Fetch latest derived indicators to construct "Today's Profile"
    latest_derived = db.query(DerivedIndicator).order_by(DerivedIndicator.date.desc()).limit(5).all()
    
    today_profile = {}
    for d in latest_derived:
        today_profile[d.indicator_type] = d.score
        
    # Defaults if DB is empty
    creation = today_profile.get("Creation", 65.0)
    transmission = today_profile.get("Transmission", 62.0)
    confirmation = today_profile.get("Confirmation", 58.0)
    euphoria = today_profile.get("Euphoria", 45.0)
    drain = today_profile.get("Drain", 30.0)
    
    # Target regimes to compare against
    regimes = [
        {
            "regime": "2003 Early Bull Recovery",
            "profile": {"Creation": 78.0, "Transmission": 75.0, "Confirmation": 65.0, "Euphoria": 35.0, "Drain": 20.0},
            "forward_3m": "+6.4%", "forward_6m": "+12.8%", "forward_12m": "+22.4%",
            "what_happened": "Credit impulse expanded sharply as Fed held rates at 1.0%, triggering a broad asset recovery.",
            "key_difference": "Today's interest rate floor is significantly higher (4.75% vs. 1.00% in 2003)."
        },
        {
            "regime": "2007 Late Euphoria",
            "profile": {"Creation": 42.0, "Transmission": 50.0, "Confirmation": 85.0, "Euphoria": 82.0, "Drain": 45.0},
            "forward_3m": "-2.1%", "forward_6m": "-8.4%", "forward_12m": "-38.2%",
            "what_happened": "Smart money exited as subprime cracks expanded. Breadth narrowed before a complete market rollover.",
            "key_difference": "Central banks today are backstopped by excess reserves, whereas 2007 faced structural interbank freeze."
        },
        {
            "regime": "2009 Liquidity Recovery",
            "profile": {"Creation": 92.0, "Transmission": 48.0, "Confirmation": 58.0, "Euphoria": 22.0, "Drain": 65.0},
            "forward_3m": "+15.2%", "forward_6m": "+24.8%", "forward_12m": "+38.4%",
            "what_happened": "QE1 balance sheet expansion created a massive cash cushion despite structural banking impairments.",
            "key_difference": "Real economy transmission is active today, whereas 2009 transmission remained deeply blocked."
        },
        {
            "regime": "2011 Euro Sovereign Stress",
            "profile": {"Creation": 55.0, "Transmission": 42.0, "Confirmation": 40.0, "Euphoria": 30.0, "Drain": 58.0},
            "forward_3m": "-4.8%", "forward_6m": "+2.1%", "forward_12m": "+10.8%",
            "what_happened": "Eurozone stress triggered safe-haven dollar inflows and compressed corporate yield spreads.",
            "key_difference": "US fiscal deficits are significantly larger today, supporting structural domestic demand."
        },
        {
            "regime": "2016 Reflation",
            "profile": {"Creation": 62.0, "Transmission": 68.0, "Confirmation": 64.0, "Euphoria": 42.0, "Drain": 28.0},
            "forward_3m": "+4.5%", "forward_6m": "+9.8%", "forward_12m": "+18.2%",
            "what_happened": "China credit impulse expansion combined with Fed pausing hikes stabilized global commodity markets.",
            "key_difference": "US dollar is stronger today due to higher terminal rate differentials."
        },
        {
            "regime": "2020 COVID Liquidity Boom",
            "profile": {"Creation": 98.0, "Transmission": 78.0, "Confirmation": 70.0, "Euphoria": 60.0, "Drain": 20.0},
            "forward_3m": "+22.5%", "forward_6m": "+36.2%", "forward_12m": "+52.0%",
            "what_happened": "Simultaneous fiscal transfers and asset purchases ($120B/m QE) created a historical speculative bubble.",
            "key_difference": "We are currently under steady balance sheet contraction (QT) rather than extreme injections."
        },
        {
            "regime": "2021 Euphoria Peak",
            "profile": {"Creation": 68.0, "Transmission": 82.0, "Confirmation": 90.0, "Euphoria": 88.0, "Drain": 25.0},
            "forward_3m": "+1.5%", "forward_6m": "-4.2%", "forward_12m": "-18.5%",
            "what_happened": "Retail options chase, record IPO listings, and margin debt peaked right before monetary tightening began.",
            "key_difference": "Speculative leverage inside retail crypto/tech is relatively more disciplined today."
        },
        {
            "regime": "2022 Liquidity Drain",
            "profile": {"Creation": 20.0, "Transmission": 35.0, "Confirmation": 32.0, "Euphoria": 30.0, "Drain": 85.0},
            "forward_3m": "-8.2%", "forward_6m": "-12.5%", "forward_12m": "-19.4%",
            "what_happened": "Fastest policy hikes in 40 years combined with shrinking M2 deflated valuation multiples.",
            "key_difference": "Rate hike cycles are complete today, with the Fed moving toward a neutral pause."
        },
        {
            "regime": "2023 Recovery & AI Focus",
            "profile": {"Creation": 52.0, "Transmission": 58.0, "Confirmation": 72.0, "Euphoria": 65.0, "Drain": 45.0},
            "forward_3m": "+6.2%", "forward_6m": "+11.5%", "forward_12m": "+20.8%",
            "what_happened": "Extremely narrow mega-cap index concentration masked underlying interest rate drag on small caps.",
            "key_difference": "Market breadth is slowly widening today into cyclicals and commodity sectors."
        }
    ]

    results = []
    
    # Calculate similarity score using Manhattan distance
    for r in regimes:
        dist = (
            abs(creation - r["profile"]["Creation"]) +
            abs(transmission - r["profile"]["Transmission"]) +
            abs(confirmation - r["profile"]["Confirmation"]) +
            abs(euphoria - r["profile"]["Euphoria"]) +
            abs(drain - r["profile"]["Drain"])
        )
        
        # Max distance is 500, scale to 0-100
        sim_score = max(0.0, min(100.0, 100.0 - (dist / 4.0)))
        
        # Find which indicators matched closest (difference <= 10)
        matched = []
        for ind, val in r["profile"].items():
            diff = abs(today_profile.get(ind, 50.0) - val)
            if diff <= 10.0:
                matched.append(ind)
                
        results.append({
            "regime_name": r["regime"],
            "similarity_score": round(sim_score, 1),
            "matched_indicators": matched,
            "what_happened": r["what_happened"],
            "forward_3m": r["forward_3m"],
            "forward_6m": r["forward_6m"],
            "forward_12m": r["forward_12m"],
            "key_difference": r["key_difference"]
        })
        
    # Sort by similarity score descending
    results.sort(key=lambda x: x["similarity_score"], reverse=True)
    return results
