import datetime
from sqlalchemy.orm import Session
import pandas as pd
import numpy as np
from ..models import Stock, AdjustedPrice, RatiosDaily, RatiosQuarterly, ShareholdingPattern, FactorScores, BacktestRun
from .factor_engine import rebuild_factors_for_date

def run_strategy_backtest(db: Session, strategy_config: dict, start_date: datetime.date, end_date: datetime.date) -> dict:
    """
    Runs a point-in-time backtest for a strategy over the specified date range.
    """
    # Universe constraints
    univ_cfg = strategy_config.get("universe", {})
    min_mcap = univ_cfg.get("min_market_cap", 500.0)
    sme_allowed = univ_cfg.get("sme_allowed", True)

    # Rebalance frequency (in weeks)
    freq = strategy_config.get("portfolio", {}).get("rebalance_freq", "quarterly")
    step_weeks = 13 if freq == "quarterly" else (4 if freq == "monthly" else 52)
    
    # Portfolio constraints
    max_holdings = strategy_config.get("portfolio", {}).get("max_holdings", 25)
    max_sector_exp = strategy_config.get("portfolio", {}).get("max_sector_exposure", 25.0)
    max_stocks_per_sector = int((max_sector_exp / 100.0) * max_holdings)
    if max_stocks_per_sector < 1:
        max_stocks_per_sector = 1

    # Costs
    tx_cost_pct = strategy_config.get("portfolio", {}).get("transaction_cost", 0.0025)
    slippage_pct = strategy_config.get("portfolio", {}).get("slippage", 0.0025)
    total_drag = tx_cost_pct + slippage_pct

    # Exits configuration
    exit_cfg = strategy_config.get("exits", [])

    # Fetch all weekly trading dates from adjusted_prices in range
    all_dates = db.query(AdjustedPrice.date).distinct().filter(
        AdjustedPrice.date >= start_date,
        AdjustedPrice.date <= end_date
    ).order_by(AdjustedPrice.date.asc()).all()
    trading_dates = [d[0] for d in all_dates]

    if not trading_dates:
        return {"error": "No trading dates found in the specified range."}

    # Initial Portfolio Setup
    initial_capital = 10000000.0  # 1 Crore
    cash = initial_capital
    portfolio_value = initial_capital
    
    # Holdings format: {stock_id: {"qty": float, "buy_price": float, "entry_date": date, "sector": str, "dma_breaches": int}}
    holdings = {}
    
    trade_log = []
    daily_equity_curve = []
    rebalance_dates_log = []
    
    # Track benchmark Nifty 500 (we simulate a stable benchmark index)
    bench_price_start = 1000.0
    bench_price = bench_price_start
    
    # Main date loop
    for idx, dt in enumerate(trading_dates):
        # 1. Fetch current prices for active stock holdings on this date
        current_prices = {}
        if holdings:
            prices_curr = db.query(AdjustedPrice).filter(
                AdjustedPrice.stock_id.in_(list(holdings.keys())),
                AdjustedPrice.date == dt
            ).all()
            current_prices = {p.stock_id: p.close for p in prices_curr}
            
        # Update portfolio value
        assets_value = 0.0
        for sid, h in list(holdings.items()):
            # Handle case where stock might have been suspended or missing price on a day
            cls_price = current_prices.get(sid, h["buy_price"])
            assets_value += h["qty"] * cls_price
        
        portfolio_value = cash + assets_value
        
        # Simulate benchmark Nifty 500 walk
        # Roughly matches market movement (growth of ~12% CAGR with some random walk volatility)
        bench_price = bench_price * (1.0 + (0.12/52.0) + random.normalvariate(0.0, 0.025))
        
        daily_equity_curve.append({
            "date": dt.strftime("%Y-%m-%d"),
            "portfolio_value": round(portfolio_value, 2),
            "cash": round(cash, 2),
            "benchmark_value": round((bench_price / bench_price_start) * initial_capital, 2)
        })

        # 2. Check Rebalance Date
        is_rebalance_date = (idx % step_weeks == 0) or (idx == len(trading_dates) - 1)
        if not is_rebalance_date:
            continue

        # Trigger rebalance
        rebalance_dates_log.append(dt.strftime("%Y-%m-%d"))

        # Re-fetch active stocks for this date
        active_stocks = db.query(Stock).filter(
            Stock.listing_date <= dt,
            (Stock.delisting_date == None) | (Stock.delisting_date >= dt)
        ).all()
        stock_ids = [s.id for s in active_stocks]
        stock_map = {s.id: s for s in active_stocks}

        # Load price data for DMA checks
        date_280d_ago = dt - datetime.timedelta(days=280)
        past_prices = db.query(AdjustedPrice).filter(
            AdjustedPrice.stock_id.in_(stock_ids),
            AdjustedPrice.date >= date_280d_ago,
            AdjustedPrice.date <= dt
        ).order_by(AdjustedPrice.date.asc()).all()
        
        dma_map = {}
        temp_prices = {}
        for p in past_prices:
            if p.stock_id not in temp_prices:
                temp_prices[p.stock_id] = []
            temp_prices[p.stock_id].append(p.close)
        for sid, cls_list in temp_prices.items():
            dma_map[sid] = float(np.mean(cls_list[-40:])) if len(cls_list) >= 10 else cls_list[-1]

        # Fetch quarterly financials/ratios
        ratios_q = db.query(RatiosQuarterly).filter(
            RatiosQuarterly.stock_id.in_(stock_ids),
            RatiosQuarterly.date == dt
        ).all()
        rq_map = {r.stock_id: r for r in ratios_q}

        # Fetch shareholdings
        shareholdings = db.query(ShareholdingPattern).filter(
            ShareholdingPattern.stock_id.in_(stock_ids),
            ShareholdingPattern.date <= dt
        ).order_by(ShareholdingPattern.date.desc()).all()
        sh_map = {}
        for sh in shareholdings:
            if sh.stock_id not in sh_map:
                sh_map[sh.stock_id] = sh

        # Fetch latest factors
        factors = db.query(FactorScores).filter(
            FactorScores.stock_id.in_(stock_ids),
            FactorScores.date == dt
        ).all()
        f_map = {f.stock_id: f for f in factors}

        # Create active prices mapping
        prices_rebal = db.query(AdjustedPrice).filter(
            AdjustedPrice.stock_id.in_(stock_ids),
            AdjustedPrice.date == dt
        ).all()
        rebal_prices_map = {p.stock_id: p.close for p in prices_rebal}

        # 3. Process Exits
        exited_ids = []
        for sid, h in list(holdings.items()):
            s = stock_map.get(sid)
            rq = rq_map.get(sid)
            sh = sh_map.get(sid)
            p_cls = rebal_prices_map.get(sid, h["buy_price"])
            dma_200 = dma_map.get(sid, 0.0)

            # Check delisting
            if s is None or (s.delisting_date and dt >= s.delisting_date):
                exited_ids.append((sid, "Delisted"))
                continue

            # Build comprehensive metrics dictionary for evaluating rules
            metrics_dict = {
                "price": p_cls,
                "market_cap": s.market_cap if s.market_cap else 0.0,
                "is_sme": s.is_sme,
                "roce": rq.roce if rq and rq.roce is not None else 0.0,
                "roe": rq.roe if rq and rq.roe is not None else 0.0,
                "roa": rq.roa if rq and rq.roa is not None else 0.0,
                "ebitda_margin": rq.ebitda_margin if rq and rq.ebitda_margin is not None else 0.0,
                "pat_margin": rq.pat_margin if rq and rq.pat_margin is not None else 0.0,
                "debt_equity": rq.debt_equity if rq and rq.debt_equity is not None else 99.0,
                "interest_coverage": rq.interest_coverage if rq and rq.interest_coverage is not None else 0.0,
                "current_ratio": rq.current_ratio if rq and rq.current_ratio is not None else 0.0,
                "quick_ratio": rq.quick_ratio if rq and rq.quick_ratio is not None else 0.0,
                "sales_cagr_3y": rq.sales_cagr_3y if rq and rq.sales_cagr_3y is not None else 0.0,
                "pat_cagr_3y": rq.pat_cagr_3y if rq and rq.pat_cagr_3y is not None else 0.0,
                "working_capital": rq.working_capital if rq and rq.working_capital is not None else 0.0,
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
                "promoter_pct": sh.promoter_pct if sh else 50.0,
                "pledged_promoter_pct": sh.pledged_promoter_pct if sh else 0.0,
                "fii_pct": sh.fii_pct if sh else 0.0,
                "dii_pct": sh.dii_pct if sh else 0.0,
                "inst_pct": (sh.fii_pct + sh.dii_pct) if sh else 0.0,
                "dma_200": dma_200,
                "price_above_dma200": 1.0 if p_cls > dma_200 else 0.0
            }

            exit_triggered = False
            exit_reason = ""

            # Check user-configured dynamic exits first
            if exit_cfg:
                for rule in exit_cfg:
                    field = rule.get("field")
                    op = rule.get("op")
                    val = rule.get("val")
                    if field not in metrics_dict:
                        continue
                    try:
                        val_num = float(val)
                    except (ValueError, TypeError):
                        val_num = val
                    m_val = metrics_dict[field]
                    if m_val is None:
                        continue
                    
                    triggered = False
                    if op == ">" and m_val > val_num: triggered = True
                    elif op == "<" and m_val < val_num: triggered = True
                    elif op == ">=" and m_val >= val_num: triggered = True
                    elif op == "<=" and m_val <= val_num: triggered = True
                    elif op == "==" and m_val == val_num: triggered = True
                    elif op == "!=" and m_val != val_num: triggered = True
                    
                    if triggered:
                        exit_triggered = True
                        exit_reason = f"Exit rule met: {field} {op} {val}"
                        break
            else:
                # Default hardcoded exits fallback
                roce_val = metrics_dict["roce"]
                if roce_val < 12.0:
                    exit_triggered = True
                    exit_reason = "ROCE below 12%"

                debt_eq = metrics_dict["debt_equity"]
                if debt_eq > 1.25:
                    exit_triggered = True
                    exit_reason = "Debt/equity above 1.25"

                pledge = metrics_dict["pledged_promoter_pct"]
                if pledge > 10.0:
                    exit_triggered = True
                    exit_reason = "Promoter pledge above 10%"
            if exit_triggered:
                exited_ids.append((sid, exit_reason))

        # Perform sales
        for sid, reason in exited_ids:
            h = holdings.pop(sid)
            s_cls = rebal_prices_map.get(sid, h["buy_price"])
            proceeds = h["qty"] * s_cls
            net_proceeds = proceeds * (1.0 - total_drag)
            cash += net_proceeds
            
            pnl_amt = net_proceeds - (h["qty"] * h["buy_price"])
            pnl_pct = (s_cls / h["buy_price"] - 1.0) * 100.0

            trade_log.append({
                "date": dt.strftime("%Y-%m-%d"),
                "symbol": stock_map[sid].symbol,
                "type": "SELL",
                "qty": int(h["qty"]),
                "price": round(s_cls, 2),
                "cost": round(proceeds * tx_cost_pct, 2),
                "slippage": round(proceeds * slippage_pct, 2),
                "pnl_amount": round(pnl_amt, 2),
                "pnl_percent": round(pnl_pct, 2),
                "reason": reason,
                "holding_days": (dt - h["entry_date"]).days
            })

        # 4. Select New Entries
        # Re-evaluate strategy entry filters
        eligible_stocks = []
        
        # User defined ranking weights
        ranking_weights = strategy_config.get("ranking", {})
        
        for sid in stock_ids:
            # Skip held positions
            if sid in holdings:
                continue

            s = stock_map[sid]
            rq = rq_map.get(sid)
            sh = sh_map.get(sid)
            p_cls = rebal_prices_map.get(sid, 0.0)
            dma_200 = dma_map.get(sid, 0.0)
            fc = f_map.get(sid)

            if p_cls <= 0.0:
                continue
            if s.market_cap < min_mcap:
                continue
            if s.is_sme and not sme_allowed:
                continue

            # Build comprehensive metrics dictionary
            metrics_dict = {
                "price": p_cls,
                "market_cap": s.market_cap if s.market_cap else 0.0,
                "is_sme": s.is_sme,
                "roce": rq.roce if rq and rq.roce is not None else 0.0,
                "roe": rq.roe if rq and rq.roe is not None else 0.0,
                "roa": rq.roa if rq and rq.roa is not None else 0.0,
                "ebitda_margin": rq.ebitda_margin if rq and rq.ebitda_margin is not None else 0.0,
                "pat_margin": rq.pat_margin if rq and rq.pat_margin is not None else 0.0,
                "debt_equity": rq.debt_equity if rq and rq.debt_equity is not None else 99.0,
                "interest_coverage": rq.interest_coverage if rq and rq.interest_coverage is not None else 0.0,
                "current_ratio": rq.current_ratio if rq and rq.current_ratio is not None else 0.0,
                "quick_ratio": rq.quick_ratio if rq and rq.quick_ratio is not None else 0.0,
                "sales_cagr_3y": rq.sales_cagr_3y if rq and rq.sales_cagr_3y is not None else 0.0,
                "pat_cagr_3y": rq.pat_cagr_3y if rq and rq.pat_cagr_3y is not None else 0.0,
                "working_capital": rq.working_capital if rq and rq.working_capital is not None else 0.0,
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
                "promoter_pct": sh.promoter_pct if sh else 50.0,
                "pledged_promoter_pct": sh.pledged_promoter_pct if sh else 0.0,
                "fii_pct": sh.fii_pct if sh else 0.0,
                "dii_pct": sh.dii_pct if sh else 0.0,
                "inst_pct": (sh.fii_pct + sh.dii_pct) if sh else 0.0,
                "dma_200": dma_200,
                "price_above_dma200": 1.0 if p_cls > dma_200 else 0.0
            }

            # Evaluate entry filters
            user_filters = strategy_config.get("filters", [])
            is_eligible = True
            
            if user_filters:
                for rule in user_filters:
                    field = rule.get("field")
                    op = rule.get("op")
                    val = rule.get("val")
                    if field not in metrics_dict:
                        continue
                    try:
                        val_num = float(val)
                    except (ValueError, TypeError):
                        val_num = val
                    m_val = metrics_dict[field]
                    if m_val is None:
                        is_eligible = False
                        break
                    
                    if op == ">" and not (m_val > val_num): is_eligible = False; break
                    elif op == "<" and not (m_val < val_num): is_eligible = False; break
                    elif op == ">=" and not (m_val >= val_num): is_eligible = False; break
                    elif op == "<=" and not (m_val <= val_num): is_eligible = False; break
                    elif op == "==" and not (m_val == val_num): is_eligible = False; break
                    elif op == "!=" and not (m_val != val_num): is_eligible = False; break
            else:
                # Hardcoded entry rules fallback
                roce = metrics_dict["roce"]
                sales_cagr = metrics_dict["sales_cagr_3y"]
                pat_cagr = metrics_dict["pat_cagr_3y"]
                debt_eq = metrics_dict["debt_equity"]
                pledge = metrics_dict["pledged_promoter_pct"]
                if not (roce > 18.0 and sales_cagr > 12.0 and pat_cagr > 15.0 and debt_eq < 0.75 and pledge <= 5.0 and p_cls > dma_200):
                    is_eligible = False

            if is_eligible:
                # Compute composite score dynamically based on user weights if provided
                if ranking_weights and fc:
                    comp = (
                        ranking_weights.get("quality", 0.30) * fc.quality +
                        ranking_weights.get("growth", 0.25) * fc.growth +
                        ranking_weights.get("value", 0.15) * fc.value +
                        ranking_weights.get("momentum", 0.20) * fc.momentum +
                        ranking_weights.get("risk", 0.10) * fc.risk
                    )
                else:
                    comp = fc.composite if fc else 50.0

                eligible_stocks.append({
                    "stock_id": sid,
                    "symbol": s.symbol,
                    "sector": s.sector,
                    "price": p_cls,
                    "composite": comp
                })

        # Sort eligible by composite score descending
        eligible_stocks.sort(key=lambda x: x["composite"], reverse=True)

        # 5. Buy entries matching weights & sector caps
        # Determine target sizing (equal weight)
        target_allocation = portfolio_value / max_holdings
        empty_slots = max_holdings - len(holdings)

        # Count current sector concentrations
        sector_counts = {}
        for h in holdings.values():
            sector_counts[h["sector"]] = sector_counts.get(h["sector"], 0) + 1

        for estock in eligible_stocks:
            if empty_slots <= 0:
                break

            sid = estock["stock_id"]
            sec = estock["sector"]

            # Enforce sector cap limit
            sec_count = sector_counts.get(sec, 0)
            if sec_count >= max_stocks_per_sector:
                continue # Skip to avoid over-concentration

            # Determine buy qty based on target allocation
            if cash < target_allocation:
                # Buy as much as possible with remaining cash
                buy_value = cash
            else:
                buy_value = target_allocation

            if buy_value <= 0:
                break

            price_w_drag = estock["price"] * (1.0 + total_drag)
            qty = buy_value / price_w_drag
            if qty < 1:
                continue

            # Deduct cash
            actual_cost = qty * price_w_drag
            cash -= actual_cost

            holdings[sid] = {
                "qty": qty,
                "buy_price": estock["price"],
                "entry_date": dt,
                "sector": sec,
                "dma_breaches": 0
            }

            sector_counts[sec] = sector_counts.get(sec, 0) + 1
            empty_slots -= 1

            trade_log.append({
                "date": dt.strftime("%Y-%m-%d"),
                "symbol": estock["symbol"],
                "type": "BUY",
                "qty": int(qty),
                "price": round(estock["price"], 2),
                "cost": round((qty * estock["price"]) * tx_cost_pct, 2),
                "slippage": round((qty * estock["price"]) * slippage_pct, 2),
                "pnl_amount": 0.0,
                "pnl_percent": 0.0,
                "reason": "Entry Filter Match",
                "holding_days": 0
            })

    # Prepare performance statistics
    df_curve = pd.DataFrame(daily_equity_curve)
    
    # Calculate performance metrics
    cagr = 0.0
    sharpe = 0.0
    max_dd = 0.0
    calmar = 0.0
    
    monthly_matrix = {}
    yearly_returns = {}
    win_rate = 0.0
    profit_factor = 1.0
    rolling_3y_list = []

    if not df_curve.empty:
        total_weeks = len(df_curve)
        years_dur = total_weeks / 52.0
        final_val = df_curve["portfolio_value"].iloc[-1]
        
        cagr = (final_val / initial_capital) ** (1.0 / years_dur) - 1.0 if years_dur > 0 else 0.0
        
        # Returns standard dev for Sharpe
        df_curve["return"] = df_curve["portfolio_value"].pct_change()
        std_dev = df_curve["return"].std() * np.sqrt(52)  # annualized
        mean_ret = df_curve["return"].mean() * 52
        sharpe = (mean_ret - 0.06) / std_dev if std_dev > 0 else 0.0 # 6% risk-free rate
        
        # Max Drawdown
        df_curve["peak"] = df_curve["portfolio_value"].cummax()
        df_curve["dd"] = (df_curve["portfolio_value"] - df_curve["peak"]) / df_curve["peak"]
        max_dd = df_curve["dd"].min()
        
        calmar = cagr / abs(max_dd) if max_dd != 0 else 0.0

        # Convert date to datetime index for pandas resample
        df_curve["dt"] = pd.to_datetime(df_curve["date"])
        df_temp = df_curve.set_index("dt")
        
        # Monthly returns matrix
        df_monthly = df_temp["portfolio_value"].resample("ME").last()
        df_monthly_pct = df_monthly.pct_change() * 100.0
        
        # Group by year
        for dt_val, val in df_monthly_pct.items():
            yr = dt_val.year
            month_idx = dt_val.month - 1 # 0-indexed
            if yr not in monthly_matrix:
                monthly_matrix[yr] = [0.0] * 12
            if not np.isnan(val):
                monthly_matrix[yr][month_idx] = round(val, 2)
                
        # First month return relative to initial capital
        if len(df_monthly) > 0:
            first_month_end = df_monthly.index[0]
            first_val = df_monthly.iloc[0]
            first_ret = (first_val / initial_capital - 1.0) * 100.0
            yr = first_month_end.year
            month_idx = first_month_end.month - 1
            if yr not in monthly_matrix:
                monthly_matrix[yr] = [0.0] * 12
            monthly_matrix[yr][month_idx] = round(first_ret, 2)

        # Yearly returns calculation
        df_yearly = df_temp["portfolio_value"].resample("YE").last()
        df_yearly_pct = df_yearly.pct_change() * 100.0
        for dt_val, val in df_yearly_pct.items():
            yr = dt_val.year
            if not np.isnan(val):
                yearly_returns[yr] = round(val, 2)
        if len(df_yearly) > 0:
            first_yr_end = df_yearly.index[0]
            first_yr_val = df_yearly.iloc[0]
            first_yr_ret = (first_yr_val / initial_capital - 1.0) * 100.0
            yearly_returns[first_yr_end.year] = round(first_yr_ret, 2)
            
        # 3-Year Rolling Returns (annualized CAGR over rolling 156 weeks)
        for i in range(156, len(df_curve)):
            val_now = df_curve["portfolio_value"].iloc[i]
            val_then = df_curve["portfolio_value"].iloc[i - 156]
            c_3y = (val_now / val_then) ** (1.0 / 3.0) - 1.0
            rolling_3y_list.append(round(c_3y * 100.0, 2))
            
        # Win rate and profit factor
        sell_trades = [t for t in trade_log if t["type"] == "SELL"]
        if sell_trades:
            wins = [t for t in sell_trades if t["pnl_amount"] > 0]
            win_rate = round((len(wins) / len(sell_trades)) * 100.0, 2)
            
            profits = sum(t["pnl_amount"] for t in sell_trades if t["pnl_amount"] > 0)
            losses = sum(abs(t["pnl_amount"]) for t in sell_trades if t["pnl_amount"] < 0)
            profit_factor = round(profits / losses, 2) if losses > 0 else (9.9 if profits > 0 else 1.0)

    avg_rolling_3y = round(float(np.mean(rolling_3y_list)), 2) if rolling_3y_list else None
    min_rolling_3y = round(float(np.min(rolling_3y_list)), 2) if rolling_3y_list else None
    max_rolling_3y = round(float(np.max(rolling_3y_list)), 2) if rolling_3y_list else None

    def sanitize_val(obj):
        if isinstance(obj, dict):
            return {str(k): sanitize_val(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [sanitize_val(v) for v in obj]
        elif isinstance(obj, (np.floating, np.number)):
            val = float(obj)
            return 0.0 if (np.isnan(val) or np.isinf(val)) else val
        elif isinstance(obj, float) and (np.isnan(obj) or np.isinf(obj)):
            return 0.0
        return obj

    raw_metrics = {
        "cagr": round(float(cagr * 100.0), 2),
        "sharpe": round(float(sharpe), 2),
        "max_drawdown": round(float(max_dd * 100.0), 2),
        "calmar": round(float(calmar), 2),
        "final_value": round(float(portfolio_value), 2),
        "total_trades": len(trade_log),
        "monthly_matrix": monthly_matrix,
        "yearly_returns": yearly_returns,
        "win_rate": float(win_rate),
        "profit_factor": float(profit_factor),
        "avg_rolling_3y": avg_rolling_3y,
        "min_rolling_3y": min_rolling_3y,
        "max_rolling_3y": max_rolling_3y
    }
    metrics = sanitize_val(raw_metrics)

    # Save to database
    run_log = BacktestRun(
        strategy_name=strategy_config.get("name", "Quality Growth Momentum"),
        parameters_json=strategy_config,
        metrics_json=metrics,
        trade_log_json=sanitize_val(trade_log),
        holdings_log_json=[{"symbol": stock_map[sid].symbol, "qty": float(h["qty"])} for sid, h in holdings.items() if sid in stock_map]
    )
    db.add(run_log)
    db.commit()

    return sanitize_val({
        "id": run_log.id,
        "metrics": metrics,
        "trade_log": trade_log,
        "equity_curve": daily_equity_curve,
        "rebalance_dates": rebalance_dates_log
    })

import random # for benchmark noise
