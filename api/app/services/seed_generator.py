import datetime
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

    print("Seeding database with 20 years of high-fidelity Indian equities data...")

    # Define representative stocks
    stocks_meta = [
        # Mainboard - Large Cap
        {"symbol": "RELIANCE", "company_name": "Reliance Industries Limited", "isin": "INE002A01018", "exchange": "NSE", "sector": "Energy", "industry": "Refineries & Marketing", "market_cap": 1720000.0, "is_sme": False, "listing_date": datetime.date(1995, 11, 27), "face_value": 10.0},
        {"symbol": "TCS", "company_name": "Tata Consultancy Services Limited", "isin": "INE467B01029", "exchange": "NSE", "sector": "Technology", "industry": "IT Software", "market_cap": 1380000.0, "is_sme": False, "listing_date": datetime.date(2004, 8, 25), "face_value": 1.0},
        {"symbol": "HDFCBANK", "company_name": "HDFC Bank Limited", "isin": "INE040A01034", "exchange": "NSE", "sector": "Banking", "industry": "Private Bank", "market_cap": 1250000.0, "is_sme": False, "listing_date": datetime.date(1995, 5, 19), "face_value": 1.0},
        {"symbol": "INFY", "company_name": "Infosys Limited", "isin": "INE009A01021", "exchange": "NSE", "sector": "Technology", "industry": "IT Software", "market_cap": 680000.0, "is_sme": False, "listing_date": datetime.date(1993, 6, 14), "face_value": 5.0},
        {"symbol": "ITC", "company_name": "ITC Limited", "isin": "INE154A01025", "exchange": "NSE", "sector": "FMCG", "industry": "Tobacco Products", "market_cap": 540000.0, "is_sme": False, "listing_date": datetime.date(1995, 1, 10), "face_value": 1.0},
        
        # Mainboard - Mid/Small Cap
        {"symbol": "BSE", "company_name": "BSE Limited", "isin": "INE118H01025", "exchange": "NSE", "sector": "Banking", "industry": "Financial Exchange", "market_cap": 35000.0, "is_sme": False, "listing_date": datetime.date(2017, 2, 3), "face_value": 2.0},
        {"symbol": "TATAMOTORS", "company_name": "Tata Motors Limited", "isin": "INE155A01022", "exchange": "NSE", "sector": "Automotive", "industry": "Commercial Vehicles", "market_cap": 320000.0, "is_sme": False, "listing_date": datetime.date(1995, 7, 12), "face_value": 2.0},
        {"symbol": "CIPLA", "company_name": "Cipla Limited", "isin": "INE059A01026", "exchange": "NSE", "sector": "Healthcare", "industry": "Pharmaceuticals", "market_cap": 115000.0, "is_sme": False, "listing_date": datetime.date(1995, 2, 8), "face_value": 2.0},
        {"symbol": "ASTRA", "company_name": "Astra Microwave Products Limited", "isin": "INE386D01027", "exchange": "NSE", "sector": "Industrials", "industry": "Defense Electronics", "market_cap": 8500.0, "is_sme": False, "listing_date": datetime.date(2004, 11, 11), "face_value": 2.0},

        # SME Stocks
        {"symbol": "SME_ALPHA", "company_name": "Alpha SME Solutions Limited", "isin": "INE00SME0101", "exchange": "BSE", "sector": "Technology", "industry": "IT Software", "market_cap": 450.0, "is_sme": True, "listing_date": datetime.date(2018, 5, 10), "face_value": 10.0},
        {"symbol": "SME_BETA", "company_name": "Beta Agri Processors Limited", "isin": "INE00SME0102", "exchange": "NSE", "sector": "FMCG", "industry": "Agro Products", "market_cap": 250.0, "is_sme": True, "listing_date": datetime.date(2020, 9, 15), "face_value": 10.0},

        # Delisted Stock (historical universe coverage)
        {"symbol": "OLD_TELE", "company_name": "Telecom India Infotech Limited", "isin": "INE999T01019", "exchange": "NSE", "sector": "Technology", "industry": "Telecom Equipment", "market_cap": 0.0, "is_sme": False, "listing_date": datetime.date(2002, 3, 20), "delisting_date": datetime.date(2019, 6, 30), "is_active": False, "face_value": 10.0}
    ]

    # Create Stocks
    db_stocks = []
    for meta in stocks_meta:
        stock = Stock(**meta)
        db.add(stock)
        db_stocks.append(stock)
    
    db.commit()

    # Dates Range (20 years: 2006 to 2026)
    start_date = datetime.date(2006, 1, 1)
    end_date = datetime.date(2026, 6, 30)
    
    # We will generate price observations on a weekly step (every Wednesday) to keep database sizes lean
    # while providing 20 years of point-to-point history that is fast to calculate and load.
    date_step = datetime.timedelta(days=7)
    trading_dates = []
    curr = start_date
    while curr <= end_date:
        # Wednesday is a standard weekday
        trading_dates.append(curr)
        curr += date_step

    print(f"Generating data across {len(trading_dates)} dates for {len(db_stocks)} symbols...")

    for stock in db_stocks:
        # Baseline financials parameters for realistic generation
        # Establish stable trend values unique to each stock
        random.seed(stock.symbol)
        
        # Base fundamentals
        base_sales = random.uniform(500.0, 5000.0) if not stock.is_sme else random.uniform(10.0, 50.0)
        cagr_sales = random.uniform(0.08, 0.22)  # 8% to 22% growth
        ebitda_margin = random.uniform(0.12, 0.32)
        interest_rate = 0.08
        base_debt = base_sales * random.uniform(0.1, 0.8)
        depreciation_rate = 0.05
        tax_rate = 0.25

        # Seed Financials (Annual & Quarterly)
        annual_financials = []
        quarterly_financials = []
        shareholding_history = []
        
        # Build history year-by-year
        years = list(range(2005, 2027))
        for yr in years:
            sales_yr = base_sales * ((1.0 + cagr_sales) ** (yr - 2005))
            # SME listing start constraint
            if stock.listing_date.year > yr:
                continue
            # Delisted constraint
            if stock.delisting_date and stock.delisting_date.year < yr:
                continue

            ebitda_yr = sales_yr * ebitda_margin
            depr_yr = sales_yr * depreciation_rate
            ebit_yr = ebitda_yr - depr_yr
            debt_yr = base_debt * ((1.0 + cagr_sales * 0.5) ** (yr - 2005))
            fin_cost_yr = debt_yr * interest_rate
            pbt_yr = ebit_yr - fin_cost_yr
            tax_yr = max(0.0, pbt_yr * tax_rate)
            pat_yr = pbt_yr - tax_yr
            eps_yr = pat_yr / (stock.market_cap / 100.0) if stock.market_cap > 0 else pat_yr / 10.0
            
            # Balance sheet
            equity_cap = 100.0 if not stock.is_sme else 10.0
            reserves_yr = (sales_yr * 1.5) + (pat_yr * 3)
            fixed_assets_yr = (sales_yr * 0.8)
            cash_yr = reserves_yr * random.uniform(0.05, 0.2)
            inventory_yr = sales_yr * 0.12
            receivables_yr = sales_yr * 0.10
            payables_yr = sales_yr * 0.08

            # Cash flows
            cfo_yr = pat_yr * random.uniform(0.8, 1.2)
            capex_yr = depr_yr * random.uniform(1.1, 1.8)
            cfi_yr = -capex_yr
            dividend_paid_yr = max(0.0, pat_yr * random.uniform(0.1, 0.4))
            cff_yr = -dividend_paid_yr + (debt_yr * 0.05)
            fcf_yr = cfo_yr - capex_yr

            period_end_yr = datetime.date(yr, 3, 31)
            # Publication date (usually 2-3 months after fiscal year end)
            pub_date_yr = datetime.date(yr, 6, 30)

            # Save Annual Record
            fa = FinancialAnnual(
                stock_id=stock.id,
                date=period_end_yr,
                period_end=period_end_yr,
                publication_date=pub_date_yr,
                sales=round(sales_yr, 2),
                ebitda=round(ebitda_yr, 2),
                depreciation=round(depr_yr, 2),
                ebit=round(ebit_yr, 2),
                finance_cost=round(fin_cost_yr, 2),
                pbt=round(pbt_yr, 2),
                tax=round(tax_yr, 2),
                pat=round(pat_yr, 2),
                eps=round(eps_yr, 2),
                equity_share_capital=round(equity_cap, 2),
                reserves=round(reserves_yr, 2),
                total_debt=round(debt_yr, 2),
                short_term_borrowings=round(debt_yr * 0.2, 2),
                long_term_borrowings=round(debt_yr * 0.8, 2),
                cash_equivalents=round(cash_yr, 2),
                fixed_assets=round(fixed_assets_yr, 2),
                cwip=round(fixed_assets_yr * 0.05, 2),
                investments=round(reserves_yr * 0.1, 2),
                inventory=round(inventory_yr, 2),
                receivables=round(receivables_yr, 2),
                payables=round(payables_yr, 2),
                operating_cash_flow=round(cfo_yr, 2),
                investing_cash_flow=round(cfi_yr, 2),
                financing_cash_flow=round(cff_yr, 2),
                free_cash_flow=round(fcf_yr, 2),
                capex=round(capex_yr, 2),
                dividend_paid=round(dividend_paid_yr, 2)
            )
            annual_financials.append(fa)
            db.add(fa)

            # Generate 4 Quarters for this year
            for q in range(1, 5):
                q_month = q * 3
                period_end_q = datetime.date(yr if q < 4 else yr + 1, q_month if q < 4 else 3, 30 if q_month in [6, 9] else (31 if q_month == 12 else 31))
                if period_end_q.month == 3:
                    period_end_q = datetime.date(yr, 3, 31)
                
                # Quarterly split: roughly 22-28% of annual sales
                sales_q = sales_yr * random.uniform(0.22, 0.28)
                ebitda_q = sales_q * ebitda_margin
                depr_q = depr_yr / 4.0
                ebit_q = ebitda_q - depr_q
                fin_cost_q = fin_cost_yr / 4.0
                pbt_q = ebit_q - fin_cost_q
                tax_q = max(0.0, pbt_q * tax_rate)
                pat_q = pbt_q - tax_q
                eps_q = eps_yr / 4.0

                # Announcement lag: 30 days after quarter end
                announce_date_q = period_end_q + datetime.timedelta(days=30)

                fq = FinancialQuarterly(
                    stock_id=stock.id,
                    date=period_end_q,
                    period_end=period_end_q,
                    announcement_date=announce_date_q,
                    sales=round(sales_q, 2),
                    raw_materials=round(sales_q * 0.35, 2),
                    employee_cost=round(sales_q * 0.15, 2),
                    other_expenses=round(sales_q * 0.20, 2),
                    ebitda=round(ebitda_q, 2),
                    depreciation=round(depr_q, 2),
                    ebit=round(ebit_q, 2),
                    finance_cost=round(fin_cost_q, 2),
                    pbt=round(pbt_q, 2),
                    tax=round(tax_q, 2),
                    pat=round(pat_q, 2),
                    eps=round(eps_q, 2)
                )
                quarterly_financials.append(fq)
                db.add(fq)

            # Shareholding pattern per year
            sh = ShareholdingPattern(
                stock_id=stock.id,
                date=datetime.date(yr, 12, 31),
                promoter_pct=round(random.uniform(45.0, 72.0), 2),
                fii_pct=round(random.uniform(5.0, 22.0), 2),
                dii_pct=round(random.uniform(8.0, 25.0), 2),
                public_pct=0.0, # Will compute below
                pledged_promoter_pct=round(random.uniform(0.0, 8.0) if yr % 3 == 0 else 0.0, 2),
                mutual_fund_pct=round(random.uniform(2.0, 10.0), 2)
            )
            sh.public_pct = round(100.0 - (sh.promoter_pct + sh.fii_pct + sh.dii_pct), 2)
            shareholding_history.append(sh)
            db.add(sh)

        # Let's add corporate actions:
        # A split on RELIANCE in 2017-09-05 (1:2 ratio)
        # A bonus on TCS in 2018-06-01 (1:1 ratio, meaning 1 additional share for every 1 owned)
        actions = []
        if stock.symbol == "RELIANCE":
            actions.append(CorporateAction(
                stock_id=stock.id,
                date=datetime.date(2017, 9, 5),
                type="Split",
                ratio_from=1.0,
                ratio_to=2.0,
                description="Face value split from ₹10 to ₹5"
            ))
        elif stock.symbol == "TCS":
            actions.append(CorporateAction(
                stock_id=stock.id,
                date=datetime.date(2018, 6, 1),
                type="Bonus",
                ratio_from=1.0,
                ratio_to=2.0,
                description="Bonus issue 1:1"
            ))
        
        # Add some regular dividends
        for yr in years:
            if stock.listing_date.year <= yr and (not stock.delisting_date or stock.delisting_date.year >= yr):
                actions.append(CorporateAction(
                    stock_id=stock.id,
                    date=datetime.date(yr, 8, 15),
                    type="Dividend",
                    dividend_amount=round(random.uniform(2.0, 20.0), 2),
                    description=f"Annual Dividend FY{yr}"
                ))

        for act in actions:
            db.add(act)

        # Generate Price Observations
        # Starting base price: High for TCS/Reliance, low for SMEs
        base_price = 150.0 if not stock.is_sme else 15.0
        if stock.symbol in ["TCS", "INFY"]:
            base_price = 400.0
        elif stock.symbol == "HDFCBANK":
            base_price = 250.0

        daily_prices_batch = []
        adj_prices_batch = []
        ratios_daily_batch = []
        factor_scores_batch = []
        ratios_quarterly_batch = []

        price = base_price
        
        # Compute adjustment multiplier tracking
        # We start with adjustment factor = 1.0 at end_date and go backwards,
        # or start with 1.0 and multiply/divide when actions occur.
        # Let's calculate the cumulative adjustment factor for each trading date.
        # For simplicity:
        # A split/bonus reduces the historical adjusted price.
        # Let's build a timeline of multipliers.
        action_multipliers = [] # list of (date, multiplier)
        for act in actions:
            if act.type in ["Split", "Bonus"]:
                # ratio_to / ratio_from is the multiplier (e.g. 2.0).
                # Historical prices BEFORE act.date must be divided by this multiplier.
                action_multipliers.append((act.date, act.ratio_to / act.ratio_from))

        for dt in trading_dates:
            # Check listing constraints
            if dt < stock.listing_date:
                continue
            if stock.delisting_date and dt > stock.delisting_date:
                continue

            # Random walk price step
            drift = 0.0015  # positive bias
            vol = 0.035
            price = price * (1.0 + random.normalvariate(drift, vol))
            price = max(1.0, round(price, 2))

            # Apply splits/bonuses to compute "adjusted_price"
            # Cumulative multiplier = product of all future action multipliers
            # (since actions affect past prices)
            cum_factor = 1.0
            for act_date, mult in action_multipliers:
                if dt < act_date:
                    cum_factor /= mult

            adj_close = round(price * cum_factor, 2)
            adj_open = round(price * cum_factor * random.uniform(0.98, 1.02), 2)
            adj_high = round(max(adj_open, adj_close) * random.uniform(1.0, 1.03), 2)
            adj_low = round(min(adj_open, adj_close) * random.uniform(0.97, 1.0), 2)

            raw_open = round(price * random.uniform(0.98, 1.02), 2)
            raw_high = round(max(raw_open, price) * random.uniform(1.0, 1.03), 2)
            raw_low = round(min(raw_open, price) * random.uniform(0.97, 1.0), 2)

            vol_val = int(random.uniform(50000, 1500000) if not stock.is_sme else random.uniform(500, 15000))
            del_vol = int(vol_val * random.uniform(0.35, 0.75))
            del_pct = round((del_vol / vol_val) * 100.0, 2)
            turnover_val = round((price * vol_val) / 100000.0, 2) # in ₹ Lakhs

            # Create price records
            daily_prices_batch.append(DailyPrice(
                stock_id=stock.id,
                date=dt,
                open=raw_open,
                high=raw_high,
                low=raw_low,
                close=price,
                volume=float(vol_val),
                delivery_volume=float(del_vol),
                delivery_pct=del_pct,
                turnover=turnover_val,
                vwap=round((raw_open + raw_high + raw_low + price) / 4.0, 2)
            ))

            adj_prices_batch.append(AdjustedPrice(
                stock_id=stock.id,
                date=dt,
                open=adj_open,
                high=adj_high,
                low=adj_low,
                close=adj_close,
                volume=float(vol_val * (1.0 / cum_factor)),
                vwap=round((adj_open + adj_high + adj_low + adj_close) / 4.0, 2),
                adjustment_factor=cum_factor
            ))

            # Ratios daily (PE, PB, EV/Sales, FCF yield)
            # Find the latest available financial statement based on point-in-time
            # i.e., publication/announcement date must be <= dt
            active_annual = None
            for fa in annual_financials:
                if fa.publication_date <= dt:
                    if active_annual is None or fa.date > active_annual.date:
                        active_annual = fa
            
            active_quarterly = None
            for fq in quarterly_financials:
                if fq.announcement_date <= dt:
                    if active_quarterly is None or fq.date > active_quarterly.date:
                        active_quarterly = fq

            # Compute daily ratios
            pe_val = None
            pb_val = None
            ev_ebitda_val = None
            fcf_yield_val = None
            dividend_yield_val = None

            if active_annual:
                eps_ann = active_annual.eps
                pe_val = round(price / eps_ann, 2) if eps_ann and eps_ann > 0 else None
                
                book_val = (active_annual.equity_share_capital + active_annual.reserves) / (stock.market_cap / 100.0) if stock.market_cap > 0 else 10.0
                pb_val = round(price / book_val, 2) if book_val > 0 else None
                
                # EV = Market Cap + Debt - Cash
                mcap_dt = (price * (stock.market_cap / 10.0)) / 1000.0 # simple proxy
                ev = mcap_dt + active_annual.total_debt - active_annual.cash_equivalents
                ev_ebitda_val = round(ev / active_annual.ebitda, 2) if active_annual.ebitda and active_annual.ebitda > 0 else None
                
                fcf_yield_val = round((active_annual.free_cash_flow / mcap_dt) * 100.0, 2) if mcap_dt > 0 else None
                dividend_yield_val = round((active_annual.dividend_paid / mcap_dt) * 100.0, 2) if mcap_dt > 0 else None

            ratios_daily_batch.append(RatiosDaily(
                stock_id=stock.id,
                date=dt,
                pe=pe_val,
                pb=pb_val,
                ev_ebitda=ev_ebitda_val,
                ev_sales=round(ev / active_annual.sales, 2) if active_annual and active_annual.sales and ev else None,
                mc_sales=round(stock.market_cap / active_annual.sales, 2) if active_annual and active_annual.sales else None,
                price_cfo=round(price / (active_annual.operating_cash_flow / 10.0), 2) if active_annual and active_annual.operating_cash_flow and active_annual.operating_cash_flow > 0 else None,
                price_fcf=round(price / (active_annual.free_cash_flow / 10.0), 2) if active_annual and active_annual.free_cash_flow and active_annual.free_cash_flow > 0 else None,
                dividend_yield=dividend_yield_val,
                fcf_yield=fcf_yield_val
            ))

            # Compute Quarterly Ratios (ROE, ROCE, Debt/Equity, Margins)
            roce_base = 24.0 if stock.symbol in ["TCS", "INFY", "HDFCBANK", "RELIANCE"] else 14.0
            roce_val = round(roce_base + random.uniform(-3.0, 5.0), 2)
            roe_val = round(roce_val * 0.85, 2)
            debt_eq_val = round(random.uniform(0.1, 0.4) if not stock.is_sme else random.uniform(0.3, 0.8), 2)
            ebitda_margin_val = round(ebitda_margin * 100.0, 2)

            ratios_quarterly_batch.append(RatiosQuarterly(
                stock_id=stock.id,
                date=dt,
                roe=roe_val,
                roce=roce_val,
                roa=round(roe_val * 0.6, 2),
                ebitda_margin=ebitda_margin_val,
                pat_margin=round((active_annual.pat / active_annual.sales) * 100.0, 2) if active_annual and active_annual.sales else None,
                debt_equity=debt_eq_val,
                interest_coverage=round(active_annual.ebit / active_annual.finance_cost, 2) if active_annual and active_annual.finance_cost and active_annual.finance_cost > 0 else None,
                current_ratio=round((cash_yr + inventory_yr + receivables_yr) / payables_yr, 2) if payables_yr > 0 else None,
                quick_ratio=round((cash_yr + receivables_yr) / payables_yr, 2) if payables_yr > 0 else None,
                sales_cagr_3y=round(cagr_sales * 100.0, 2), # proxy
                pat_cagr_3y=round(cagr_sales * 100.0 * 1.1, 2), # proxy
                working_capital=round(inventory_yr + receivables_yr - payables_yr, 2)
            ))

            # Factor scores (Quality, Growth, Value, Momentum, Risk, Ownership, Governance, Composite)
            # Make momentum fluctuate dynamically based on random walk return,
            # and other metrics stable
            mom_score = round(50.0 + random.uniform(-15.0, 35.0) + (price / base_price - 1.0) * 10.0, 2)
            mom_score = max(0.0, min(100.0, mom_score))

            qual_score = round(60.0 + (roce_val if roce_val else 10.0) * 0.8 - (debt_eq_val if debt_eq_val else 0.5) * 5.0, 2)
            qual_score = max(0.0, min(100.0, qual_score))

            gro_score = round(40.0 + cagr_sales * 200.0 + random.uniform(-5.0, 10.0), 2)
            gro_score = max(0.0, min(100.0, gro_score))

            val_score = round(100.0 - (pe_val if pe_val else 25.0) * 0.8, 2)
            val_score = max(0.0, min(100.0, val_score))

            risk_score = round(30.0 + (debt_eq_val if debt_eq_val else 0.5) * 20.0, 2) # lower is better risk, wait! "Risk Score: Volatility, drawdown, debt, pledge, liquidity". Let's say higher score is higher health (lower risk).
            risk_score = max(0.0, min(100.0, risk_score))

            own_score = round(50.0 + random.uniform(-10.0, 10.0), 2)
            gov_score = 95.0 if not stock.symbol == "OLD_TELE" else 40.0 # Governance issues for delisted stock
            
            comp_score = round(
                0.30 * qual_score +
                0.25 * gro_score +
                0.15 * val_score +
                0.20 * mom_score +
                0.10 * risk_score, 2
            )

            factor_scores_batch.append(FactorScores(
                stock_id=stock.id,
                date=dt,
                quality=qual_score,
                growth=gro_score,
                value=val_score,
                momentum=mom_score,
                risk=risk_score,
                ownership=own_score,
                governance=gov_score,
                composite=comp_score
            ))

        db.bulk_save_objects(daily_prices_batch)
        db.bulk_save_objects(adj_prices_batch)
        db.bulk_save_objects(ratios_daily_batch)
        db.bulk_save_objects(ratios_quarterly_batch)
        db.bulk_save_objects(factor_scores_batch)

        db.commit()
        print(f"Generated complete point-in-time data for {stock.symbol}.")

    # Add Default Screens & Strategies
    s1 = Screen(
        name="Quality ROCE Compounders",
        description="Companies with ROCE > 18%, low debt, and positive growth.",
        formula_json={
            "rules": [
                {"field": "roce", "op": ">", "val": 18},
                {"field": "debt_equity", "op": "<", "val": 0.75},
                {"field": "sales_cagr_3y", "op": ">", "val": 12}
            ]
        }
    )
    db.add(s1)

    s2 = Screen(
        name="Value Buy-backs & Dividends",
        description="Low PE ratios and strong dividend yields.",
        formula_json={
            "rules": [
                {"field": "pe", "op": "<", "val": 25},
                {"field": "dividend_yield", "op": ">", "val": 2.0}
            ]
        }
    )
    db.add(s2)

    default_strat = Strategy(
        name="Quality Growth Momentum India",
        description="The default flagship Indian equity quant model: Top 25 stocks ranked by composite score with strict exits.",
        config_json={
            "universe": {
                "min_market_cap": 500.0,  # ₹500 Crores
                "exclude_financials": False,
                "exclude_psus": False,
                "sme_allowed": True
            },
            "filters": [
                {"field": "roce", "op": ">", "val": 18.0},
                {"field": "sales_cagr_3y", "op": ">", "val": 12.0},
                {"field": "pat_cagr_3y", "op": ">", "val": 15.0},
                {"field": "debt_equity", "op": "<", "val": 0.75}
            ],
            "ranking": {
                "quality": 30,
                "growth": 25,
                "value": 15,
                "momentum": 20,
                "risk": 10
            },
            "portfolio": {
                "max_holdings": 25,
                "weight_type": "equal",
                "max_sector_exposure": 25.0,  # 25% max sector weight
                "rebalance_freq": "quarterly",
                "transaction_cost": 0.0025,   # 0.25%
                "slippage": 0.0025            # 0.25%
            },
            "exits": [
                {"field": "roce", "op": "<", "val": 12.0},
                {"field": "debt_equity", "op": ">", "val": 1.25}
            ]
        }
    )
    db.add(default_strat)
    db.commit()
    print("Database seeding completed successfully!")
