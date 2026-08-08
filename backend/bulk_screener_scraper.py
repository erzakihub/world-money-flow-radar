#!/usr/bin/env python3
"""
Bulk Screener.in Financial Data Scraper
=======================================
Scrapes annual P&L, balance sheet, cash flow, and quarterly results
for ALL stocks in the database from Screener.in.

Features:
- Resumable: tracks progress in a state file, skips already-scraped stocks
- Rate-limited: 4s delay between requests with exponential backoff on errors
- Robust: handles 403/429/timeout errors gracefully
- Batch commits: saves every stock immediately to prevent data loss
"""

import os
import sys
import time
import json
import datetime
import sqlite3
import requests
from bs4 import BeautifulSoup

DB_PATH = "/Users/zakiahmad/Documents/Antigravity/backend/quant_intelligence.db"
STATE_FILE = "/Users/zakiahmad/Documents/Antigravity/backend/scraper_state.json"

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
}

BASE_DELAY = 4.0       # seconds between requests
MAX_DELAY = 120.0      # max backoff delay
BACKOFF_FACTOR = 2.0   # exponential backoff multiplier

# ─── State Management ───────────────────────────────────────────────

def load_state():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, 'r') as f:
            return json.load(f)
    return {"scraped": [], "failed": [], "blocked_at": None}

def save_state(state):
    with open(STATE_FILE, 'w') as f:
        json.dump(state, f)

# ─── Date Parsing ────────────────────────────────────────────────────

def parse_date(date_str):
    """Parse 'Mar 2024' style dates to 'YYYY-MM-DD'."""
    parts = date_str.strip().split()
    if len(parts) != 2:
        return None
    month_name, year_str = parts[0][:3], parts[1]
    month_map = {
        "Jan": (1, 31), "Feb": (2, 28), "Mar": (3, 31), "Apr": (4, 30),
        "May": (5, 31), "Jun": (6, 30), "Jul": (7, 31), "Aug": (8, 31),
        "Sep": (9, 30), "Oct": (10, 31), "Nov": (11, 30), "Dec": (12, 31)
    }
    if month_name not in month_map:
        return None
    month, day = month_map[month_name]
    year = int(year_str)
    if month == 2 and year % 4 == 0 and (year % 100 != 0 or year % 400 == 0):
        day = 29
    return f"{year}-{month:02d}-{day:02d}"

# ─── HTML Table Extraction ──────────────────────────────────────────

def extract_table_data(section_soup):
    """Extract column dates and row data from a Screener financial table."""
    if not section_soup:
        return None, None
    table = section_soup.find('table', class_='data-table')
    if not table:
        return None, None
    thead = table.find('thead')
    if not thead:
        return None, None
    cols = []
    for th in thead.find_all('th'):
        text = th.text.strip()
        if text and text not in ('', 'Parameters'):
            # Skip TTM column
            if text == 'TTM':
                continue
            cols.append(text)
    # If thead is empty (JS-rendered page), bail out
    if not cols:
        return None, None
    rows_data = {}
    tbody = table.find('tbody')
    if not tbody:
        return None, None
    for tr in tbody.find_all('tr'):
        tds = tr.find_all('td')
        if not tds:
            continue
        # Handle button-wrapped param names (e.g. "Sales +")
        first_cell = tds[0]
        btn = first_cell.find('button')
        param_name = (btn.text if btn else first_cell.text).strip()
        param_name = param_name.replace('+', '').replace('\xa0', ' ').strip()
        row_vals = []
        for td in tds[1:len(cols)+1]:  # Only take as many values as columns
            val_text = td.text.strip().replace(',', '').replace('\xa0', '')
            if val_text == '' or val_text == '-':
                row_vals.append(0.0)
            else:
                try:
                    row_vals.append(float(val_text))
                except ValueError:
                    row_vals.append(0.0)
        rows_data[param_name] = row_vals
    return cols, rows_data

# ─── Web Scraping ───────────────────────────────────────────────────

def scrape_screener(symbol, session):
    """Scrape financial tables from Screener.in for a given symbol."""
    clean = symbol.replace('.NS', '').replace('.BO', '').strip()
    
    # Try consolidated first, then standalone
    urls_to_try = [
        f"https://www.screener.in/company/{clean}/consolidated/",
        f"https://www.screener.in/company/{clean}/",
    ]
    
    for url in urls_to_try:
        try:
            r = session.get(url, headers=HEADERS, timeout=15)
            if r.status_code == 429 or r.status_code == 403:
                return None, r.status_code
            if r.status_code != 200:
                continue
        except requests.exceptions.RequestException:
            continue
        
        soup = BeautifulSoup(r.text, 'html.parser')
        data = {}
        
        for section_id, key in [
            ('quarters', 'quarters'),
            ('profit-loss', 'annual_pl'),
            ('balance-sheet', 'balance_sheet'),
            ('cash-flow', 'cash_flow'),
        ]:
            sec = soup.find('section', id=section_id)
            if not sec and section_id == 'cash-flow':
                sec = soup.find('section', id='cash-points')
            cols, rows = extract_table_data(sec)
            if cols and rows:
                data[key] = {"cols": cols, "rows": rows}
        
        # If we got real data (at least P&L or quarters), return it
        if data.get('annual_pl') or data.get('quarters'):
            return data, 200
        # Otherwise, try the next URL (standalone fallback)
    
    # No data from any URL
    return None, 404

