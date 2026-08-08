#!/usr/bin/env python3
"""
Quarterly Interpolation from Annual Data
=========================================
Generates quarterly financial records from annual data for periods
where quarterly data is not available from Screener.in.

For each annual record (e.g. FY ending Mar 2015):
  - Creates 4 quarterly records: Jun 2014, Sep 2014, Dec 2014, Mar 2015
  - Splits annual figures equally across quarters (standard practice)
  - Uses smoothed transitions between fiscal years to avoid sharp jumps
  - Sets proper announcement_date for point-in-time backtesting

This runs AFTER the bulk scraper completes.
"""

import sqlite3
import datetime

DB_PATH = "/Users/zakiahmad/Documents/Antigravity/backend/quant_intelligence.db"


def interpolate_quarters(cursor, stock_id):
    """Generate quarterly records from annual data where quarters are missing."""
    
    # Get all annual records for this stock, sorted by date
    cursor.execute("""
        SELECT date, sales, ebitda, finance_cost, depreciation, pat, eps
        FROM financials_annual
        WHERE stock_id = ?
        ORDER BY date ASC
    """, (stock_id,))
    annual_rows = cursor.fetchall()
    
    if not annual_rows:
        return 0
    
    # Get existing quarterly dates for this stock
    cursor.execute("""
        SELECT date FROM financials_quarterly WHERE stock_id = ?
    """, (stock_id,))
    existing_q_dates = set(row[0] for row in cursor.fetchall())
    
    records_added = 0
    
    for i, row in enumerate(annual_rows):
        fy_end_str, sales, ebitda, finance_cost, dep, pat, eps = row
        fy_end = datetime.datetime.strptime(fy_end_str, "%Y-%m-%d")
        
        # Determine the fiscal year quarter end dates
        # For Indian companies with Mar FY end:
        #   Q1: Jun, Q2: Sep, Q3: Dec, Q4: Mar
        fy_month = fy_end.month
        fy_year = fy_end.year
        
        if fy_month == 3:  # Most Indian companies
            quarter_ends = [
                datetime.date(fy_year - 1, 6, 30),   # Q1
                datetime.date(fy_year - 1, 9, 30),   # Q2
                datetime.date(fy_year - 1, 12, 31),  # Q3
                datetime.date(fy_year, 3, 31),        # Q4
            ]
        elif fy_month == 12:  # Calendar year companies (e.g., ABB)
            quarter_ends = [
                datetime.date(fy_year, 3, 31),   # Q1
                datetime.date(fy_year, 6, 30),   # Q2
                datetime.date(fy_year, 9, 30),   # Q3
                datetime.date(fy_year, 12, 31),  # Q4
            ]
        else:
            # Generic: split into 4 quarters ending at 3-month intervals
            quarter_ends = []
            for q in range(4):
                q_month = ((fy_month - 3 * (3 - q)) % 12) or 12
                q_year = fy_year if q_month <= fy_month else fy_year - 1
                if q_month in (1, 3, 5, 7, 8, 10, 12):
                    q_day = 31
                elif q_month in (4, 6, 9, 11):
                    q_day = 30
                else:
                    q_day = 28
                quarter_ends.append(datetime.date(q_year, q_month, q_day))
        
        # For smoothing: if we have previous year data, interpolate gradually
        if i > 0:
            prev_row = annual_rows[i - 1]
            prev_sales = prev_row[1] or 0
            prev_ebitda = prev_row[2] or 0
            prev_fc = prev_row[3] or 0
            prev_pat = prev_row[5] or 0
        else:
            prev_sales = sales
            prev_ebitda = ebitda
            prev_fc = finance_cost
            prev_pat = pat
        
        # Generate quarterly values with gradual transition from previous year
        # Q1 = 70% prev_annual/4 + 30% current_annual/4
        # Q2 = 50/50
        # Q3 = 30/70
        # Q4 = 10/90
        weights = [(0.7, 0.3), (0.5, 0.5), (0.3, 0.7), (0.1, 0.9)]
        
        for q_idx, q_end in enumerate(quarter_ends):
            q_date_str = q_end.strftime("%Y-%m-%d")
            
            # Skip if we already have real quarterly data for this date
            if q_date_str in existing_q_dates:
                continue
            
            wp, wc = weights[q_idx]
            q_sales = (wp * (prev_sales or 0) / 4) + (wc * (sales or 0) / 4)
            q_ebitda = (wp * (prev_ebitda or 0) / 4) + (wc * (ebitda or 0) / 4)
            q_fc = (wp * (prev_fc or 0) / 4) + (wc * (finance_cost or 0) / 4)
            q_pat = (wp * (prev_pat or 0) / 4) + (wc * (pat or 0) / 4)
            
            # Announcement date: typically 45-60 days after quarter end
            ann_date = (q_end + datetime.timedelta(days=45)).strftime("%Y-%m-%d")
            
            cursor.execute("""
                INSERT INTO financials_quarterly 
                (stock_id, date, announcement_date, sales, ebitda, finance_cost, pat)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (stock_id, q_date_str, ann_date,
                  round(q_sales, 2), round(q_ebitda, 2),
                  round(q_fc, 2), round(q_pat, 2)))
            records_added += 1
    
    return records_added


def main():
    print("=" * 60)
    print("QUARTERLY INTERPOLATION FROM ANNUAL DATA")
    print("=" * 60)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Get all stocks that have annual data
    cursor.execute("""
        SELECT DISTINCT s.id, s.symbol 
        FROM stocks s
        JOIN financials_annual fa ON fa.stock_id = s.id
        ORDER BY s.symbol
    """)
    stocks = cursor.fetchall()
    print(f"Stocks with annual data: {len(stocks)}")
    
    total_added = 0
    stocks_processed = 0
    
    for stock_id, symbol in stocks:
        added = interpolate_quarters(cursor, stock_id)
        if added > 0:
            total_added += added
            stocks_processed += 1
            if stocks_processed % 100 == 0:
                conn.commit()
                print(f"  Processed {stocks_processed} stocks, {total_added} quarters added...")
    
    conn.commit()
    conn.close()
    
    print(f"\n✅ Complete!")
    print(f"  Stocks processed: {stocks_processed}")
    print(f"  Quarterly records added: {total_added}")
    print("=" * 60)


if __name__ == "__main__":
    main()
