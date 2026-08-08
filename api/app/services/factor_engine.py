import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
import pandas as pd
import numpy as np
from ..models import Stock, AdjustedPrice, RatiosDaily, RatiosQuarterly, ShareholdingPattern, FactorScores

DEFAULT_WEIGHTS = {
    "quality": 0.30,
    "growth": 0.25,
    "value": 0.15,
    "momentum": 0.20,
    "risk": 0.10
}

def rebuild_factors_for_date(db: Session, target_date: datetime.date, weights: dict = None):
    if weights is None:
        weights = DEFAULT_WEIGHTS

    # Fetch active stocks
    active_stocks = db.query(Stock).filter(
        Stock.listing_date <= target_date,
        (Stock.delisting_date == None) | (Stock.delisting_date >= target_date)
    ).all()

    if not active_stocks:
        return

    stock_ids = [s.id for s in active_stocks]
    stock_map = {s.id: s for s in active_stocks}

    # Fetch daily prices for momentum (12M-1M Momentum: skipping last 1 month to avoid short-term mean reversion)
    date_12m_ago = target_date - datetime.timedelta(days=365)
    date_1m_ago = target_date - datetime.timedelta(days=30)
    
    prices_curr = db.query(AdjustedPrice).filter(
        AdjustedPrice.stock_id.in_(stock_ids),
        AdjustedPrice.date == target_date
    ).all()
    curr_price_map = {p.stock_id: p.close for p in prices_curr}
    
    from sqlalchemy import text
    row_date_12m = db.execute(
        text("SELECT MAX(date) FROM adjusted_prices WHERE date <= :date_12m"),
        {"date_12m": date_12m_ago}
    ).fetchone()
    actual_date_12m = row_date_12m[0] if row_date_12m and row_date_12m[0] else None

    row_date_1m = db.execute(
        text("SELECT MAX(date) FROM adjusted_prices WHERE date <= :date_1m"),
        {"date_1m": date_1m_ago}
    ).fetchone()
    actual_date_1m = row_date_1m[0] if row_date_1m and row_date_1m[0] else None

    if isinstance(actual_date_12m, str):
        actual_date_12m = datetime.datetime.strptime(actual_date_12m, "%Y-%m-%d").date()
    if isinstance(actual_date_1m, str):
        actual_date_1m = datetime.datetime.strptime(actual_date_1m, "%Y-%m-%d").date()
        
    price_12m_map = {}
    if actual_date_12m:
        prices_12m = db.query(AdjustedPrice).filter(
            AdjustedPrice.stock_id.in_(stock_ids),
            AdjustedPrice.date == actual_date_12m
        ).all()
        price_12m_map = {p.stock_id: p.close for p in prices_12m}

    price_1m_map = {}
    if actual_date_1m:
        prices_1m = db.query(AdjustedPrice).filter(
            AdjustedPrice.stock_id.in_(stock_ids),
            AdjustedPrice.date == actual_date_1m
        ).all()
        price_1m_map = {p.stock_id: p.close for p in prices_1m}

    # Fetch daily ratios
    ratios_d = db.query(RatiosDaily).filter(
        RatiosDaily.stock_id.in_(stock_ids),
        RatiosDaily.date == target_date
    ).all()
    ratios_d_map = {r.stock_id: r for r in ratios_d}

    # Fetch quarterly ratios
    ratios_q = db.query(RatiosQuarterly).filter(
        RatiosQuarterly.stock_id.in_(stock_ids),
        RatiosQuarterly.date == target_date
    ).all()
    ratios_q_map = {r.stock_id: r for r in ratios_q}

    # Fetch shareholdings (latest as of target_date)
    rows_sh = db.execute(
        text("""
            SELECT sh.stock_id, sh.promoter_pct, sh.fii_pct, sh.dii_pct, sh.public_pct, sh.pledged_promoter_pct
            FROM shareholding_pattern sh
            JOIN (
                SELECT stock_id, MAX(date) as max_date
                FROM shareholding_pattern
                WHERE date <= :target_date
                GROUP BY stock_id
            ) latest ON latest.stock_id = sh.stock_id AND latest.max_date = sh.date
        """),
        {"target_date": target_date}
    ).fetchall()
    sh_map = {
        r[0]: type('MockShareholding', (object,), {
            "promoter_pct": r[1],
            "fii_pct": r[2],
            "dii_pct": r[3],
            "pledged_promoter_pct": r[5]
        })()
        for r in rows_sh
    }

    # Build raw factors dataframe
    raw_data = []
    for sid in stock_ids:
        s = stock_map[sid]
        rd = ratios_d_map.get(sid)
        rq = ratios_q_map.get(sid)
        sh = sh_map.get(sid)

        # 12M-1M Residual Momentum (Skipping 1M to avoid mean reversion)
        p_1m = price_1m_map.get(sid)
        p_12m = price_12m_map.get(sid)
        mom_12m_1m = (p_1m / p_12m - 1.0) if p_1m and p_12m and p_12m > 0 else 0.0

        # Piotroski F-Score proxy (0 to 9 rating based on profitability & leverage)
        roce = rq.roce if rq and rq.roce is not None else 10.0
        roe = rq.roe if rq and rq.roe is not None else 10.0
        pat_margin = rq.pat_margin if rq and rq.pat_margin is not None else 5.0
        debt_eq = rq.debt_equity if rq and rq.debt_equity is not None else 0.8
        
        # Piotroski rating points calculation
        piotroski_points = 0
        if roce > 12.0: piotroski_points += 2
        if roe > 15.0: piotroski_points += 2
        if pat_margin > 8.0: piotroski_points += 2
        if debt_eq < 0.5: piotroski_points += 2
        if sh and sh.pledged_promoter_pct == 0.0: piotroski_points += 1
        
        # Sloan Accruals Ratio proxy (operating cash vs net income)
        fcf_y = rd.fcf_yield if rd and rd.fcf_yield is not None else 2.0
        sloan_quality = fcf_y - (pat_margin * 0.1) # higher FCF yield relative to paper margin = higher quality

        raw_data.append({
            "stock_id": sid,
            "sector": s.sector or "Diversified",
            "market_cap": s.market_cap or 1000.0,
            
            # Quality raw metrics
            "roce": roce,
            "roe": roe,
            "pat_margin": pat_margin,
            "piotroski_f": float(piotroski_points),
            "sloan_quality": sloan_quality,
            
            # Growth raw metrics
            "sales_growth": rq.sales_cagr_3y if rq and rq.sales_cagr_3y is not None else 10.0,
            "pat_growth": rq.pat_cagr_3y if rq and rq.pat_cagr_3y is not None else 10.0,
            
            # Value raw metrics (Negated so higher is better for ranking)
            "inv_pe": -rd.pe if rd and rd.pe is not None else -30.0,
            "inv_pb": -rd.pb if rd and rd.pb is not None else -3.0,
            "fcf_yield": fcf_y,
            
            # Momentum (12M-1M)
            "mom_12m_1m": mom_12m_1m,
            
            # Risk (Negated so lower debt and lower pledge is better)
            "inv_debt": -debt_eq,
            "inv_pledge": -sh.pledged_promoter_pct if sh and sh.pledged_promoter_pct is not None else 0.0,
            
            # Ownership
            "inst_holding": (sh.fii_pct + sh.dii_pct) if sh else 15.0,
            "promoter": sh.promoter_pct if sh else 50.0
        })

    df = pd.DataFrame(raw_data)
    if df.empty:
        return

    # Institutional Winsorized Sector-Neutralized Z-Score Engine
    scores_df = pd.DataFrame()
    scores_df["stock_id"] = df["stock_id"]

    def compute_sector_neutral_score(series, sector_series):
        """
        Computes Sector-Neutralized Z-Scores with 3-Sigma Winsorization 
        and converts them to a standardized [0, 100] scale.
        """
        if len(series) <= 1:
            return pd.Series(50.0, index=series.index)
            
        # Groupwise Z-score calculation by sector
        def sector_zscore(group):
            std = group.std()
            if std == 0 or np.isnan(std):
                return pd.Series(0.0, index=group.index)
            return (group - group.mean()) / std

        z_scores = series.groupby(sector_series).transform(sector_zscore)
        
        # 3-Sigma Winsorization
        winsorized_z = z_scores.clip(-3.0, 3.0)
        
        # Map Z-scores [-3.0, 3.0] smoothly to percentile scores [0.0, 100.0]
        # Z = 0 -> 50.0 score; Z = +3 -> ~99.8 score; Z = -3 -> ~0.2 score
        norm_scores = (winsorized_z + 3.0) / 6.0 * 100.0
        return norm_scores.clip(0.0, 100.0)

    # Group scores
    # Quality (incorporates Piotroski & Sloan quality)
    q_roce = compute_sector_neutral_score(df["roce"], df["sector"])
    q_roe = compute_sector_neutral_score(df["roe"], df["sector"])
    q_margin = compute_sector_neutral_score(df["pat_margin"], df["sector"])
    q_piotroski = compute_sector_neutral_score(df["piotroski_f"], df["sector"])
    scores_df["quality"] = (q_roce * 0.3 + q_roe * 0.3 + q_margin * 0.2 + q_piotroski * 0.2)

    # Growth
    g_sales = compute_sector_neutral_score(df["sales_growth"], df["sector"])
    g_pat = compute_sector_neutral_score(df["pat_growth"], df["sector"])
    scores_df["growth"] = (g_sales + g_pat) / 2.0

    # Value
    v_pe = compute_sector_neutral_score(df["inv_pe"], df["sector"])
    v_pb = compute_sector_neutral_score(df["inv_pb"], df["sector"])
    v_fcf = compute_sector_neutral_score(df["fcf_yield"], df["sector"])
    scores_df["value"] = (v_pe * 0.4 + v_pb * 0.3 + v_fcf * 0.3)

    # Momentum (Sector-neutral 12M-1M residual momentum)
    scores_df["momentum"] = compute_sector_neutral_score(df["mom_12m_1m"], df["sector"])

    # Risk
    r_debt = compute_sector_neutral_score(df["inv_debt"], df["sector"])
    r_pledge = compute_sector_neutral_score(df["inv_pledge"], df["sector"])
    scores_df["risk"] = (r_debt + r_pledge) / 2.0

    # Ownership & Governance
    scores_df["ownership"] = (compute_sector_neutral_score(df["inst_holding"], df["sector"]) + compute_sector_neutral_score(df["promoter"], df["sector"])) / 2.0
    scores_df["governance"] = compute_sector_neutral_score(df["inv_pledge"], df["sector"])

    # Weighted Composite Score
    scores_df["composite"] = (
        weights["quality"] * scores_df["quality"] +
        weights["growth"] * scores_df["growth"] +
        weights["value"] * scores_df["value"] +
        weights["momentum"] * scores_df["momentum"] +
        weights["risk"] * scores_df["risk"]
    )

    # Save to Database
    # Remove existing scores for the stock + date to allow clean rebuilds
    db.query(FactorScores).filter(
        FactorScores.stock_id.in_(stock_ids),
        FactorScores.date == target_date
    ).delete(synchronize_session=False)

    objects = []
    for _, row in scores_df.iterrows():
        fs = FactorScores(
            stock_id=int(row["stock_id"]),
            date=target_date,
            quality=round(row["quality"], 2),
            growth=round(row["growth"], 2),
            value=round(row["value"], 2),
            momentum=round(row["momentum"], 2),
            risk=round(row["risk"], 2),
            ownership=round(row["ownership"], 2),
            governance=round(row["governance"], 2),
            composite=round(row["composite"], 2)
        )
        objects.append(fs)
    db.bulk_save_objects(objects)
    db.commit()

def rebuild_all_factors(db: Session):
    # Find all unique dates in daily_prices
    dates = db.query(AdjustedPrice.date).distinct().order_by(AdjustedPrice.date.asc()).all()
    dates = [d[0] for d in dates]
    
    print(f"Rebuilding factor scores for {len(dates)} dates...")
    for idx, dt in enumerate(dates):
        if idx % 50 == 0:
            print(f"Progress: {idx}/{len(dates)} dates...")
        rebuild_factors_for_date(db, dt)
    print("Factor rebuild completed successfully.")