# ─── Database Insertion ─────────────────────────────────────────────

def save_to_db(cursor, stock_id, data):
    """Insert scraped financial data into database tables."""
    records_saved = 0
    
    # ── Annual Financials ──
    pl = data.get("annual_pl", {})
    bs = data.get("balance_sheet", {})
    cf = data.get("cash_flow", {})
    
    if pl and "cols" in pl:
        cols = pl["cols"]
        rows = pl["rows"]
        
        sales_list = rows.get("Sales", [])
        ebitda_list = rows.get("Operating Profit", [])
        dep_list = rows.get("Depreciation", [])
        int_list = rows.get("Interest", [])
        pat_list = rows.get("Net Profit", [])
        eps_list = rows.get("EPS in Rs", [])
        
        bs_rows = bs.get("rows", {})
        capital_list = bs_rows.get("Share Capital", [])
        reserves_list = bs_rows.get("Reserves", [])
        debt_list = bs_rows.get("Borrowings", [])
        fixed_assets_list = bs_rows.get("Fixed Assets", bs_rows.get("Property, Plant and Equipment", []))
        cwip_list = bs_rows.get("CWIP", bs_rows.get("Capital Work in Progress", []))
        investments_list = bs_rows.get("Investments", [])
        other_assets_list = bs_rows.get("Other Assets", [])
        inventory_list = bs_rows.get("Inventories", [])
        receivables_list = bs_rows.get("Trade Receivables", bs_rows.get("Debtors", []))
        cash_list = bs_rows.get("Cash Equivalents", bs_rows.get("Cash & Bank", []))
        payables_list = bs_rows.get("Trade Payables", bs_rows.get("Sundry Creditors", []))
        
        cf_rows = cf.get("rows", {})
        cfo_list = cf_rows.get("Cash from Operating Activity", [])
        cfi_list = cf_rows.get("Cash from Investing Activity", [])
        cff_list = cf_rows.get("Cash from Financing Activity", [])
        fcf_list = cf_rows.get("Net Cash Flow", [])
        
        # Delete old mock annual data for this stock
        cursor.execute("DELETE FROM financials_annual WHERE stock_id = ?", (stock_id,))
        
        for idx, date_label in enumerate(cols):
            db_date = parse_date(date_label)
            if not db_date:
                continue
            
            def safe(lst, i):
                return lst[i] if i < len(lst) else 0.0
            
            sales = safe(sales_list, idx)
            ebitda = safe(ebitda_list, idx)
            dep = safe(dep_list, idx)
            interest = safe(int_list, idx)
            pat = safe(pat_list, idx)
            eps = safe(eps_list, idx)
            capital = safe(capital_list, idx)
            reserves = safe(reserves_list, idx)
            debt = safe(debt_list, idx)
            fixed_assets = safe(fixed_assets_list, idx)
            cwip = safe(cwip_list, idx)
            inventory = safe(inventory_list, idx)
            receivables = safe(receivables_list, idx)
            cash_eq = safe(cash_list, idx)
            payables = safe(payables_list, idx)
            cfo = safe(cfo_list, idx)
            fcf = safe(fcf_list, idx)
            
            pub_date = (datetime.datetime.strptime(db_date, "%Y-%m-%d") + datetime.timedelta(days=45)).strftime("%Y-%m-%d")
            
            cursor.execute("""
                INSERT INTO financials_annual 
                (stock_id, date, publication_date, sales, ebitda, finance_cost, depreciation, pat, eps,
                 equity_share_capital, reserves, total_debt, cash_equivalents, fixed_assets, cwip,
                 inventory, receivables, payables, operating_cash_flow, free_cash_flow)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (stock_id, db_date, pub_date, sales, ebitda, interest, dep, pat, eps,
                  capital, reserves, debt, cash_eq, fixed_assets, cwip,
                  inventory, receivables, payables, cfo, fcf))
            records_saved += 1
    
    # ── Quarterly Financials ──
    q = data.get("quarters", {})
    if q and "cols" in q:
        cols = q["cols"]
        rows = q["rows"]
        
        q_sales = rows.get("Sales", [])
        q_ebitda = rows.get("Operating Profit", [])
        q_int = rows.get("Interest", [])
        q_pat = rows.get("Net Profit", [])
        
        cursor.execute("DELETE FROM financials_quarterly WHERE stock_id = ?", (stock_id,))
        
        for idx, date_label in enumerate(cols):
            db_date = parse_date(date_label)
            if not db_date:
                continue
            
            def safe(lst, i):
                return lst[i] if i < len(lst) else 0.0
            
            sales = safe(q_sales, idx)
            ebitda = safe(q_ebitda, idx)
            interest = safe(q_int, idx)
            pat = safe(q_pat, idx)
            
            pub_date = (datetime.datetime.strptime(db_date, "%Y-%m-%d") + datetime.timedelta(days=45)).strftime("%Y-%m-%d")
            
            cursor.execute("""
                INSERT INTO financials_quarterly 
                (stock_id, date, announcement_date, sales, ebitda, finance_cost, pat)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (stock_id, db_date, pub_date, sales, ebitda, interest, pat))
            records_saved += 1
    
    return records_saved

