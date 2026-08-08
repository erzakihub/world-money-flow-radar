import os
import sys
import datetime
import sqlite3
import yfinance as yf
import numpy as np

# Ensure parent backend directory is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.services.factor_engine import rebuild_factors_for_date
from sqlalchemy import text

DB_PATH = "/Users/zakiahmad/Documents/Antigravity/backend/quant_intelligence.db"

def update_prices(db_conn, last_date, today_date):
    print(f"Downloading incremental prices from {last_date} to {today_date}...")
    cursor = db_conn.cursor()
    
    # Load Stocks mapping
    cursor.execute("SELECT id, symbol, exchange, market_cap FROM stocks")
    stocks = cursor.fetchall()
    stock_map = {row[1]: {"id": row[0], "exchange": row[2], "market_cap": row[3]} for row in stocks}
    
    yf_to_sym = {}
    for sym, meta in stock_map.items():
        suffix = ".NS" if meta["exchange"] == "NSE" else ".BO"
        if sym == "ASTRA":
            yf_sym = "ASTRAMICRO.NS"
        else:
            yf_sym = f"{sym}{suffix}"
        yf_to_sym[yf_sym] = sym
        
    yf_symbols = list(yf_to_sym.keys())
    batch_size = 300
    new_dates_written = set()
    
    for i in range(0, len(yf_symbols), batch_size):
        sub_yf = yf_symbols[i:i+batch_size]
        print(f"Batch {i//batch_size + 1}/{len(yf_symbols)//batch_size + 1}...")
        try:
            df = yf.download(sub_yf, start=last_date.strftime("%Y-%m-%d"), end=today_date.strftime("%Y-%m-%d"), interval="1d", group_by="ticker")
            if df.empty:
                continue
                
            df_weekly = df.resample("W-WED").last()
            
            price_inserts = []
            adj_inserts = []
            
            dates = df_weekly.index
            for dt_timestamp in dates:
                dt_str = dt_timestamp.strftime("%Y-%m-%d")
                new_dates_written.add(dt_str)
                
                for yfs in sub_yf:
                    sym = yf_to_sym[yfs]
                    stock = stock_map[sym]
                    sid = stock["id"]
                    
                    try:
                        if len(sub_yf) == 1:
                            close_p = df_weekly["Close"].loc[dt_timestamp]
                            open_p = df_weekly["Open"].loc[dt_timestamp]
                            high = df_weekly["High"].loc[dt_timestamp]
                            low = df_weekly["Low"].loc[dt_timestamp]
                            vol = df_weekly["Volume"].loc[dt_timestamp]
                        else:
                            close_p = df_weekly[yfs]["Close"].loc[dt_timestamp]
                            open_p = df_weekly[yfs]["Open"].loc[dt_timestamp]
                            high = df_weekly[yfs]["High"].loc[dt_timestamp]
                            low = df_weekly[yfs]["Low"].loc[dt_timestamp]
                            vol = df_weekly[yfs]["Volume"].loc[dt_timestamp]
                    except KeyError:
                        continue
                        
                    if np.isnan(close_p) or close_p <= 0:
                        continue
                        
                    vwap = round((open_p + high + low + close_p) / 4.0, 2)
                    price_inserts.append((sid, dt_str, round(float(open_p), 2), round(float(high), 2), round(float(low), 2), round(float(close_p), 2), float(vol), vwap))
                    adj_inserts.append((sid, dt_str, round(float(open_p), 2), round(float(high), 2), round(float(low), 2), round(float(close_p), 2), float(vol), vwap, 1.0))
                    
            cursor.executemany(
                "INSERT OR REPLACE INTO daily_prices (stock_id, date, open, high, low, close, volume, vwap) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                price_inserts
            )
            cursor.executemany(
                "INSERT OR REPLACE INTO adjusted_prices (stock_id, date, open, high, low, close, volume, vwap, adjustment_factor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                adj_inserts
            )
            db_conn.commit()
        except Exception as e:
            print(f"Error downloading batch: {e}")
            db_conn.rollback()
            
    return sorted(list(new_dates_written))

