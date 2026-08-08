import urllib.request
import csv
import io
import zipfile
import datetime
import pandas as pd
import yfinance as yf
from sqlalchemy.orm import Session
from ..models import Stock, DailyPrice, AdjustedPrice, CorporateAction, DataUpdateLog

NSE_CM_ZIP_URL = "https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_{date_str}_F_0000.csv.zip"

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.nseindia.com/all-reports'
}

def fetch_nse_bhavcopy(db: Session, target_date: datetime.date) -> dict:
    """
    Downloads and parses the NSE Bhavcopy for a specific date, updates DailyPrice.
    """
    date_str = target_date.strftime("%Y%m%d")
    url = NSE_CM_ZIP_URL.format(date_str=date_str)
    
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            zip_bytes = response.read()
            
        # Unzip
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
            csv_filename = [name for name in z.namelist() if name.endswith('.csv')][0]
            with z.open(csv_filename) as csv_file:
                csv_data = csv_file.read().decode('utf-8')
                
        # Parse Bhavcopy
        f = io.StringIO(csv_data)
        reader = csv.DictReader(f)
        
        # Load active stocks maps
        active_stocks = db.query(Stock).all()
        stock_map = {s.symbol: s for s in active_stocks}
        
        records_added = 0
        for row in reader:
            symbol = row.get('TckrSymb', '').strip()
            series = row.get('SctySrs', '').strip()
            
            if symbol in stock_map and series == 'EQ':
                stock = stock_map[symbol]
                try:
                    close_price = float(row.get('ClsPric', '0').strip())
                    open_price = float(row.get('OpnPric', '0').strip())
                    high_price = float(row.get('HghPric', '0').strip())
                    low_price = float(row.get('LwPric', '0').strip())
                    volume = int(row.get('TtlTradgVol', '0').strip())
                except ValueError:
                    continue
                
                if close_price <= 0:
                    continue
                    
                # Create raw price record
                dp = DailyPrice(
                    stock_id=stock.id,
                    date=target_date,
                    open=open_price,
                    high=high_price,
                    low=low_price,
                    close=close_price,
                    volume=float(volume),
                    vwap=round((open_price + high_price + low_price + close_price) / 4.0, 2)
                )
                db.add(dp)
                
                # Create adjusted price record (assuming factor = 1.0 for fresh updates, can be recalculated later)
                ap = AdjustedPrice(
                    stock_id=stock.id,
                    date=target_date,
                    open=open_price,
                    high=high_price,
                    low=low_price,
                    close=close_price,
                    volume=float(volume),
                    vwap=dp.vwap,
                    adjustment_factor=1.0
                )
                db.add(ap)
                records_added += 1
                
        db.add(DataUpdateLog(
            job_name=f"Bhavcopy CM {date_str}",
            status="Success",
            details=f"Parsed and added {records_added} price records."
        ))
        db.commit()
        return {"status": "Success", "records": records_added}
        
    except Exception as e:
        db.add(DataUpdateLog(
            job_name=f"Bhavcopy CM {date_str}",
            status="Failure",
            details=str(e)
        ))
        db.commit()
        return {"status": "Failure", "error": str(e)}

def fetch_historical_yfinance(db: Session, symbol: str, start_date: datetime.date, end_date: datetime.date):
    """
    Downloads historical daily prices and dividends from yfinance.
    """
    stock = db.query(Stock).filter(Stock.symbol == symbol).first()
    if not stock:
        return {"error": "Stock not found in database."}

    # Match suffix: .NS for NSE, .BO for BSE
    suffix = ".NS" if stock.exchange == "NSE" else ".BO"
    yf_symbol = f"{symbol}{suffix}"
    
    try:
        ticker = yf.Ticker(yf_symbol)
        df = ticker.history(start=start_date, end=end_date)
        if df.empty:
            return {"error": f"No data returned from yfinance for {yf_symbol}."}
            
        records_added = 0
        for index, row in df.iterrows():
            obs_date = index.date()
            
            # Check if record already exists
            exists = db.query(AdjustedPrice).filter(
                AdjustedPrice.stock_id == stock.id,
                AdjustedPrice.date == obs_date
            ).first()
            
            if not exists:
                # Add adjusted price
                ap = AdjustedPrice(
                    stock_id=stock.id,
                    date=obs_date,
                    open=round(row["Open"], 2),
                    high=round(row["High"], 2),
                    low=round(row["Low"], 2),
                    close=round(row["Close"], 2),
                    volume=float(row["Volume"]),
                    vwap=round((row["Open"] + row["High"] + row["Low"] + row["Close"]) / 4.0, 2),
                    adjustment_factor=1.0
                )
                db.add(ap)
                
                # Add unadjusted daily price (as proxy close, can adjust backwards if split is parsed)
                dp = DailyPrice(
                    stock_id=stock.id,
                    date=obs_date,
                    open=ap.open,
                    high=ap.high,
                    low=ap.low,
                    close=ap.close,
                    volume=ap.volume,
                    vwap=ap.vwap
                )
                db.add(dp)
                
                # Check for dividends in yfinance
                div = row.get("Dividends", 0.0)
                if div > 0:
                    ca = CorporateAction(
                        stock_id=stock.id,
                        date=obs_date,
                        type="Dividend",
                        dividend_amount=float(div),
                        description=f"yfinance fetched Dividend: ₹{div}"
                    )
                    db.add(ca)
                    
                records_added += 1
                
        db.commit()
        return {"status": "Success", "records": records_added}
        
    except Exception as e:
        return {"status": "Failure", "error": str(e)}
