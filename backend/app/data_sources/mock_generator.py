import os
import random
import json
from datetime import datetime, date, timedelta
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from ..models import DataSource, TimeSeries, Observation, Instrument, Price, FlowScore, BacktestResult, Alert, DerivedIndicator, HistoricalSimilarity
from ..database import engine, Base

def get_date_range(start_date: date, end_date: date):
    curr = start_date
    while curr <= end_date:
        yield curr
        curr += timedelta(days=1)

def generate_mock_data(db: Session):
    # Check if database is already seeded
    if db.query(DataSource).first() is not None:
        print("Database already seeded. Skipping seeder.")
        return

    print("Seeding database with high-fidelity historical data (2000-2026)...")

    # 1. Create Data Sources
    sources_data = [
        {"name": "FRED", "category": "Macro", "type": "API", "url": "https://api.stlouisfed.org", "frequency": "Daily", "reliability_score": 0.95, "notes": "US Macroeconomic and financial stress data"},
        {"name": "BIS", "category": "Macro", "type": "API", "url": "https://stats.bis.org", "frequency": "Monthly", "reliability_score": 0.98, "notes": "Global liquidity and credit data"},
        {"name": "Yahoo Finance", "category": "Exchange", "type": "API", "url": "https://finance.yahoo.com", "frequency": "Daily", "reliability_score": 0.90, "notes": "Asset prices, yields, and proxy flows"},
        {"name": "NSDL", "category": "Fund Flow", "type": "Scraped", "url": "https://www.fpi.nsdl.co.in", "frequency": "Daily", "reliability_score": 0.85, "notes": "India foreign portfolio flows"},
        {"name": "AMFI", "category": "Fund Flow", "type": "Manual Upload", "url": "https://www.amfiindia.com", "frequency": "Monthly", "reliability_score": 0.95, "notes": "Indian mutual fund industry category flows"},
        {"name": "ICI", "category": "Fund Flow", "type": "Weekly", "url": "https://www.ici.org", "frequency": "Weekly", "reliability_score": 0.90, "notes": "US mutual fund & MMF asset flows"},
        {"name": "IMF", "category": "Macro", "type": "API", "url": "https://data.imf.org", "frequency": "Quarterly", "reliability_score": 0.97, "notes": "COFER reserves composition, World Economic Outlook data"},
        {"name": "US_TREASURY", "category": "Macro", "type": "API", "url": "https://ticdata.treasury.gov", "frequency": "Monthly", "reliability_score": 0.96, "notes": "Treasury International Capital (TIC) cross-border flows"},
    ]
    sources = {}
    for src in sources_data:
        db_src = DataSource(**src)
        db.add(db_src)
        db.flush()
        sources[src["name"]] = db_src

    # 2. Create Instruments
    instruments_data = [
        {"symbol": "SPY", "name": "SPDR S&P 500 ETF Trust", "type": "ETF", "asset_class": "Equity", "region": "North America", "country": "US", "benchmark_symbol": "SPY"},
        {"symbol": "QQQ", "name": "Invesco QQQ Trust", "type": "ETF", "asset_class": "Equity", "region": "North America", "country": "US", "benchmark_symbol": "SPY"},
        {"symbol": "EEM", "name": "iShares MSCI Emerging Markets ETF", "type": "ETF", "asset_class": "Equity", "region": "Emerging Markets", "country": "Global EM", "benchmark_symbol": "VT"},
        {"symbol": "INDA", "name": "iShares MSCI India ETF", "type": "ETF", "asset_class": "Equity", "region": "Asia-Pacific", "country": "India", "benchmark_symbol": "EEM"},
        {"symbol": "GLD", "name": "SPDR Gold Shares", "type": "ETF", "asset_class": "Commodity", "region": "Global", "country": "Global", "benchmark_symbol": "SPY"},
        {"symbol": "BTC-USD", "name": "Bitcoin USD", "type": "Crypto", "asset_class": "Crypto", "region": "Global", "country": "Global", "benchmark_symbol": "SPY"},
        {"symbol": "TLT", "name": "iShares 20+ Year Treasury Bond ETF", "type": "ETF", "asset_class": "Bond", "region": "North America", "country": "US", "benchmark_symbol": "SPY"},
        {"symbol": "USDJPY=X", "name": "USD/JPY Exchange Rate", "type": "Index", "asset_class": "Currency", "region": "Asia-Pacific", "country": "Japan", "benchmark_symbol": "SPY"},

        # US Sectors
        {"symbol": "XLK", "name": "Technology Select Sector SPDR Fund", "type": "ETF", "asset_class": "Equity", "region": "North America", "country": "US", "sector": "Technology", "benchmark_symbol": "SPY"},
        {"symbol": "XLF", "name": "Financial Select Sector SPDR Fund", "type": "ETF", "asset_class": "Equity", "region": "North America", "country": "US", "sector": "Financials", "benchmark_symbol": "SPY"},
        {"symbol": "XLE", "name": "Energy Select Sector SPDR Fund", "type": "ETF", "asset_class": "Equity", "region": "North America", "country": "US", "sector": "Energy", "benchmark_symbol": "SPY"},
        {"symbol": "XLB", "name": "Materials Select Sector SPDR Fund", "type": "ETF", "asset_class": "Equity", "region": "North America", "country": "US", "sector": "Materials", "benchmark_symbol": "SPY"},
        {"symbol": "XLI", "name": "Industrials Select Sector SPDR Fund", "type": "ETF", "asset_class": "Equity", "region": "North America", "country": "US", "sector": "Industrials", "benchmark_symbol": "SPY"},
        {"symbol": "XLY", "name": "Consumer Discretionary Select Sector SPDR", "type": "ETF", "asset_class": "Equity", "region": "North America", "country": "US", "sector": "Consumer Discretionary", "benchmark_symbol": "SPY"},
        {"symbol": "XLP", "name": "Consumer Staples Select Sector SPDR Fund", "type": "ETF", "asset_class": "Equity", "region": "North America", "country": "US", "sector": "Consumer Staples", "benchmark_symbol": "SPY"},
        {"symbol": "XLU", "name": "Utilities Select Sector SPDR Fund", "type": "ETF", "asset_class": "Equity", "region": "North America", "country": "US", "sector": "Utilities", "benchmark_symbol": "SPY"},
        {"symbol": "XLV", "name": "Health Care Select Sector SPDR Fund", "type": "ETF", "asset_class": "Equity", "region": "North America", "country": "US", "sector": "Healthcare", "benchmark_symbol": "SPY"},
        {"symbol": "XLRE", "name": "Real Estate Select Sector SPDR Fund", "type": "ETF", "asset_class": "Equity", "region": "North America", "country": "US", "sector": "Real Estate", "benchmark_symbol": "SPY"},
        
        # India Sectors (Proxied by Nifty indices)
        {"symbol": "CNXBANK", "name": "Nifty Bank", "type": "Index", "asset_class": "Equity", "region": "Asia-Pacific", "country": "India", "sector": "Financials", "benchmark_symbol": "INDA"},
        {"symbol": "CNXIT", "name": "Nifty IT", "type": "Index", "asset_class": "Equity", "region": "Asia-Pacific", "country": "India", "sector": "Technology", "benchmark_symbol": "INDA"},
        {"symbol": "CNXAUTO", "name": "Nifty Auto", "type": "Index", "asset_class": "Equity", "region": "Asia-Pacific", "country": "India", "sector": "Auto", "benchmark_symbol": "INDA"},
        {"symbol": "CNXREALTY", "name": "Nifty Realty", "type": "Index", "asset_class": "Equity", "region": "Asia-Pacific", "country": "India", "sector": "Real Estate", "benchmark_symbol": "INDA"},
        {"symbol": "CNXMETAL", "name": "Nifty Metal", "type": "Index", "asset_class": "Equity", "region": "Asia-Pacific", "country": "India", "sector": "Metal", "benchmark_symbol": "INDA"},
        {"symbol": "CNXINFRA", "name": "Nifty Infra", "type": "Index", "asset_class": "Equity", "region": "Asia-Pacific", "country": "India", "sector": "Infra", "benchmark_symbol": "INDA"},
        {"symbol": "CNXENERGY", "name": "Nifty Energy", "type": "Index", "asset_class": "Equity", "region": "Asia-Pacific", "country": "India", "sector": "Energy", "benchmark_symbol": "INDA"},
        {"symbol": "CNXPHARMA", "name": "Nifty Pharma", "type": "Index", "asset_class": "Equity", "region": "Asia-Pacific", "country": "India", "sector": "Pharma", "benchmark_symbol": "INDA"},
    ]
    instruments = {}
    valid_keys = {c.key for c in Instrument.__table__.columns}
    for inst in instruments_data:
        filtered_inst = {k: v for k, v in inst.items() if k in valid_keys}
        db_inst = Instrument(**filtered_inst)
        db.add(db_inst)
        db.flush()
        instruments[inst["symbol"]] = db_inst

    # 3. Create Time-Series
    series_data = [
        # US FED Balance Sheet & Rates
        {"source_id": sources["FRED"].id, "symbol": "WALCL", "name": "Federal Reserve Assets", "category": "Global Liquidity", "unit": "USD Millions", "frequency": "Weekly"},
        {"source_id": sources["FRED"].id, "symbol": "TGA", "name": "US Treasury General Account", "category": "Global Liquidity", "unit": "USD Billions", "frequency": "Daily"},
        {"source_id": sources["FRED"].id, "symbol": "RRP", "name": "Fed Reverse Repo Outstanding", "category": "Global Liquidity", "unit": "USD Billions", "frequency": "Daily"},
        {"source_id": sources["FRED"].id, "symbol": "M2SL", "name": "US M2 Money Supply", "category": "Global Liquidity", "unit": "USD Billions", "frequency": "Monthly"},
        {"source_id": sources["FRED"].id, "symbol": "DXY", "name": "US Dollar Index", "category": "Global Liquidity", "unit": "Index", "frequency": "Daily"},
        {"source_id": sources["FRED"].id, "symbol": "VIX", "name": "CBOE Volatility Index", "category": "Global Liquidity", "unit": "Index", "frequency": "Daily"},
        {"source_id": sources["FRED"].id, "symbol": "DFII10", "name": "US 10-Year Real Interest Rate", "category": "Global Liquidity", "unit": "Percent", "frequency": "Daily"},
        {"source_id": sources["FRED"].id, "symbol": "BAMLH0A0HYM2", "name": "ICE BofA US High Yield Spread", "category": "Global Liquidity", "unit": "Percent", "frequency": "Daily"},
        {"source_id": sources["Yahoo Finance"].id, "symbol": "USDT_SUPPLY", "name": "Tether Stablecoin Supply", "category": "Global Liquidity", "unit": "USD Billions", "frequency": "Daily", "is_actual_flow": True},
        
        # Yen Carry Trade & Cash Surplus indicators
        {"source_id": sources["FRED"].id, "symbol": "FED_RATE", "name": "US Fed Funds Rate", "category": "Global Liquidity", "unit": "Percent", "frequency": "Daily"},
        {"source_id": sources["BIS"].id, "symbol": "BOJ_RATE", "name": "Bank of Japan Policy Rate", "category": "Global Liquidity", "unit": "Percent", "frequency": "Daily"},
        {"source_id": sources["Yahoo Finance"].id, "symbol": "YEN_CARRY_INDEX", "name": "Yen Carry Trade Arbitrage Score", "category": "Global Liquidity", "unit": "Score", "frequency": "Daily", "is_proxy": True},
        {"source_id": sources["BIS"].id, "symbol": "GLOBAL_SURPLUS_FLOW", "name": "Cash Surplus Reserves Flow (JP, CN, Gulf)", "category": "Global Liquidity", "unit": "USD Billions", "frequency": "Weekly", "is_actual_flow": True},

        # Flow data - Global ETFs
        {"source_id": sources["Yahoo Finance"].id, "symbol": "SPY_FLOW", "name": "S&P 500 ETF Net Inflow", "category": "Asset Flow", "unit": "USD Millions", "frequency": "Daily", "is_actual_flow": True, "asset_class": "Equity", "region": "North America"},
        {"source_id": sources["Yahoo Finance"].id, "symbol": "GLD_FLOW", "name": "Gold ETF Net Inflow", "category": "Asset Flow", "unit": "USD Millions", "frequency": "Daily", "is_actual_flow": True, "asset_class": "Commodity", "region": "Global"},
        {"source_id": sources["Yahoo Finance"].id, "symbol": "TLT_FLOW", "name": "TLT Bond ETF Net Inflow", "category": "Asset Flow", "unit": "USD Millions", "frequency": "Daily", "is_actual_flow": True, "asset_class": "Bond", "region": "North America"},
        {"source_id": sources["Yahoo Finance"].id, "symbol": "INDA_FLOW", "name": "India ETF Net Inflow", "category": "Region Flow", "unit": "USD Millions", "frequency": "Daily", "is_actual_flow": True, "asset_class": "Equity", "region": "Asia-Pacific"},
        
        # India Flows
        {"source_id": sources["NSDL"].id, "symbol": "FPI_EQ_FLOW", "name": "FPI Net Equity Flow", "category": "Region Flow", "unit": "INR Crores", "frequency": "Daily", "is_actual_flow": True, "region": "Asia-Pacific"},
        {"source_id": sources["NSDL"].id, "symbol": "FPI_DEBT_FLOW", "name": "FPI Net Debt Flow", "category": "Region Flow", "unit": "INR Crores", "frequency": "Daily", "is_actual_flow": True, "region": "Asia-Pacific"},
        {"source_id": sources["NSDL"].id, "symbol": "DII_FLOW", "name": "DII Net Flow", "category": "Region Flow", "unit": "INR Crores", "frequency": "Daily", "is_actual_flow": True, "region": "Asia-Pacific"},
        {"source_id": sources["AMFI"].id, "symbol": "SIP_INFLOW", "name": "Monthly Mutual Fund SIP Inflow", "category": "Region Flow", "unit": "INR Crores", "frequency": "Monthly", "is_actual_flow": True, "region": "Asia-Pacific"},
        {"source_id": sources["AMFI"].id, "symbol": "MF_SMALL_CAP_FLOW", "name": "Mutual Fund Small-cap Flow", "category": "Region Flow", "unit": "INR Crores", "frequency": "Monthly", "is_actual_flow": True, "region": "Asia-Pacific"},

        # Central Bank Balance Sheets
        {"source_id": sources["BIS"].id, "symbol": "ECB_ASSETS", "name": "ECB Total Assets", "category": "Global Liquidity", "unit": "EUR Billions", "frequency": "Weekly"},
        {"source_id": sources["BIS"].id, "symbol": "BOJ_ASSETS", "name": "BoJ Total Assets", "category": "Global Liquidity", "unit": "JPY Trillions", "frequency": "Weekly"},
        {"source_id": sources["BIS"].id, "symbol": "PBOC_ASSETS", "name": "PBoC Total Assets", "category": "Global Liquidity", "unit": "CNY Trillions", "frequency": "Monthly"},
        {"source_id": sources["BIS"].id, "symbol": "BOE_ASSETS", "name": "BoE Total Assets", "category": "Global Liquidity", "unit": "GBP Billions", "frequency": "Weekly"},
        {"source_id": sources["BIS"].id, "symbol": "RBI_ASSETS", "name": "RBI Total Assets", "category": "Global Liquidity", "unit": "INR Trillions", "frequency": "Monthly"},
        {"source_id": sources["BIS"].id, "symbol": "SNB_ASSETS", "name": "SNB Total Assets", "category": "Global Liquidity", "unit": "CHF Billions", "frequency": "Monthly"},

        # Multi-Country M2
        {"source_id": sources["BIS"].id, "symbol": "M2_CN", "name": "China M2 Money Supply", "category": "Global Liquidity", "unit": "CNY Trillions", "frequency": "Monthly"},
        {"source_id": sources["BIS"].id, "symbol": "M2_EU", "name": "Eurozone M3", "category": "Global Liquidity", "unit": "EUR Trillions", "frequency": "Monthly"},
        {"source_id": sources["BIS"].id, "symbol": "M2_JP", "name": "Japan M2", "category": "Global Liquidity", "unit": "JPY Trillions", "frequency": "Monthly"},
        {"source_id": sources["BIS"].id, "symbol": "M2_IN", "name": "India M3", "category": "Global Liquidity", "unit": "INR Trillions", "frequency": "Monthly"},
        {"source_id": sources["BIS"].id, "symbol": "M2_UK", "name": "UK M4", "category": "Global Liquidity", "unit": "GBP Billions", "frequency": "Monthly"},

        # FX Reserves & Gold
        {"source_id": sources["IMF"].id, "symbol": "FX_RESERVES_CN", "name": "China FX Reserves", "category": "Global Liquidity", "unit": "USD Billions", "frequency": "Monthly"},
        {"source_id": sources["IMF"].id, "symbol": "FX_RESERVES_JP", "name": "Japan FX Reserves", "category": "Global Liquidity", "unit": "USD Billions", "frequency": "Monthly"},
        {"source_id": sources["IMF"].id, "symbol": "FX_RESERVES_IN", "name": "India FX Reserves", "category": "Global Liquidity", "unit": "USD Billions", "frequency": "Monthly"},
        {"source_id": sources["IMF"].id, "symbol": "FX_RESERVES_SA", "name": "Saudi Arabia FX Reserves", "category": "Global Liquidity", "unit": "USD Billions", "frequency": "Monthly"},
        {"source_id": sources["IMF"].id, "symbol": "FX_RESERVES_KR", "name": "South Korea FX Reserves", "category": "Global Liquidity", "unit": "USD Billions", "frequency": "Monthly"},
        {"source_id": sources["IMF"].id, "symbol": "GOLD_RESERVES_CN", "name": "China Gold Reserves", "category": "Global Liquidity", "unit": "Tonnes", "frequency": "Monthly"},
        {"source_id": sources["IMF"].id, "symbol": "GOLD_RESERVES_IN", "name": "India Gold Reserves", "category": "Global Liquidity", "unit": "Tonnes", "frequency": "Monthly"},
        {"source_id": sources["IMF"].id, "symbol": "GOLD_RESERVES_PL", "name": "Poland Gold Reserves", "category": "Global Liquidity", "unit": "Tonnes", "frequency": "Monthly"},

        # COFER Currency Composition
        {"source_id": sources["IMF"].id, "symbol": "COFER_USD_PCT", "name": "USD Share of Global Reserves", "category": "Global Liquidity", "unit": "Percent", "frequency": "Quarterly"},
        {"source_id": sources["IMF"].id, "symbol": "COFER_EUR_PCT", "name": "EUR Share of Global Reserves", "category": "Global Liquidity", "unit": "Percent", "frequency": "Quarterly"},
        {"source_id": sources["IMF"].id, "symbol": "COFER_CNY_PCT", "name": "CNY Share of Global Reserves", "category": "Global Liquidity", "unit": "Percent", "frequency": "Quarterly"},
        {"source_id": sources["IMF"].id, "symbol": "COFER_GOLD_PCT", "name": "Gold Share of Total Reserves", "category": "Global Liquidity", "unit": "Percent", "frequency": "Quarterly"},

        # TIC & Cross-Border
        {"source_id": sources["US_TREASURY"].id, "symbol": "TIC_JP_UST", "name": "Japan Holdings of US Treasuries", "category": "Global Liquidity", "unit": "USD Billions", "frequency": "Monthly"},
        {"source_id": sources["US_TREASURY"].id, "symbol": "TIC_CN_UST", "name": "China Holdings of US Treasuries", "category": "Global Liquidity", "unit": "USD Billions", "frequency": "Monthly"},
        {"source_id": sources["US_TREASURY"].id, "symbol": "TIC_TOTAL_FOREIGN", "name": "Total Foreign Holdings of US Treasuries", "category": "Global Liquidity", "unit": "USD Billions", "frequency": "Monthly"},

        # Credit Impulse
        {"source_id": sources["BIS"].id, "symbol": "CREDIT_IMPULSE_US", "name": "US Credit Impulse (% of GDP)", "category": "Global Liquidity", "unit": "Percent", "frequency": "Quarterly"},
        {"source_id": sources["BIS"].id, "symbol": "CREDIT_IMPULSE_CN", "name": "China Credit Impulse", "category": "Global Liquidity", "unit": "Percent", "frequency": "Quarterly"},
        {"source_id": sources["BIS"].id, "symbol": "CREDIT_IMPULSE_GLOBAL", "name": "Global Credit Impulse", "category": "Global Liquidity", "unit": "Percent", "frequency": "Quarterly"},

        # SWF AUM
        {"source_id": sources["IMF"].id, "symbol": "SWF_NBIM", "name": "Norway GPFG AUM", "category": "Global Liquidity", "unit": "USD Billions", "frequency": "Quarterly"},
        {"source_id": sources["IMF"].id, "symbol": "SWF_ADIA", "name": "ADIA AUM", "category": "Global Liquidity", "unit": "USD Billions", "frequency": "Quarterly"},
        {"source_id": sources["IMF"].id, "symbol": "SWF_PIF", "name": "Saudi PIF AUM", "category": "Global Liquidity", "unit": "USD Billions", "frequency": "Quarterly"},
        {"source_id": sources["IMF"].id, "symbol": "SWF_CIC", "name": "China CIC AUM", "category": "Global Liquidity", "unit": "USD Billions", "frequency": "Quarterly"},
        {"source_id": sources["IMF"].id, "symbol": "SWF_GIC", "name": "Singapore GIC AUM", "category": "Global Liquidity", "unit": "USD Billions", "frequency": "Quarterly"},

        # Swap Line & Eurodollar
        {"source_id": sources["FRED"].id, "symbol": "FED_SWAP_LINE", "name": "Fed Central Bank Swap Line Usage", "category": "Global Liquidity", "unit": "USD Billions", "frequency": "Weekly"},
        {"source_id": sources["FRED"].id, "symbol": "EURODOLLAR_SPREAD", "name": "Cross-currency Basis Swap USD/JPY 3M", "category": "Global Liquidity", "unit": "Basis Points", "frequency": "Daily"},
    ]
    tseries = {}
    for ts in series_data:
        db_ts = TimeSeries(**ts)
        db.add(db_ts)
        db.flush()
        tseries[ts["symbol"]] = db_ts

    # 4. Generate daily observations and prices (2000-01-01 to 2026-06-20)
    start_date = date(2000, 1, 1)
    end_date = date(2026, 6, 20)
    dates = list(get_date_range(start_date, end_date))
    n_days = len(dates)

    print(f"Generating data for {n_days} days...")

    # Build macro multi-cycle baseline trends (2000 to 2026)
    t = np.linspace(0, 1, n_days)
    
    # Define major cycles
    dotcom_crash = np.exp(-((t - 0.05) * 20)**2)   # 2001 Stress
    credit_boom = np.exp(-((t - 0.22) * 15)**2)    # 2005-2007 Bubble
    gfc_crash = np.exp(-((t - 0.33) * 25)**2)      # 2008 GFC Stress
    euro_crisis = np.exp(-((t - 0.44) * 20)**2)    # 2011-2012 Euro Sovereign Stress
    covid_bubble = np.exp(-((t - 0.77) * 35)**2)   # 2020 COVID QE Bubble
    qt_contraction = np.maximum(0, t - 0.84) * (1 - np.maximum(0, t - 0.92))  # 2022-2023 aggressive tightening
    ai_reflation = np.maximum(0, t - 0.92)         # 2024-2026 AI/Fiscal reflation

    # Fed Balance Sheet Cycle (Trillions)
    # WALCL: $0.6T (2000) -> $0.9T (2007) -> $2.2T (2009) -> $4.5T (2015) -> $8.9T peak (2022) -> $7.2T (2026)
    walcl_vals = (600 + 300 * t + 1300 * np.maximum(0, t - 0.32) + 2300 * np.maximum(0, t - 0.5) 
                  + 4400 * covid_bubble - 1700 * np.maximum(0, t - 0.85) + np.random.normal(0, 20, n_days)).tolist()

    # M2 Money Supply (US Billions)
    m2_vals = (4600 + 17000 * t + 2500 * covid_bubble - 800 * np.maximum(0, t - 0.85)).tolist()

    # Interest rates (Fed rate)
    fed_rates = (5.5 * np.exp(-((t - 0.08) * 15)**2) # dotcom cut
                 + 5.25 * np.exp(-((t - 0.25) * 18)**2) # housing bubble rates
                 + 0.25 # post-GFC zero bound
                 + 2.25 * np.exp(-((t - 0.72) * 20)**2) # 2018 hikes
                 + 5.25 * np.maximum(0, t - 0.85) * (1 - ai_reflation) # SVB/Inflation hikes
                 + 4.75 * ai_reflation).tolist()

    boj_rates = (0.25 * np.exp(-((t - 0.25) * 25)**2) - 0.10 * np.maximum(0, t - 0.6) * (1 - ai_reflation) + 0.25 * ai_reflation).tolist()

    # Exchange rate USDJPY
    usdjpy_base = 110.0 + 15 * np.sin(2 * np.pi * t * 4) + 35 * np.maximum(0, t - 0.85) + np.random.normal(0, 1.0, n_days)
    usdjpy_vals = usdjpy_base.tolist()

    carry_scores = [((fed_rates[i] - boj_rates[i]) * usdjpy_vals[i] / 8) for i in range(n_days)]

    # Reserves / Flows
    reserves_base = 2000 + 4000 * t + 800 * covid_bubble + np.random.normal(0, 40, n_days)
    reserves_vals = reserves_base.tolist()

    dxy_vals = (96.0 + 12.0 * np.sin(2 * np.pi * t * 3.5) + 10.0 * np.maximum(0, t - 0.85) + np.random.normal(0, 0.4, n_days)).tolist()
    vix_vals = (16.0 + 35.0 * dotcom_crash + 50.0 * gfc_crash + 25.0 * euro_crisis + 45.0 * covid_bubble + 5 * np.random.uniform(0, 1, n_days)).tolist()
    real_yield_vals = (1.5 - 2.5 * covid_bubble + 3.0 * np.maximum(0, t - 0.85) + np.random.normal(0, 0.05, n_days)).tolist()
    hy_spread_vals = (4.0 + 8.0 * gfc_crash + 3.0 * euro_crisis + 4.5 * covid_bubble + np.random.normal(0, 0.1, n_days)).tolist()
    stablecoin_vals = np.maximum(0.0, 120.0 * np.maximum(0, t - 0.7) * (1 - 0.15 * qt_contraction) + np.random.normal(0, 2.0, n_days)).tolist()

    # ECB assets (€ Billions)
    ecb_vals = (1200 + 2500 * t + 3500 * covid_bubble - 1500 * np.maximum(0, t - 0.85) + np.random.normal(0, 20, n_days))
    boj_asset_vals = (120 + 450 * t + 50 * np.sin(2 * np.pi * t * 2) + np.random.normal(0, 2, n_days))
    pboc_vals = (12 + 25 * t + np.random.normal(0, 0.2, n_days))
    boe_vals = (100 + 600 * t + 250 * covid_bubble - 120 * np.maximum(0, t - 0.85) + np.random.normal(0, 5, n_days))
    rbi_vals = (5 + 50 * t + np.random.normal(0, 0.3, n_days))
    snb_vals = (100 + 600 * t + 100 * covid_bubble - 80 * np.maximum(0, t - 0.85) + np.random.normal(0, 4, n_days))

    # Multi-country M2
    m2_cn_vals = (12 + 280 * t + np.random.normal(0, 1.0, n_days))
    m2_eu_vals = (5.0 + 10.0 * t + np.random.normal(0, 0.05, n_days))
    m2_jp_vals = (600 + 600 * t + np.random.normal(0, 4, n_days))
    m2_in_vals = (10 + 220 * t + np.random.normal(0, 1.0, n_days))
    m2_uk_vals = (600 + 2000 * t + np.random.normal(0, 8, n_days))

    # FX & Gold reserves
    fx_cn_vals = (150 + 3000 * np.minimum(t, 0.6) + 100 * np.sin(2 * np.pi * t) + np.random.normal(0, 5, n_days))
    fx_jp_vals = (300 + 900 * t - 100 * np.maximum(0, t - 0.85) + np.random.normal(0, 3, n_days))
    fx_in_vals = (38 + 580 * t + np.random.normal(0, 3, n_days))
    fx_sa_vals = (120 + 350 * t - 80 * np.maximum(0, t - 0.85) + np.random.normal(0, 2, n_days))
    fx_kr_vals = (90 + 320 * t + np.random.normal(0, 2, n_days))
    gold_cn_vals = (395 + 1800 * t + np.random.normal(0, 3, n_days))
    gold_in_vals = (357 + 500 * t + np.random.normal(0, 2, n_days))
    gold_pl_vals = (102 + 300 * t + np.random.normal(0, 1.5, n_days))

    # COFER share
    cofer_usd_vals = (70.0 - 14.0 * t + np.random.normal(0, 0.05, n_days))
    cofer_eur_vals = (18.0 + 2.0 * t + np.random.normal(0, 0.04, n_days))
    cofer_cny_vals = np.maximum(0.0, 3.0 * np.maximum(0, t - 0.6) + np.random.normal(0, 0.02, n_days))
    cofer_gold_vals = (8.0 + 8.5 * t + np.random.normal(0, 0.08, n_days))

    # TIC
    tic_jp_vals = (300 + 800 * t - 150 * np.maximum(0, t - 0.85) + np.random.normal(0, 4, n_days))
    tic_cn_vals = (100 + 1000 * np.minimum(t, 0.5) - 300 * np.maximum(0, t - 0.6) + np.random.normal(0, 5, n_days))
    tic_total_vals = (1200 + 6800 * t + np.random.normal(0, 15, n_days))

    # Credit Impulse
    credit_us_vals = (0.5 + 4.5 * np.sin(2 * np.pi * t * 4) + 6.0 * covid_bubble - 4.0 * qt_contraction + np.random.normal(0, 0.2, n_days))
    credit_cn_vals = (2.0 + 8.0 * np.sin(2 * np.pi * t * 3.5 + 0.3) + 8.0 * covid_bubble - 3.5 * qt_contraction + np.random.normal(0, 0.4, n_days))
    credit_global_vals = (0.4 * credit_us_vals + 0.35 * credit_cn_vals + 0.25 * np.random.normal(0, 0.2, n_days))

    # SWF AUM
    swf_nbim_vals = (150 + 1500 * t + np.random.normal(0, 8, n_days))
    swf_adia_vals = (250 + 700 * t + np.random.normal(0, 4, n_days))
    swf_pif_vals = (30 + 850 * t + np.random.normal(0, 6, n_days))
    swf_cic_vals = (100 + 1200 * t + np.random.normal(0, 5, n_days))
    swf_gic_vals = (150 + 600 * t + np.random.normal(0, 3, n_days))

    swap_line_vals = (250 * gfc_crash + 400 * covid_bubble + 30 * np.random.uniform(0, 1, n_days))
    eurodollar_vals = (-10 - 70 * gfc_crash - 45 * covid_bubble - 25 * qt_contraction + np.random.normal(0, 1.5, n_days))

    # Build observation batch (Optimize memory by grouping commits)
    print("Writing time series observations into the data warehouse...")
    obs_batch = []
    for i, dt in enumerate(dates):
        # Monthly structural data layer (seeded monthly on day 1)
        if dt.day == 1:
            obs_batch.append(Observation(time_series_id=tseries["M2SL"].id, date=dt, value=m2_vals[i]))
            obs_batch.append(Observation(time_series_id=tseries["PBOC_ASSETS"].id, date=dt, value=pboc_vals[i]))
            obs_batch.append(Observation(time_series_id=tseries["RBI_ASSETS"].id, date=dt, value=rbi_vals[i]))
            obs_batch.append(Observation(time_series_id=tseries["SNB_ASSETS"].id, date=dt, value=snb_vals[i]))
            obs_batch.append(Observation(time_series_id=tseries["M2_CN"].id, date=dt, value=m2_cn_vals[i]))
            obs_batch.append(Observation(time_series_id=tseries["M2_EU"].id, date=dt, value=m2_eu_vals[i]))
            obs_batch.append(Observation(time_series_id=tseries["M2_JP"].id, date=dt, value=m2_jp_vals[i]))
            obs_batch.append(Observation(time_series_id=tseries["M2_IN"].id, date=dt, value=m2_in_vals[i]))
            obs_batch.append(Observation(time_series_id=tseries["M2_UK"].id, date=dt, value=m2_uk_vals[i]))
            obs_batch.append(Observation(time_series_id=tseries["FX_RESERVES_CN"].id, date=dt, value=fx_cn_vals[i]))
            obs_batch.append(Observation(time_series_id=tseries["FX_RESERVES_JP"].id, date=dt, value=fx_jp_vals[i]))
            obs_batch.append(Observation(time_series_id=tseries["FX_RESERVES_IN"].id, date=dt, value=fx_in_vals[i]))
            obs_batch.append(Observation(time_series_id=tseries["FX_RESERVES_SA"].id, date=dt, value=fx_sa_vals[i]))
            obs_batch.append(Observation(time_series_id=tseries["FX_RESERVES_KR"].id, date=dt, value=fx_kr_vals[i]))
            obs_batch.append(Observation(time_series_id=tseries["GOLD_RESERVES_CN"].id, date=dt, value=gold_cn_vals[i]))
            obs_batch.append(Observation(time_series_id=tseries["GOLD_RESERVES_IN"].id, date=dt, value=gold_in_vals[i]))
            obs_batch.append(Observation(time_series_id=tseries["GOLD_RESERVES_PL"].id, date=dt, value=gold_pl_vals[i]))
            obs_batch.append(Observation(time_series_id=tseries["TIC_JP_UST"].id, date=dt, value=tic_jp_vals[i]))
            obs_batch.append(Observation(time_series_id=tseries["TIC_CN_UST"].id, date=dt, value=tic_cn_vals[i]))
            obs_batch.append(Observation(time_series_id=tseries["TIC_TOTAL_FOREIGN"].id, date=dt, value=tic_total_vals[i]))
            
            sip_inflow = 1200 + 18000 * t[i] + np.random.normal(0, 100)
            mf_small = 150 + 3500 * (t[i] ** 2) + np.random.normal(0, 200)
            obs_batch.append(Observation(time_series_id=tseries["SIP_INFLOW"].id, date=dt, value=max(50.0, sip_inflow)))
            obs_batch.append(Observation(time_series_id=tseries["MF_SMALL_CAP_FLOW"].id, date=dt, value=max(10.0, mf_small)))

        # Weekly structural layers (Wednesday)
        if dt.weekday() == 2:
            obs_batch.append(Observation(time_series_id=tseries["WALCL"].id, date=dt, value=walcl_vals[i]))
            obs_batch.append(Observation(time_series_id=tseries["GLOBAL_SURPLUS_FLOW"].id, date=dt, value=reserves_vals[i]))
            obs_batch.append(Observation(time_series_id=tseries["ECB_ASSETS"].id, date=dt, value=ecb_vals[i]))
            obs_batch.append(Observation(time_series_id=tseries["BOJ_ASSETS"].id, date=dt, value=boj_asset_vals[i]))
            obs_batch.append(Observation(time_series_id=tseries["BOE_ASSETS"].id, date=dt, value=boe_vals[i]))
            obs_batch.append(Observation(time_series_id=tseries["FED_SWAP_LINE"].id, date=dt, value=max(0.0, swap_line_vals[i])))

        # Quarterly layers
        if dt.day == 1 and dt.month in (1, 4, 7, 10):
            obs_batch.append(Observation(time_series_id=tseries["COFER_USD_PCT"].id, date=dt, value=cofer_usd_vals[i]))
            obs_batch.append(Observation(time_series_id=tseries["COFER_EUR_PCT"].id, date=dt, value=cofer_eur_vals[i]))
            obs_batch.append(Observation(time_series_id=tseries["COFER_CNY_PCT"].id, date=dt, value=cofer_cny_vals[i]))
            obs_batch.append(Observation(time_series_id=tseries["COFER_GOLD_PCT"].id, date=dt, value=cofer_gold_vals[i]))
            obs_batch.append(Observation(time_series_id=tseries["CREDIT_IMPULSE_US"].id, date=dt, value=credit_us_vals[i]))
            obs_batch.append(Observation(time_series_id=tseries["CREDIT_IMPULSE_CN"].id, date=dt, value=credit_cn_vals[i]))
            obs_batch.append(Observation(time_series_id=tseries["CREDIT_IMPULSE_GLOBAL"].id, date=dt, value=credit_global_vals[i]))
            obs_batch.append(Observation(time_series_id=tseries["SWF_NBIM"].id, date=dt, value=swf_nbim_vals[i]))
            obs_batch.append(Observation(time_series_id=tseries["SWF_ADIA"].id, date=dt, value=swf_adia_vals[i]))
            obs_batch.append(Observation(time_series_id=tseries["SWF_PIF"].id, date=dt, value=swf_pif_vals[i]))
            obs_batch.append(Observation(time_series_id=tseries["SWF_CIC"].id, date=dt, value=swf_cic_vals[i]))
            obs_batch.append(Observation(time_series_id=tseries["SWF_GIC"].id, date=dt, value=swf_gic_vals[i]))

        # Daily tactical layers (sampled weekly to save memory space)
        if dt.weekday() == 4: # Friday
            obs_batch.append(Observation(time_series_id=tseries["DXY"].id, date=dt, value=dxy_vals[i]))
            obs_batch.append(Observation(time_series_id=tseries["VIX"].id, date=dt, value=vix_vals[i]))
            obs_batch.append(Observation(time_series_id=tseries["DFII10"].id, date=dt, value=real_yield_vals[i]))
            obs_batch.append(Observation(time_series_id=tseries["BAMLH0A0HYM2"].id, date=dt, value=hy_spread_vals[i]))
            obs_batch.append(Observation(time_series_id=tseries["USDT_SUPPLY"].id, date=dt, value=stablecoin_vals[i]))
            obs_batch.append(Observation(time_series_id=tseries["BOJ_RATE"].id, date=dt, value=boj_rates[i]))
            obs_batch.append(Observation(time_series_id=tseries["FED_RATE"].id, date=dt, value=fed_rates[i]))
            obs_batch.append(Observation(time_series_id=tseries["YEN_CARRY_INDEX"].id, date=dt, value=carry_scores[i]))
            obs_batch.append(Observation(time_series_id=tseries["EURODOLLAR_SPREAD"].id, date=dt, value=eurodollar_vals[i]))

            obs_batch.append(Observation(time_series_id=tseries["SPY_FLOW"].id, date=dt, value=150 * np.sin(i / 30) + np.random.normal(0, 100)))
            obs_batch.append(Observation(time_series_id=tseries["GLD_FLOW"].id, date=dt, value=15 * np.cos(i / 45) + np.random.normal(0, 20)))
            obs_batch.append(Observation(time_series_id=tseries["TLT_FLOW"].id, date=dt, value=40 * np.sin(i / 60) + np.random.normal(0, 30)))
            obs_batch.append(Observation(time_series_id=tseries["INDA_FLOW"].id, date=dt, value=10 * np.cos(i / 20) + np.random.normal(0, 10)))

            fpi_eq = 100 * np.sin(i / 60) + 400 * credit_us_vals[i] + np.random.normal(0, 500)
            fpi_debt = 50 * np.cos(i / 40) + np.random.normal(0, 150)
            dii_flow = 800 + 400 * qt_contraction[i] + np.random.normal(0, 300)
            
            obs_batch.append(Observation(time_series_id=tseries["FPI_EQ_FLOW"].id, date=dt, value=fpi_eq))
            obs_batch.append(Observation(time_series_id=tseries["FPI_DEBT_FLOW"].id, date=dt, value=fpi_debt))
            obs_batch.append(Observation(time_series_id=tseries["DII_FLOW"].id, date=dt, value=max(-100.0, dii_flow)))

            tga_val = 150 + 100 * np.sin(i / 15) + 30 * np.random.normal()
            rrp_val = np.maximum(0.0, 50 + 2000 * covid_bubble[i] * qt_contraction[i] - 1500 * (t[i] - 0.7 if t[i] > 0.7 else 0))
            obs_batch.append(Observation(time_series_id=tseries["TGA"].id, date=dt, value=max(10.0, tga_val)))
            obs_batch.append(Observation(time_series_id=tseries["RRP"].id, date=dt, value=rrp_val))

        if len(obs_batch) >= 15000:
            db.bulk_save_objects(obs_batch)
            db.flush()
            obs_batch = []

    if obs_batch:
        db.bulk_save_objects(obs_batch)
        db.flush()

    # 5. Generate Asset Prices & Volumes
    print("Generating asset price historical paths...")
    price_batch = []

    asset_base_prices = {
        "SPY": {"start": 140.0, "drift_liq": 0.08, "vol": 0.012},
        "QQQ": {"start": 80.0, "drift_liq": 0.12, "vol": 0.016},
        "EEM": {"start": 20.0, "drift_liq": 0.05, "vol": 0.015},
        "INDA": {"start": 8.0, "drift_liq": 0.11, "vol": 0.013},
        "GLD": {"start": 35.0, "drift_liq": 0.06, "vol": 0.009},
        "BTC-USD": {"start": 0.1, "drift_liq": 0.55, "vol": 0.045}, # bitcoin starts small in 2009 proxy
        "TLT": {"start": 80.0, "drift_liq": 0.03, "vol": 0.008},
        "USDJPY=X": {"start": 105.0, "drift_liq": 0.01, "vol": 0.006},
        
        # Sectors US
        "XLK": {"start": 40.0, "drift_liq": 0.12, "vol": 0.015},
        "XLF": {"start": 15.0, "drift_liq": 0.06, "vol": 0.013},
        "XLE": {"start": 25.0, "drift_liq": 0.04, "vol": 0.018},
        "XLB": {"start": 20.0, "drift_liq": 0.05, "vol": 0.012},
        "XLI": {"start": 28.0, "drift_liq": 0.06, "vol": 0.011},
        "XLY": {"start": 35.0, "drift_liq": 0.08, "vol": 0.014},
        "XLP": {"start": 22.0, "drift_liq": 0.04, "vol": 0.008},
        "XLU": {"start": 24.0, "drift_liq": 0.02, "vol": 0.009},
        "XLV": {"start": 30.0, "drift_liq": 0.05, "vol": 0.009},
        "XLRE": {"start": 18.0, "drift_liq": 0.03, "vol": 0.014},

        # Sectors India
        "CNXBANK": {"start": 2000.0, "drift_liq": 0.12, "vol": 0.014},
        "CNXIT": {"start": 1500.0, "drift_liq": 0.15, "vol": 0.016},
        "CNXAUTO": {"start": 800.0, "drift_liq": 0.11, "vol": 0.013},
        "CNXREALTY": {"start": 100.0, "drift_liq": 0.18, "vol": 0.022},
        "CNXMETAL": {"start": 400.0, "drift_liq": 0.08, "vol": 0.017},
        "CNXINFRA": {"start": 500.0, "drift_liq": 0.09, "vol": 0.011},
        "CNXENERGY": {"start": 1200.0, "drift_liq": 0.08, "vol": 0.012},
        "CNXPHARMA": {"start": 800.0, "drift_liq": 0.07, "vol": 0.010},
    }

    # Simulate price paths weekly to save DB space
    for symbol, params in asset_base_prices.items():
        inst_id = instruments[symbol].id
        curr_price = params["start"]
        vol = params["vol"]
        
        path = [curr_price]
        for i in range(1, n_days):
            liq_factor = (t[i] - 0.5) * 0.4
            if symbol == "USDJPY=X":
                spread = fed_rates[i] - boj_rates[i]
                drift = 0.01 * spread
            elif symbol in ["QQQ", "XLK", "BTC-USD", "CNXREALTY"]:
                drift = params["drift_liq"] * (1.2 + liq_factor) + 0.02 * carry_scores[i]
            elif symbol == "TLT":
                drift = params["drift_liq"] * (1.5 - real_yield_vals[i])
            else:
                drift = params["drift_liq"] * (1.0 + liq_factor)

            ret = (drift / 252) + vol * np.random.normal()
            curr_price *= np.exp(ret)
            path.append(curr_price)

        # Only insert weekly closes to avoid performance degradation
        for i, dt in enumerate(dates):
            if dt.weekday() == 4: # Friday
                close = path[i]
                p_open = close * (1.0 + np.random.normal(0, 0.003))
                high = max(close, p_open) * 1.002
                low = min(close, p_open) * 0.998
                vol_val = 500000 * params["start"] / close
                
                valid_price_keys = {c.key for c in Price.__table__.columns}
                price_args = {
                    "instrument_id": inst_id,
                    "date": dt,
                    "open": round(p_open, 2),
                    "high": round(high, 2),
                    "low": round(low, 2),
                    "close": round(close, 2),
                    "adjusted_close": round(close, 2),
                    "volume": round(vol_val, 0)
                }
                filtered_price_args = {k: v for k, v in price_args.items() if k in valid_price_keys}
                price_batch.append(Price(**filtered_price_args))
                
                if len(price_batch) >= 15000:
                    db.bulk_save_objects(price_batch)
                    db.flush()
                    price_batch = []

    if price_batch:
        db.bulk_save_objects(price_batch)
        db.flush()

    # 6. Pre-calculate Backtest Results
    print("Pre-seeding backtest metrics...")
    strategies = [
        {"strategy_name": "Global Liquidity Risk-On Strategy", "signal_name": "Liquidity Score > +40", "entity_symbol": "SPY", "start_date": start_date, "end_date": end_date, "forward_period": "3M", "hit_rate": 0.68, "average_return": 0.045, "median_return": 0.038, "sharpe": 1.45, "max_drawdown": -0.08, "sample_size": 24, "notes": "Trades are triggered when global composite liquidity score crosses above 40."},
        {"strategy_name": "Global Liquidity Risk-On Strategy", "signal_name": "Liquidity Score > +40", "entity_symbol": "QQQ", "start_date": start_date, "end_date": end_date, "forward_period": "3M", "hit_rate": 0.72, "average_return": 0.068, "median_return": 0.059, "sharpe": 1.62, "max_drawdown": -0.12, "sample_size": 24, "notes": "Highly sensitive tech assets show maximum return amplification during expansion."},
        {"strategy_name": "Global Liquidity Risk-On Strategy", "signal_name": "Liquidity Score > +40", "entity_symbol": "BTC-USD", "start_date": start_date, "end_date": end_date, "forward_period": "3M", "hit_rate": 0.78, "average_return": 0.224, "median_return": 0.185, "sharpe": 2.10, "max_drawdown": -0.22, "sample_size": 24, "notes": "Crypto liquidity correlations remain extremely high."},
        {"strategy_name": "India Flow Confirmation Strategy", "signal_name": "FPI+DII positive & Price > 200DMA", "entity_symbol": "INDA", "start_date": start_date, "end_date": end_date, "forward_period": "6M", "hit_rate": 0.81, "average_return": 0.092, "median_return": 0.084, "sharpe": 1.88, "max_drawdown": -0.06, "sample_size": 18, "notes": "Dual FPI/DII buyer support creates a strong floor for Indian equities."},
        {"strategy_name": "Sector Rotation Strategy", "signal_name": "Improving -> Leading Transition", "entity_symbol": "CNXREALTY", "start_date": start_date, "end_date": end_date, "forward_period": "3M", "hit_rate": 0.65, "average_return": 0.115, "median_return": 0.092, "sharpe": 1.34, "max_drawdown": -0.14, "sample_size": 15, "notes": "Indian real estate sector showcases extreme momentum runs upon entering Leading quadrant."},
    ]
    valid_backtest_keys = {c.key for c in BacktestResult.__table__.columns}
    for strat in strategies:
        mapped_strat = {
            "strategy_name": strat.get("strategy_name"),
            "parameters": strat.get("signal_name"),
            "sharpe_ratio": strat.get("sharpe"),
            "max_drawdown": strat.get("max_drawdown"),
            "total_return": strat.get("average_return"),
            "win_rate": strat.get("hit_rate"),
        }
        filtered_strat = {k: v for k, v in mapped_strat.items() if k in valid_backtest_keys}
        db.add(BacktestResult(**filtered_strat))

    # 7. Generate Alerts
    alerts_data = [
        {"date": end_date, "entity": "Global", "alert_type": "RegimeChange", "severity": "Info", "message": "Yen Carry Trade remains supportive (Arbitrage Index: +82.4). Spreads between Fed and BoJ policies remain wide (+4.5%), favoring Yen depreciation.", "supporting_data": "Fed rate 4.75% vs BoJ 0.25%, USDJPY at 158", "contradicting_data": "BoJ has indicated potential rate hikes in late 2026"},
        {"date": end_date - timedelta(days=2), "entity": "India", "alert_type": "Divergence", "severity": "Warning", "message": "FPI outflows persist in Indian equities. DII/SIP support acting as structural cushion, but secular bull breakout requires return of foreign surplus liquidity.", "supporting_data": "DII +2200Cr, SIP +19850Cr", "contradicting_data": "FPI Equity Outflow -3800Cr"},
        {"date": end_date - timedelta(days=3), "entity": "Global", "alert_type": "LeadershipShift", "severity": "Info", "message": "Cash Surplus capital flows (JP, CN, Gulf) remain in safe assets, with sovereign purchases of global gold hitting all-time highs.", "supporting_data": "Gold reserves expansion +4.2% YoY", "contradicting_data": "Sovereign equity purchases slowing"},
    ]
    for al in alerts_data:
        db.add(Alert(**al))

    # 8. Seed Derived Indicators Monthly (Creation, Transmission, Confirmation, Euphoria, Drain)
    print("Pre-calculating derived indicators monthly...")
    derived_batch = []
    
    # We will generate monthly derived records for the 5 Master Indicators from 2000 to 2026
    indicators = ["Creation", "Transmission", "Confirmation", "Euphoria", "Drain"]
    
    for i, dt in enumerate(dates):
        if dt.day == 1:
            # Creation Score
            cr_score = round(50.0 + 35.0 * covid_bubble[i] - 25.0 * qt_contraction[i] + random.uniform(-4, 4), 1)
            cr_status = "Expanding" if cr_score >= 80 else "Neutral" if cr_score >= 50 else "Contracting"
            
            # Transmission Score
            tr_score = round(45.0 + 30.0 * credit_global_vals[i] / 5.0 + random.uniform(-3, 3), 1)
            tr_status = "Transmitting strongly" if tr_score >= 75 else "Transmitting slowly" if tr_score >= 50 else "Blocked transmission"
            
            # Confirmation Score
            co_score = round(48.0 + 35.0 * (1 - qt_contraction[i]) * (1.2 - vix_vals[i]/40.0) + random.uniform(-5, 5), 1)
            co_status = "Confirmed bull" if co_score >= 75 else "Early accumulation" if co_score >= 50 else "Breakdown"
            
            # Euphoria Score
            eu_score = round(20.0 + 60.0 * credit_boom[i] + 55.0 * covid_bubble[i] * (1 - qt_contraction[i]) + random.uniform(-4, 4), 1)
            eu_status = "Euphoria warning" if eu_score >= 80 else "Distribution started" if eu_score >= 60 else "Healthy bull"
            
            # Drain Score
            dr_score = round(15.0 + 65.0 * qt_contraction[i] + 45.0 * gfc_crash[i] + random.uniform(-3, 3), 1)
            dr_status = "Forced deleveraging" if dr_score >= 80 else "Active drain" if dr_score >= 50 else "Mild drain"

            derived_batch.append(DerivedIndicator(
                date=dt,
                indicator_type="Creation",
                score=cr_score,
                sub_scores=json.dumps({"cb_liquidity": round(cr_score*0.8, 1), "excess_reserves": round(cr_score*1.1, 1)}),
                confidence=round(80 + random.uniform(5, 15), 1),
                data_quality=1.0,
                input_vars=json.dumps({"walcl": walcl_vals[i], "m2": m2_vals[i]}),
                explanation=f"Liquidity Creation is currently {cr_status} with score {cr_score}."
            ))
            
            derived_batch.append(DerivedIndicator(
                date=dt,
                indicator_type="Transmission",
                score=tr_score,
                sub_scores=json.dumps({"credit_impulse": round(tr_score*0.9, 1), "fci": round(tr_score*0.75, 1)}),
                confidence=round(82 + random.uniform(4, 14), 1),
                data_quality=1.0,
                input_vars=json.dumps({"credit_impulse": credit_global_vals[i], "fed_rate": fed_rates[i]}),
                explanation=f"Liquidity Transmission is {tr_status} with score {tr_score}."
            ))

            derived_batch.append(DerivedIndicator(
                date=dt,
                indicator_type="Confirmation",
                score=co_score,
                sub_scores=json.dumps({"relative_strength": round(co_score*0.85, 1), "breadth": round(co_score*0.95, 1)}),
                confidence=round(85 + random.uniform(3, 10), 1),
                data_quality=1.0,
                input_vars=json.dumps({"vix": vix_vals[i]}),
                explanation=f"Market Confirmation status is {co_status}."
            ))

            derived_batch.append(DerivedIndicator(
                date=dt,
                indicator_type="Euphoria",
                score=eu_score,
                sub_scores=json.dumps({"valuation_stretch": round(eu_score*1.1, 1), "concentration": round(eu_score*0.8, 1)}),
                confidence=round(75 + random.uniform(5, 15), 1),
                data_quality=1.0,
                input_vars=json.dumps({"dxy": dxy_vals[i]}),
                explanation=f"Euphoria score is {eu_score} representing {eu_status}."
            ))

            derived_batch.append(DerivedIndicator(
                date=dt,
                indicator_type="Drain",
                score=dr_score,
                sub_scores=json.dumps({"currency_pressure": round(dr_score*0.9, 1), "outflows": round(dr_score*1.05, 1)}),
                confidence=round(80 + random.uniform(4, 12), 1),
                data_quality=1.0,
                input_vars=json.dumps({"qt_contraction": qt_contraction[i]}),
                explanation=f"Systemic Liquidity Drain is {dr_status}."
            ))

    if derived_batch:
        db.bulk_save_objects(derived_batch)
        db.flush()

    db.commit()
    print("Database seeding completed successfully for 2000-2026 data.")

if __name__ == "__main__":
    from ..database import SessionLocal, engine, Base
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    generate_mock_data(db)
    db.close()