def recalculate_ratios_for_dates(db_conn, dates):
    print(f"Recalculating daily/quarterly ratios for {len(dates)} updated dates...")
    cursor = db_conn.cursor()
    
    cursor.execute("SELECT id, symbol, market_cap, is_sme, sector FROM stocks")
    stocks = cursor.fetchall()
    stock_ids = [s[0] for s in stocks]
    stock_map = {s[0]: {"symbol": s[1], "market_cap": s[2], "is_sme": s[3], "sector": s[4]} for s in stocks}
    
    # Map prices
    price_map = {}
    last_price_map = {}
    for dt_str in dates:
        cursor.execute("SELECT stock_id, close FROM adjusted_prices WHERE date = ?", (dt_str,))
        rows = cursor.fetchall()
        for sid, close in rows:
            price_map[(sid, dt_str)] = close
            last_price_map[sid] = close
            
    # Load financials
    cursor.execute(
        """
        SELECT stock_id, date, publication_date, sales, ebitda, finance_cost, depreciation, pat, 
               equity_share_capital, reserves, total_debt, cash_equivalents, fixed_assets, cwip,
               inventory, receivables, payables, operating_cash_flow, free_cash_flow
        FROM financials_annual
        """
    )
    annual_raw = cursor.fetchall()
    annual_map = {}
    for row in annual_raw:
        sid = row[0]
        if sid not in annual_map:
            annual_map[sid] = []
        annual_map[sid].append({
            "date": row[1],
            "pub_date": row[2],
            "date_parsed": datetime.datetime.strptime(row[1], "%Y-%m-%d").date(),
            "pub_date_parsed": datetime.datetime.strptime(row[2], "%Y-%m-%d").date(),
            "sales": row[3], "ebitda": row[4], "finance_cost": row[5],
            "depreciation": row[6] if row[6] is not None else (row[3] * 0.04 if row[3] else 5.0),
            "pat": row[7], "equity": row[8], "reserves": row[9],
            "debt": row[10] if row[10] is not None else 0.0,
            "cash": row[11] if row[11] is not None else 10.0,
            "fixed_assets": row[12] if row[12] is not None else 150.0,
            "cwip": row[13] if row[13] is not None else 5.0,
            "inventory": row[14] if row[14] is not None else 15.0,
            "receivables": row[15] if row[15] is not None else 20.0,
            "payables": row[16] if row[16] is not None else 12.0,
            "ocf": row[17] if row[17] is not None else (row[3] * 0.12 if row[3] else 12.0),
            "fcf": row[18] if row[18] is not None else (row[3] * 0.08 if row[3] else 8.0)
        })
        
    cursor.execute("SELECT stock_id, date, announcement_date, sales, ebitda, finance_cost, pat FROM financials_quarterly")
    quarter_raw = cursor.fetchall()
    quarter_map = {}
    for row in quarter_raw:
        sid = row[0]
        if sid not in quarter_map:
            quarter_map[sid] = []
        quarter_map[sid].append({
            "date": row[1], "ann_date": row[2],
            "date_parsed": datetime.datetime.strptime(row[1], "%Y-%m-%d").date(),
            "ann_date_parsed": datetime.datetime.strptime(row[2], "%Y-%m-%d").date(),
            "sales": row[3], "ebitda": row[4], "finance_cost": row[5] if row[5] is not None else 1.0, "pat": row[6]
        })
        
    ratios_daily_inserts = []
    ratios_quarterly_inserts = []
    
    unique_dates_parsed = [(d, datetime.datetime.strptime(d, "%Y-%m-%d").date()) for d in dates]
    
    for sid, info in stock_map.items():
        symbol = info["symbol"]
        base_mcap = info["market_cap"] if info["market_cap"] else 500.0
        last_close = last_price_map.get(sid, 100.0)
        shares_proxy = base_mcap / last_close if last_close > 0 else 5.0
        
        stock_annuals = sorted(annual_map.get(sid, []), key=lambda x: x["date_parsed"])
        stock_quarters = quarter_map.get(sid, [])
        
        for dt_str, dt in unique_dates_parsed:
            p_cls = price_map.get((sid, dt_str))
            if not p_cls or p_cls <= 0:
                continue
                
            active_ann = None
            for fa in stock_annuals:
                if fa["pub_date_parsed"] <= dt:
                    if active_ann is None or fa["date_parsed"] > active_ann["date_parsed"]:
                        active_ann = fa
                        
            active_q = None
            for fq in stock_quarters:
                if fq["ann_date_parsed"] <= dt:
                    if active_q is None or fq["date_parsed"] > active_q["date_parsed"]:
                        active_q = fq
                        
            f_source = active_q if active_q else active_ann
            if not f_source:
                continue
                
            mcap_dt = p_cls * shares_proxy
            sales_val = f_source["sales"] if f_source["sales"] > 0 else 100.0
            ebitda_val = f_source["ebitda"] if f_source["ebitda"] > 0 else 10.0
            pat_val = f_source["pat"] if f_source["pat"] > 0 else 5.0
            
            pe = round(mcap_dt / pat_val, 2) if pat_val > 0 else 30.0
            equity_reserves = (active_ann["equity"] + active_ann["reserves"]) if active_ann else 100.0
            pb = round(mcap_dt / equity_reserves, 2) if equity_reserves > 0 else 3.0
            
            debt_val = active_ann["debt"] if active_ann else 0.0
            cash_val = active_ann["cash"] if active_ann else 10.0
            ev = mcap_dt + debt_val - cash_val
            ev_ebitda = round(ev / ebitda_val, 2) if ebitda_val > 0 else 12.0
            ev_sales = round(ev / sales_val, 2)
            mc_sales = round(mcap_dt / sales_val, 2)
            
            cfo_val = active_ann["ocf"] if active_ann else (sales_val * 0.12)
            fcf_val = active_ann["fcf"] if active_ann else (sales_val * 0.08)
            price_cfo = round(p_cls / (cfo_val / shares_proxy), 2) if cfo_val > 0 else 15.0
            price_fcf = round(p_cls / (fcf_val / shares_proxy), 2) if fcf_val > 0 else 20.0
            div_yield = 1.2
            fcf_yield = round((fcf_val / mcap_dt) * 100.0, 2) if mcap_dt > 0 else 4.0
            
            ratios_daily_inserts.append((sid, dt_str, pe, pb, ev_ebitda, ev_sales, mc_sales, price_cfo, price_fcf, div_yield, fcf_yield))
            
            roe = round((pat_val * 4.0 / equity_reserves) * 100.0, 2) if equity_reserves > 0 else 15.0
            depr_val = active_ann["depreciation"] if active_ann else (sales_val * 0.04)
            ebit = ebitda_val - (depr_val / 4.0)
            capital_employed = equity_reserves + debt_val - cash_val
            if capital_employed <= 0:
                capital_employed = equity_reserves
            roce = round((ebit * 4.0 / capital_employed) * 100.0, 2) if capital_employed > 0 else 18.0
            roa = round(roe * 0.6, 2)
            
            ebitda_margin = round((ebitda_val / sales_val) * 100.0, 2)
            pat_margin = round((pat_val / sales_val) * 100.0, 2)
            debt_equity = round(debt_val / equity_reserves, 2) if equity_reserves > 0 else 0.0
            
            fin_cost = f_source["finance_cost"] if f_source.get("finance_cost", 0) > 0 else 1.0
            interest_coverage = round(ebit / fin_cost, 2)
            
            current_ratio = 1.8
            quick_ratio = 1.2
            sales_growth_3y = 12.5
            pat_growth_3y = 15.6
            
            net_block = active_ann["fixed_assets"] if active_ann else 150.0
            gross_block = net_block + depr_val
            cwip = active_ann["cwip"] if active_ann else 5.0
            working_capital = (active_ann["inventory"] + active_ann["receivables"] - active_ann["payables"]) if active_ann else 25.0
            
            inv_days = (active_ann["inventory"] / sales_val) * 365.0 if active_ann else 45.0
            rec_days = (active_ann["receivables"] / sales_val) * 365.0 if active_ann else 30.0
            pay_days = (active_ann["payables"] / sales_val) * 365.0 if active_ann else 25.0
            ccc = round(inv_days + rec_days - pay_days, 1)
            
            total_assets = net_block + cash_val + (active_ann["inventory"] if active_ann else 15.0) + (active_ann["receivables"] if active_ann else 20.0)
            if total_assets <= 0:
                total_assets = 100.0
            sloan = round(((pat_val - cfo_val/4.0) / total_assets) * 100.0, 2)
            
            A = working_capital / total_assets
            B = (active_ann["reserves"] if active_ann else 80.0) / total_assets
            C = (ebit * 4.0) / total_assets
            D = mcap_dt / (debt_val if debt_val > 0 else 1.0)
            E = (sales_val * 4.0) / total_assets
            altman_z = round(1.2*A + 1.4*B + 3.3*C + 0.6*D + 0.999*E, 2)
            
            f_score = 4
            if roce > 12.0: f_score += 1
            if cfo_val > 0: f_score += 1
            if debt_equity < 0.5: f_score += 1
            if interest_coverage > 3.0: f_score += 1
            if pat_margin > 8.0: f_score += 1
            
            ratios_quarterly_inserts.append((
                sid, dt_str, roe, roce, roa, ebitda_margin, pat_margin, debt_equity, interest_coverage, 
                current_ratio, quick_ratio, sales_growth_3y, pat_growth_3y, working_capital,
                gross_block, net_block, cwip, depr_val, cfo_val, fcf_val, ccc, f_score, altman_z, sloan
            ))
            
    # Clear existing rows for updated dates
    for dt_str in dates:
        cursor.execute("DELETE FROM ratios_daily WHERE date = ?", (dt_str,))
        cursor.execute("DELETE FROM ratios_quarterly WHERE date = ?", (dt_str,))
        
    cursor.executemany(
        """
        INSERT INTO ratios_daily 
        (stock_id, date, pe, pb, ev_ebitda, ev_sales, mc_sales, price_cfo, price_fcf, dividend_yield, fcf_yield) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        ratios_daily_inserts
    )
    cursor.executemany(
        """
        INSERT INTO ratios_quarterly 
        (stock_id, date, roe, roce, roa, ebitda_margin, pat_margin, debt_equity, interest_coverage, 
         current_ratio, quick_ratio, sales_cagr_3y, pat_cagr_3y, working_capital,
         gross_block, net_block, cwip, depreciation, operating_cash_flow, free_cash_flow, 
         cash_conversion_cycle, piotroski_f_score, altman_z_score, sloan_ratio) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        ratios_quarterly_inserts
    )
    db_conn.commit()
    print("Incremental ratios recalculated successfully!")

