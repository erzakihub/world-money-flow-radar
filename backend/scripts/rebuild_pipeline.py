#!/usr/bin/env python3
import os
import sys
import time
import datetime
import sqlite3

# Ensure parent backend directory is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.services.factor_engine import rebuild_factors_for_date
from sqlalchemy import text

DB_PATH = "/Users/zakiahmad/Documents/Antigravity/backend/quant_intelligence.db"

def run_interpolation():
    print("\n--- STEP 1: Running Quarterly Interpolation ---")
    import interpolate_quarters
    interpolate_quarters.main()

def run_ratio_calculation():
    print("\n--- STEP 2: Running Ratio Calculation ---")
    # Execute the ratio calculation script
    script_path = "/Users/zakiahmad/.gemini/antigravity/brain/83afd886-d2df-404b-bff1-cca9ac6d7e1f/scratch/compute_real_ratios.py"
    if os.path.exists(script_path):
        os.system(f"PYTHONPATH=. venv/bin/python {script_path}")
    else:
        print(f"Error: compute_real_ratios.py not found at {script_path}")

def rebuild_factor_rankings():
    print("\n--- STEP 3: Rebuilding Factor Rankings ---")
    db_session = SessionLocal()
    try:
        db_session.execute(text("PRAGMA synchronous = OFF;"))
        db_session.execute(text("PRAGMA journal_mode = MEMORY;"))
        
        # Load unique dates
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("SELECT DISTINCT date FROM adjusted_prices ORDER BY date ASC")
        dates = [datetime.datetime.strptime(row[0], "%Y-%m-%d").date() for row in c.fetchall()]
        conn.close()
        
        print(f"Rebuilding factor scores for {len(dates)} dates...")
        start_time = time.time()
        for idx, dt in enumerate(dates):
            if idx % 100 == 0:
                elapsed = time.time() - start_time
                print(f"Progress: {idx}/{len(dates)} dates... (Elapsed: {elapsed:.1f}s)")
            rebuild_factors_for_date(db_session, dt)
        print("Factor scoring successfully updated!")
    finally:
        db_session.close()

def main():
    print("=" * 60)
    print("STARTING FULL INGESTION & REBUILD PIPELINE")
    print("=" * 60)
    
    run_interpolation()
    run_ratio_calculation()
    rebuild_factor_rankings()
    
    print("\n" + "=" * 60)
    print("PIPELINE COMPLETE - READY FOR BACKTESTS")
    print("=" * 60)

if __name__ == "__main__":
    main()
