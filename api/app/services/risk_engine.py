import datetime
from sqlalchemy.orm import Session
import pandas as pd
import numpy as np
from ..models import Stock, AdjustedPrice

def compute_portfolio_risk_analytics(db: Session, holdings: list, target_date: datetime.date) -> dict:
    """
    Computes risk metrics for a set of holdings:
    - holdings: list of dicts, e.g. [{"symbol": "TCS", "weight": 10.0}, ...]
    """
    if not holdings:
        return {}

    total_val = 0.0
    val_map = {}
    for h in holdings:
        sym = h.get("symbol")
        if not sym:
            continue
        if "weight" in h and h["weight"] is not None:
            val_map[sym] = float(h["weight"])
        elif "shares" in h and "average_buy_price" in h:
            val = float(h["shares"]) * float(h["average_buy_price"])
            val_map[sym] = val
        else:
            val_map[sym] = 1.0
        total_val += val_map[sym]
        
    if not val_map:
        return {}

    weights_map = {sym: (val / total_val) if total_val > 0 else (1.0 / len(val_map)) for sym, val in val_map.items()}
    symbols = list(weights_map.keys())

    # Fetch stocks master to match sectors
    stocks = db.query(Stock).filter(Stock.symbol.in_(symbols)).all()
    stock_sector_map = {s.symbol: s.sector for s in stocks}
    stock_id_map = {s.id: s.symbol for s in stocks}
    stock_ids = [s.id for s in stocks]

    # Fetch 1 year of price history to calculate returns, volatility, correlation and VaR
    date_1y_ago = target_date - datetime.timedelta(days=365)
    prices = db.query(AdjustedPrice).filter(
        AdjustedPrice.stock_id.in_(stock_ids),
        AdjustedPrice.date >= date_1y_ago,
        AdjustedPrice.date <= target_date
    ).order_by(AdjustedPrice.date.asc()).all()

    if not prices:
        return {"error": "No price history available for risk calculations."}

    # Group price series
    price_series = {}
    for p in prices:
        sym = stock_id_map[p.stock_id]
        if sym not in price_series:
            price_series[sym] = []
        price_series[sym].append({"date": p.date, "close": p.close})

    # Align dates
    df_prices = pd.DataFrame()
    for sym, data in price_series.items():
        temp_df = pd.DataFrame(data)
        temp_df.set_index("date", inplace=True)
        df_prices[sym] = temp_df["close"]

    df_prices = df_prices.ffill().bfill()
    df_returns = df_prices.pct_change().dropna()

    if df_returns.empty:
        return {"error": "Insufficient returns data."}

    # Annualized Volatility
    volatilities = df_returns.std() * np.sqrt(52)  # weekly step
    
    # Correlation Matrix
    corr_matrix = df_returns.corr().round(2)
    
    # Sector concentration
    sector_exposure = {}
    for sym, wt in weights_map.items():
        sec = stock_sector_map.get(sym, "Unknown")
        sector_exposure[sec] = sector_exposure.get(sec, 0.0) + wt * 100.0
    
    # Format correlation matrix for frontend charts
    corr_data = []
    cols = list(corr_matrix.columns)
    for i, col1 in enumerate(cols):
        for j, col2 in enumerate(cols):
            corr_data.append({
                "x": col1,
                "y": col2,
                "value": float(corr_matrix.iloc[i, j])
            })

    # Portfolio returns walk (using weights)
    weights_vector = np.array([weights_map.get(col, 0.0) for col in df_returns.columns])
    portfolio_returns = df_returns.dot(weights_vector)
    
    # Annualized Portfolio Volatility
    portfolio_vol = portfolio_returns.std() * np.sqrt(52)
    
    # Value at Risk (VaR) at 95% (parametric)
    # 95% confidence = 1.65 standard deviations
    mean_return = portfolio_returns.mean()
    var_95 = (mean_return - 1.645 * portfolio_returns.std()) * 100.0 # as percentage loss

    # Calculate Drawdown
    cum_returns = (1.0 + portfolio_returns).cumprod()
    peaks = cum_returns.cummax()
    drawdowns = (cum_returns - peaks) / peaks
    max_drawdown = drawdowns.min() * 100.0

    # Volatility classes
    stock_vol_list = []
    for sym in symbols:
        stock_vol_list.append({
            "symbol": sym,
            "volatility": round(volatilities.get(sym, 0.0) * 100.0, 2),
            "sector": stock_sector_map.get(sym, "Unknown")
        })

    return {
        "portfolio_volatility": round(portfolio_vol * 100.0, 2),
        "portfolio_var_95": round(abs(var_95), 2),
        "portfolio_max_drawdown": round(abs(max_drawdown), 2),
        "sector_exposure": [{"sector": k, "percentage": round(v, 2)} for k, v in sector_exposure.items()],
        "stock_volatilities": stock_vol_list,
        "correlation_matrix": corr_data,
        "correlation_symbols": cols
    }
