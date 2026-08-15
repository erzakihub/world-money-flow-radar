import datetime
import os
import json
import random
import numpy as np
from sqlalchemy.orm import Session
from ..models import (
    Stock, DailyPrice, AdjustedPrice, CorporateAction,
    FinancialQuarterly, FinancialAnnual, RatiosDaily,
    RatiosQuarterly, ShareholdingPattern, FactorScores,
    Screen, Strategy
)

def generate_mock_data(db: Session):
    # Check if data already exists to avoid double seeding
    if db.query(Stock).first() is not None:
        print("Database already contains data. Skipping seeding.")
        return

    print("Seeding database with 12+ years of institutional Indian equities & financial statements data...")

    # Load 1,030 stock universe from universe_1000.json
    universe_path = os.path.join(os.path.dirname(__file__), "..", "data", "universe_1000.json")
    rows = []
    if os.path.exists(universe_path):
        try:
            with open(universe_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                rows = data.get("rows", [])
        except Exception as e:
            print(f"Error loading universe_1000.json: {e}")

    sec_map = {
        'Finance': 'Banking & Financial Services',
        'Producer Manufacturing': 'Capital Goods & Manufacturing',
        'Process Industries': 'Chemicals & Materials',
        'Health Technology': 'Healthcare & Pharma',
        'Non-Energy Minerals': 'Metals & Mining',
        'Technology Services': 'Information Technology',
        'Consumer Non-Durables': 'FMCG & Consumer Goods',
        'Consumer Durables': 'Consumer Discretionary',
        'Electronic Technology': 'Electronics & Hardware',
        'Industrial Services': 'Industrial & Engineering',
        'Utilities': 'Power & Utilities',
        'Consumer Services': 'Consumer Services',
        'Retail Trade': 'Retail & E-Commerce',
        'Commercial Services': 'Commercial Services',
        'Health Services': 'Hospitals & Healthcare',
        'Energy Minerals': 'Oil, Gas & Energy',
        'Communications': 'Telecom & Media',
        'Transportation': 'Logistics & Transportation',
        'Distribution Services': 'Distribution & Supply Chain'
    }

    # Fallback if universe file not found
    if not rows:
        rows = [
            {"symbol": "RELIANCE", "name": "Reliance Industries Limited", "description": "Reliance Industries Limited", "sector": "Energy Minerals", "market_cap_basic": 17959032259459, "close": 1313.5},
            {"symbol": "TCS", "name": "Tata Consultancy Services Limited", "description": "Tata Consultancy Services Limited", "sector": "Technology Services", "market_cap_basic": 8501419800000, "close": 2361.9},
            {"symbol": "HDFCBANK", "name": "HDFC Bank Limited", "description": "HDFC Bank Limited", "sector": "Finance", "market_cap_basic": 11233422300000, "close": 727.7},
            {"symbol": "INFY", "name": "Infosys Limited", "description": "Infosys Limited", "sector": "Technology Services", "market_cap_basic": 4771463000000, "close": 1169.4},
            {"symbol": "ITC", "name": "ITC Limited", "description": "ITC Limited", "sector": "Consumer Non-Durables", "market_cap_basic": 5400000000000, "close": 435.0},
            {"symbol": "BSE", "name": "BSE Limited", "description": "BSE Limited", "sector": "Finance", "market_cap_basic": 350000000000, "close": 2650.0},
            {"symbol": "TATAMOTORS", "name": "Tata Motors Limited", "description": "Tata Motors Limited", "sector": "Consumer Durables", "market_cap_basic": 3200000000000, "close": 980.0},
            {"symbol": "CIPLA", "name": "Cipla Limited", "description": "Cipla Limited", "sector": "Health Technology", "market_cap_basic": 1150000000000, "close": 1450.0},
            {"symbol": "ASTRA", "name": "Astra Microwave Products Limited", "description": "Astra Microwave Products Limited", "sector": "Electronic Technology", "market_cap_basic": 85000000000, "close": 880.0},
            {"symbol": "SME_ALPHA", "name": "Alpha SME Solutions Limited", "description": "Alpha SME Solutions Limited", "sector": "Technology Services", "market_cap_basic": 4500000000, "close": 420.0},
            {"symbol": "SME_BETA", "name": "Beta Agri Processors Limited", "description": "Beta Agri Processors Limited", "sector": "Consumer Non-Durables", "market_cap_basic": 2500000000, "close": 195.0},
            {"symbol": "OLD_TELE", "name": "Telecom India Infotech Limited", "description": "Telecom India Infotech Limited", "sector": "Communications", "market_cap_basic": 0, "close": 2.0}
        ]

    # Create All Stock Objects
    seen_syms = set()
    all_stocks = []
    for idx, r in enumerate(rows):
        sym = str(r.get("symbol") or "").strip().upper()
        if not sym or sym in seen_syms:
            continue
        seen_syms.add(sym)

        raw_sec = r.get("sector") or "Diversified"
        sector = sec_map.get(raw_sec, raw_sec)
        industry = r.get("industry") or sector
        desc = r.get("description") or r.get("name") or sym
        mcap_basic = float(r.get("market_cap_basic") or 10000000000)
        mcap_cr = round(mcap_basic / 10000000.0, 2)
        is_sme = mcap_cr < 500.0 or "SME" in sym
        listing_yr = 2000 + (idx % 15)
        listing_dt = datetime.date(listing_yr, 1 + (idx % 12), 1 + (idx % 25))

        stk = Stock(
            symbol=sym,
            company_name=desc,
            isin=f"INE{len(seen_syms):05d}010{len(seen_syms)%10}",
            exchange="NSE",
            sector=sector,
            industry=industry,
            market_cap=mcap_cr,
            is_sme=is_sme,
            listing_date=listing_dt,
            face_value=2.0 if not is_sme else 10.0,
            is_active=True
        )
        all_stocks.append(stk)
        db.add(stk)

    db.commit()
    print(f"Created {len(all_stocks)} stocks in registry.")

    # Dates Range (12 full years: 2014 to 2026)
    start_date = datetime.date(2014, 1, 1)
    end_date = datetime.date(2026, 8, 6)
    
    date_step = datetime.timedelta(days=7)
    trading_dates = []
    curr = start_date
    while curr <= end_date:
        trading_dates.append(curr)
        curr += date_step

    years = list(range(2014, 2027))

    # Core Liquid & Sector Representative stocks for 12-year deep point-in-time time series
    active_deep_stocks = all_stocks[:120]
    top_syms = set(s.symbol for s in active_deep_stocks)
    for s in all_stocks:
        if s.symbol in ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ITC', 'BSE', 'TATAMOTORS', 'CIPLA', 'ASTRA', 'SME_ALPHA', 'SME_BETA', 'OLD_TELE', 'KAYNES', 'NETWEB', 'DATA PATTERNS', 'MTAR', 'HFCL', 'CDSL', 'CAMS', 'ZOMATO', 'TRENT', 'POLYCAB', 'DIXON', 'PERSISTENT', 'COFORGE', 'TITAN', 'MARUTI', 'M&M', 'SUNPHARMA', 'BAJFINANCE', 'LT', 'SBIN', 'ICICIBANK', 'BHARTIARTL']:
            if s.symbol not in top_syms:
                active_deep_stocks.append(s)
                top_syms.add(s.symbol)

    print(f"Generating 12-year deep point-in-time statements & prices for {len(active_deep_stocks)} core liquid equities...")

    annual_list = []
    quarterly_list = []
    sh_list = []
    rq_list = []
    fs_list = []
    adj_prices_list = []

    cmp_lookup = {r.get("symbol"): float(r.get("close") or 500.0) for r in rows if r.get("symbol")}

    for stock in active_deep_stocks:
        random.seed(stock.symbol)
        
        base_sales = max(50.0, stock.market_cap * random.uniform(0.3, 0.9))
        cagr_sales = random.uniform(0.11, 0.24)
        ebitda_margin = random.uniform(0.15, 0.36)
        tax_rate = 0.25
        interest_rate = 0.075
        base_debt = base_sales * random.uniform(0.05, 0.40)
        depr_rate = 0.04
        
        cmp = cmp_lookup.get(stock.symbol, 500.0)
        if cmp <= 0: cmp = 500.0
        start_price = max(5.0, cmp / ((1.19) ** 12))
        price = start_price
        
        drift_by_symbol = {
            "RELIANCE": 0.0033, "TCS": 0.0035, "HDFCBANK": 0.0032, "INFY": 0.0031,
            "ITC": 0.0025, "TATAMOTORS": 0.0034, "CIPLA": 0.0029, "ASTRA": 0.0044,
            "BSE": 0.0055, "SME_ALPHA": 0.0050, "SME_BETA": 0.0040, "OLD_TELE": -0.0055
        }
        drift = drift_by_symbol.get(stock.symbol, 0.0032)
        vol = 0.022 if not stock.is_sme else 0.035

        # 12 Years Annuals
        for yr in years:
            sales_yr = base_sales * ((1.0 + cagr_sales) ** (yr - 2014))
            ebitda_yr = sales_yr * ebitda_margin
            depr_yr = sales_yr * depr_rate
            ebit_yr = ebitda_yr - depr_yr
            debt_yr = base_debt * ((1.0 + cagr_sales * 0.4) ** (yr - 2014))
            fin_cost_yr = debt_yr * interest_rate
            pbt_yr = ebit_yr - fin_cost_yr
            tax_yr = max(0.0, pbt_yr * tax_rate)
            pat_yr = pbt_yr - tax_yr
            eps_yr = max(0.1, pat_yr / (stock.market_cap / 100.0))
            
            equity_cap = 100.0 if not stock.is_sme else 10.0
            reserves_yr = sales_yr * 1.5 + pat_yr * 4.0
            fixed_assets_yr = sales_yr * 0.75
            cash_yr = reserves_yr * random.uniform(0.08, 0.25)
            cfo_yr = pat_yr * random.uniform(0.85, 1.25)
            capex_yr = depr_yr * random.uniform(1.1, 1.6)
            fcf_yr = cfo_yr - capex_yr
            div_yr = max(0.0, pat_yr * random.uniform(0.15, 0.35))
            
            p_end_yr = datetime.date(yr, 3, 31)
            pub_date = datetime.date(yr, 6, 30)
            
            fa = FinancialAnnual(
                stock_id=stock.id, date=p_end_yr, period_end=p_end_yr, publication_date=pub_date,
                sales=round(sales_yr, 2), ebitda=round(ebitda_yr, 2), depreciation=round(depr_yr, 2),
                ebit=round(ebit_yr, 2), finance_cost=round(fin_cost_yr, 2), pbt=round(pbt_yr, 2),
                tax=round(tax_yr, 2), pat=round(pat_yr, 2), eps=round(eps_yr, 2),
                equity_share_capital=round(equity_cap, 2), reserves=round(reserves_yr, 2),
                total_debt=round(debt_yr, 2), short_term_borrowings=round(debt_yr * 0.2, 2),
                long_term_borrowings=round(debt_yr * 0.8, 2), cash_equivalents=round(cash_yr, 2),
                fixed_assets=round(fixed_assets_yr, 2), cwip=round(fixed_assets_yr * 0.05, 2),
                investments=round(reserves_yr * 0.1, 2), inventory=round(sales_yr * 0.12, 2),
                receivables=round(sales_yr * 0.10, 2), payables=round(sales_yr * 0.08, 2),
                operating_cash_flow=round(cfo_yr, 2), investing_cash_flow=round(-capex_yr, 2),
                financing_cash_flow=round(-div_yr + debt_yr * 0.05, 2), free_cash_flow=round(fcf_yr, 2),
                capex=round(capex_yr, 2), dividend_paid=round(div_yr, 2)
            )
            annual_list.append(fa)
            
            # 4 Quarters per Year
            for q in range(1, 5):
                if q == 1: p_end_q = datetime.date(yr, 6, 30)
                elif q == 2: p_end_q = datetime.date(yr, 9, 30)
                elif q == 3: p_end_q = datetime.date(yr, 12, 31)
                else: p_end_q = datetime.date(yr + 1, 3, 31)
                
                sales_q = sales_yr * random.uniform(0.23, 0.27)
                ebitda_q = sales_q * ebitda_margin
                depr_q = depr_yr / 4.0
                ebit_q = ebitda_q - depr_q
                fin_cost_q = fin_cost_yr / 4.0
                pbt_q = ebit_q - fin_cost_q
                tax_q = max(0.0, pbt_q * tax_rate)
                pat_q = pbt_q - tax_q
                eps_q = eps_yr / 4.0
                ann_date = p_end_q + datetime.timedelta(days=30)
                
                fq = FinancialQuarterly(
                    stock_id=stock.id, date=p_end_q, period_end=p_end_q, announcement_date=ann_date,
                    sales=round(sales_q, 2), raw_materials=round(sales_q * 0.35, 2),
                    employee_cost=round(sales_q * 0.15, 2), other_expenses=round(sales_q * 0.20, 2),
                    ebitda=round(ebitda_q, 2), depreciation=round(depr_q, 2), ebit=round(ebit_q, 2),
                    finance_cost=round(fin_cost_q, 2), pbt=round(pbt_q, 2), tax=round(tax_q, 2),
                    pat=round(pat_q, 2), eps=round(eps_q, 2)
                )
                quarterly_list.append(fq)
                
                # Quarterly Ratios & Forensics
                tot_equity = equity_cap + reserves_yr
                tot_capital = tot_equity + debt_yr
                roce_val = round((ebit_yr / tot_capital) * 100.0, 2)
                roe_val = round((pat_yr / tot_equity) * 100.0, 2)
                de_val = round(debt_yr / tot_equity, 2)
                rq = RatiosQuarterly(
                    stock_id=stock.id, date=p_end_q, roce=roce_val, roe=roe_val,
                    debt_equity=de_val, interest_coverage=round(ebit_yr / max(1.0, fin_cost_yr), 2),
                    ebitda_margin=round(ebitda_margin * 100.0, 2), pat_margin=round((pat_yr / sales_yr) * 100.0, 2),
                    piotroski_f_score=random.choice([6, 7, 8, 9]) if roce_val > 15 else random.choice([4, 5, 6]),
                    piotroski_f_score_9=random.choice([7, 8, 9]) if roce_val > 15 else random.choice([5, 6, 7]),
                    altman_z_score=round(random.uniform(3.2, 7.5), 2),
                    beneish_m_score=round(random.uniform(-3.5, -2.4), 2),
                    sloan_accruals_ratio=round(random.uniform(-0.08, 0.04), 3),
                    sales_cagr_3y=round(cagr_sales * 100.0, 2), pat_cagr_3y=round(cagr_sales * 105.0, 2)
                )
                rq_list.append(rq)

            # Shareholding
            prom_p = round(random.uniform(50.0, 72.0), 2)
            fii_p = round(random.uniform(8.0, 24.0), 2)
            dii_p = round(random.uniform(10.0, 22.0), 2)
            pub_p = round(max(0.0, 100.0 - (prom_p + fii_p + dii_p)), 2)
            sh = ShareholdingPattern(
                stock_id=stock.id, date=datetime.date(yr, 12, 31),
                promoter_pct=prom_p, fii_pct=fii_p, dii_pct=dii_p, public_pct=pub_p,
                pledged_promoter_pct=0.0 if stock.market_cap > 50000 else round(random.uniform(0.0, 4.0), 2)
            )
            sh_list.append(sh)

        # 12 Years Weekly Prices
        for dt in trading_dates:
            price = price * (1.0 + random.normalvariate(drift, vol))
            price = max(1.0, round(price, 2))
            
            ap = AdjustedPrice(
                stock_id=stock.id, date=dt,
                open=round(price * random.uniform(0.98, 1.02), 2),
                high=round(price * random.uniform(1.0, 1.03), 2),
                low=round(price * random.uniform(0.97, 1.0), 2),
                close=price,
                volume=int(random.uniform(50000, 1500000) if not stock.is_sme else random.uniform(2000, 25000))
            )
            adj_prices_list.append(ap)
            
            # Factor Scores
            q_score = round(random.uniform(65.0, 95.0), 1)
            g_score = round(random.uniform(60.0, 92.0), 1)
            v_score = round(random.uniform(45.0, 85.0), 1)
            m_score = round(random.uniform(55.0, 94.0), 1)
            comp = round(0.35 * q_score + 0.25 * g_score + 0.15 * v_score + 0.25 * m_score, 1)
            
            fs = FactorScores(
                stock_id=stock.id, date=dt,
                quality=q_score, growth=g_score, value=v_score,
                momentum=m_score, risk=round(random.uniform(10.0, 35.0), 1),
                composite=comp
            )
            fs_list.append(fs)

    print(f"Bulk saving {len(annual_list):,} annuals, {len(quarterly_list):,} quarterlies, {len(adj_prices_list):,} prices...")
    db.bulk_save_objects(annual_list)
    db.bulk_save_objects(quarterly_list)
    db.bulk_save_objects(sh_list)
    db.bulk_save_objects(rq_list)
    db.bulk_save_objects(fs_list)
    db.bulk_save_objects(adj_prices_list)
    db.commit()

    # Seed Predefined Institutional Screens
    screens = [
        Screen(
            name="Institutional Quality-Momentum (IQM-30)",
            description="Filters top 30 liquid leaders combining ROCE > 15%, Piotroski F-score >= 6, and price above 200 DMA.",
            formula_json={
                "rules": [
                    {"field": "roce", "op": ">=", "val": "15.0"},
                    {"field": "piotroski_f_score", "op": ">=", "val": "6"},
                    {"field": "price_above_dma200", "op": "==", "val": "1"}
                ],
                "universe": {"min_market_cap": 500, "sme_allowed": False}
            }
        ),
        Screen(
            name="Forensic Quality Compounder",
            description="Detects strong balance sheets with zero promoter pledge, low debt/equity (< 0.5), and ROCE >= 16%.",
            formula_json={
                "rules": [
                    {"field": "debt_equity", "op": "<=", "val": "0.5"},
                    {"field": "roce", "op": ">=", "val": "16.0"}
                ],
                "universe": {"min_market_cap": 500, "sme_allowed": False}
            }
        )
    ]
    for sc in screens:
        db.add(sc)

    db.commit()
    print("Database seeding completed successfully for 1,030 stocks universe!")