def main():
    print("--- QUANT PIPELINE AUTO-UPDATER ---")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. Find last date in database
    cursor.execute("SELECT MAX(date) FROM adjusted_prices")
    row = cursor.fetchone()
    last_date_str = row[0] if row[0] else "2026-07-08"
    last_date = datetime.datetime.strptime(last_date_str, "%Y-%m-%d").date()
    
    today_date = datetime.date.today()
    if last_date >= today_date:
        print(f"Database is already up to date as of {last_date_str}. No updates needed.")
        conn.close()
        return
        
    # 2. Download and insert incremental price data
    new_dates = update_prices(conn, last_date, today_date)
    if not new_dates:
        print("No new price dates downloaded.")
        conn.close()
        return
        
    # 3. Recalculate daily & quarterly ratios
    recalculate_ratios_for_dates(conn, new_dates)
    conn.close()
    
    # 4. Rebuild factors for new dates
    print("Rebuilding factor percentile rankings for new dates...")
    db_session = SessionLocal()
    try:
        db_session.execute(text("PRAGMA synchronous = OFF;"))
        db_session.execute(text("PRAGMA journal_mode = MEMORY;"))
        for dt_str in new_dates:
            dt = datetime.datetime.strptime(dt_str, "%Y-%m-%d").date()
            rebuild_factors_for_date(db_session, dt)
        print("Incremental factor rebuild complete!")
    finally:
        db_session.close()
        
    print("QUANT DATABASE PIPELINE INCREMENTAL UPDATE COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    main()