# ─── Main Pipeline ──────────────────────────────────────────────────

def main():
    state = load_state()
    already_scraped = set(state["scraped"])
    
    print("=" * 60)
    print("BULK SCREENER.IN FINANCIAL DATA SCRAPER")
    print("=" * 60)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Get all active stock symbols
    cursor.execute("SELECT id, symbol FROM stocks WHERE is_active = 1 ORDER BY market_cap DESC, id ASC")
    all_stocks = cursor.fetchall()
    
    # Filter out already-scraped
    pending = [(sid, sym) for sid, sym in all_stocks if sym not in already_scraped]
    
    print(f"Total stocks in DB:     {len(all_stocks)}")
    print(f"Already scraped:        {len(already_scraped)}")
    print(f"Pending to scrape:      {len(pending)}")
    print(f"Estimated time:         ~{len(pending) * 4 / 60:.0f} minutes")
    print("=" * 60)
    
    session = requests.Session()
    success_count = 0
    fail_count = 0
    block_count = 0
    current_delay = BASE_DELAY
    
    for idx, (stock_id, symbol) in enumerate(pending):
        clean_sym = symbol.replace('.NS', '').replace('.BO', '').strip()
        
        progress_pct = (idx + 1) / len(pending) * 100
        print(f"[{idx+1}/{len(pending)} | {progress_pct:.1f}%] Scraping {clean_sym}...", end=" ", flush=True)
        
        try:
            data, status_code = scrape_screener(symbol, session)
            
            if status_code == 429 or status_code == 403:
                block_count += 1
                current_delay = min(current_delay * BACKOFF_FACTOR, MAX_DELAY)
                print(f"BLOCKED ({status_code})! Backing off to {current_delay:.0f}s...")
                state["failed"].append(symbol)
                save_state(state)
                
                if block_count >= 5:
                    print(f"\n⚠️  Hit {block_count} consecutive blocks. Pausing 5 minutes...")
                    time.sleep(300)
                    block_count = 0
                    current_delay = BASE_DELAY * 2
                else:
                    time.sleep(current_delay)
                continue
            
            block_count = 0  # Reset on success
            
            if data and (data.get("annual_pl") or data.get("quarters")):
                records = save_to_db(cursor, stock_id, data)
                conn.commit()
                success_count += 1
                current_delay = max(current_delay * 0.9, BASE_DELAY)  # Gradually reduce delay
                
                annual_count = len(data.get("annual_pl", {}).get("cols", []))
                quarterly_count = len(data.get("quarters", {}).get("cols", []))
                print(f"✅ {records} records (A:{annual_count} Q:{quarterly_count})")
            else:
                print(f"⚪ No data found")
                fail_count += 1
            
            state["scraped"].append(symbol)
            save_state(state)
            
        except Exception as e:
            print(f"❌ Error: {str(e)[:60]}")
            fail_count += 1
            state["scraped"].append(symbol)  # Mark as attempted
            save_state(state)
        
        time.sleep(current_delay)
        
        # Progress report every 50 stocks
        if (idx + 1) % 50 == 0:
            print(f"\n{'─' * 50}")
            print(f"PROGRESS: {idx+1}/{len(pending)} | ✅ {success_count} | ⚪ {fail_count}")
            print(f"{'─' * 50}\n")
    
    conn.close()
    
    print("\n" + "=" * 60)
    print("SCRAPING COMPLETE")
    print(f"  Successfully scraped: {success_count}")
    print(f"  No data found:       {fail_count}")
    print(f"  Total processed:     {success_count + fail_count}")
    print("=" * 60)

if __name__ == "__main__":
    main()
