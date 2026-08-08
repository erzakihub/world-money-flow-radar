import datetime
from sqlalchemy.orm import Session
import pandas as pd
import numpy as np
from ..models import Stock, DailyPrice, AdjustedPrice, RatiosDaily, RatiosQuarterly, ShareholdingPattern, FactorScores

def run_screen_on_date(db: Session, rules: list, target_date: datetime.date) -> list:
    """
    Evaluates a set of screen rules on a specific historical date.
    Returns a list of matching Stock objects with their metrics.
    """
    # Fetch active stocks
    active_stocks = db.query(Stock).filter(
        Stock.listing_date <= target_date,
        (Stock.delisting_date == None) | (Stock.delisting_date >= target_date)
    ).all()

    if not active_stocks:
        return []

    stock_ids = [s.id for s in active_stocks]
    stock_map = {s.id: s for s in active_stocks}

    # Fetch prices on target date
    prices = db.query(AdjustedPrice).filter(
        AdjustedPrice.stock_id.in_(stock_ids),
        AdjustedPrice.date == target_date
    ).all()
    price_map = {p.stock_id: p.close for p in prices}

    # Fetch 200 DMAs on target date
    # 200 DMA requires past 200 trading days. Since we step weekly, 200 trading days is approx 40 weekly steps.
    date_280d_ago = target_date - datetime.timedelta(days=280)
    past_prices = db.query(AdjustedPrice).filter(
        AdjustedPrice.stock_id.in_(stock_ids),
        AdjustedPrice.date >= date_280d_ago,
        AdjustedPrice.date <= target_date
    ).order_by(AdjustedPrice.date.asc()).all()

    dma_map = {}
    temp_prices = {}
    for p in past_prices:
        if p.stock_id not in temp_prices:
            temp_prices[p.stock_id] = []
        temp_prices[p.stock_id].append(p.close)
    
    for sid, cls_list in temp_prices.items():
        if len(cls_list) >= 10:  # Require at least some history
            dma_map[sid] = float(np.mean(cls_list[-40:]))  # approx 40 steps = 200 days
        else:
            dma_map[sid] = cls_list[-1] if cls_list else 0.0

    # Fetch daily ratios
    ratios_d = db.query(RatiosDaily).filter(
        RatiosDaily.stock_id.in_(stock_ids),
        RatiosDaily.date == target_date
    ).all()
    rd_map = {r.stock_id: r for r in ratios_d}

    # Fetch quarterly ratios
    ratios_q = db.query(RatiosQuarterly).filter(
        RatiosQuarterly.stock_id.in_(stock_ids),
        RatiosQuarterly.date == target_date
    ).all()
    rq_map = {r.stock_id: r for r in ratios_q}

    # Fetch shareholding patterns
    shareholdings = db.query(ShareholdingPattern).filter(
        ShareholdingPattern.stock_id.in_(stock_ids),
        ShareholdingPattern.date <= target_date
    ).order_by(ShareholdingPattern.date.desc()).all()
    sh_map = {}
    for sh in shareholdings:
        if sh.stock_id not in sh_map:
            sh_map[sh.stock_id] = sh

    # Fetch factor scores
    factors = db.query(FactorScores).filter(
        FactorScores.stock_id.in_(stock_ids),
        FactorScores.date == target_date
    ).all()
    f_map = {f.stock_id: f for f in factors}

    # Build DataFrame
    rows = []
    for sid in stock_ids:
        s = stock_map[sid]
        p_val = price_map.get(sid, 0.0)
        dma_val = dma_map.get(sid, 0.0)
        rd = rd_map.get(sid)
        rq = rq_map.get(sid)
        sh = sh_map.get(sid)
        fc = f_map.get(sid)

        rows.append({
            "stock_id": sid,
            "symbol": s.symbol,
            "name": s.company_name,
            "sector": s.sector,
            "industry": s.industry,
            "is_sme": s.is_sme,
            "market_cap": s.market_cap if s.market_cap else 0.0,
            "price": p_val,
            "dma_200": dma_val,
            "price_above_dma200": 1.0 if p_val > dma_val else 0.0,
            
            # Fundamentals & Ratios
            "pe": rd.pe if rd and rd.pe is not None else 999.0,
            "pb": rd.pb if rd and rd.pb is not None else 999.0,
            "ev_ebitda": rd.ev_ebitda if rd and rd.ev_ebitda is not None else 999.0,
            "dividend_yield": rd.dividend_yield if rd and rd.dividend_yield is not None else 0.0,
            "fcf_yield": rd.fcf_yield if rd and rd.fcf_yield is not None else 0.0,
            
        "roce": rq.roce if rq and rq.roce is not None else 0.0,
            "roe": rq.roe if rq and rq.roe is not None else 0.0,
            "debt_equity": rq.debt_equity if rq and rq.debt_equity is not None else 99.0,
            "sales_cagr_3y": rq.sales_cagr_3y if rq and rq.sales_cagr_3y is not None else 0.0,
            "pat_cagr_3y": rq.pat_cagr_3y if rq and rq.pat_cagr_3y is not None else 0.0,
            
            # Advanced metrics
            "gross_block": rq.gross_block if rq and rq.gross_block is not None else 0.0,
            "net_block": rq.net_block if rq and rq.net_block is not None else 0.0,
            "cwip": rq.cwip if rq and rq.cwip is not None else 0.0,
            "depreciation": rq.depreciation if rq and rq.depreciation is not None else 0.0,
            "operating_cash_flow": rq.operating_cash_flow if rq and rq.operating_cash_flow is not None else 0.0,
            "free_cash_flow": rq.free_cash_flow if rq and rq.free_cash_flow is not None else 0.0,
            "cash_conversion_cycle": rq.cash_conversion_cycle if rq and rq.cash_conversion_cycle is not None else 0.0,
            "piotroski_f_score": rq.piotroski_f_score if rq and rq.piotroski_f_score is not None else 0,
            "altman_z_score": rq.altman_z_score if rq and rq.altman_z_score is not None else 0.0,
            "sloan_ratio": rq.sloan_ratio if rq and rq.sloan_ratio is not None else 0.0,
            
            # Shareholdings
            "promoter_pct": sh.promoter_pct if sh else 0.0,
            "pledged_promoter_pct": sh.pledged_promoter_pct if sh else 0.0,
            "fii_pct": sh.fii_pct if sh else 0.0,
            "dii_pct": sh.dii_pct if sh else 0.0,
            "inst_pct": (sh.fii_pct + sh.dii_pct) if sh else 0.0,
            
            # Factors
            "quality_score": fc.quality if fc else 0.0,
            "growth_score": fc.growth if fc else 0.0,
            "value_score": fc.value if fc else 0.0,
            "momentum_score": fc.momentum if fc else 0.0,
            "risk_score": fc.risk if fc else 0.0,
            "composite_score": fc.composite if fc else 0.0
        })

    df = pd.DataFrame(rows)
    if df.empty:
        return []

    # Filter evaluation
    mask = pd.Series(True, index=df.index)
    for rule in rules:
        field = rule.get("field")
        op = rule.get("op")
        val = rule.get("val")

        if field not in df.columns:
            continue

        try:
            val_num = float(val)
        except (ValueError, TypeError):
            val_num = val

        if op == ">":
            mask &= (df[field] > val_num)
        elif op == "<":
            mask &= (df[field] < val_num)
        elif op == ">=":
            mask &= (df[field] >= val_num)
        elif op == "<=":
            mask &= (df[field] <= val_num)
        elif op == "==":
            mask &= (df[field] == val_num)
        elif op == "!=":
            mask &= (df[field] != val_num)

    matched_df = df[mask]
    
    # Format return list
    results = []
    for _, r in matched_df.iterrows():
        results.append({
            "stock_id": int(r["stock_id"]),
            "symbol": r["symbol"],
            "name": r["name"],
            "sector": r["sector"],
            "industry": r["industry"],
            "price": float(r["price"]),
            "market_cap": float(r["market_cap"]),
            "pe": float(r["pe"]) if r["pe"] != 999.0 else None,
            "roce": float(r["roce"]),
            "debt_equity": float(r["debt_equity"]) if r["debt_equity"] != 99.0 else None,
            "sales_cagr_3y": float(r["sales_cagr_3y"]),
            "pat_cagr_3y": float(r["pat_cagr_3y"]),
            "composite_score": float(r["composite_score"]),
            "price_above_dma200": bool(r["price_above_dma200"])
        })

    return results
