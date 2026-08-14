from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Date, Text, JSON, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

# ==========================================
# WORLD MONEY FLOW TRACKER MODELS (MACRO)
# ==========================================

class DataSource(Base):
    __tablename__ = "data_sources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    category = Column(String)  # Macro, Fund Flow, Exchange, Scraped
    type = Column(String)  # API, Manual Upload, Scrape
    url = Column(String, nullable=True)
    api_required = Column(Boolean, default=False)
    frequency = Column(String)  # Daily, Weekly, Monthly, Quarterly
    reliability_score = Column(Float, default=1.0)
    notes = Column(Text, nullable=True)

    time_series = relationship("TimeSeries", back_populates="source")

class TimeSeries(Base):
    __tablename__ = "time_series"

    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(Integer, ForeignKey("data_sources.id"))
    symbol = Column(String, unique=True, index=True)
    name = Column(String)
    category = Column(String)  # Global Liquidity, Asset Flow, Region Flow, Sector Flow
    region = Column(String, nullable=True)
    asset_class = Column(String, nullable=True)
    sector = Column(String, nullable=True)
    frequency = Column(String)
    unit = Column(String, nullable=True)
    currency = Column(String, default="USD")
    is_actual_flow = Column(Boolean, default=False)
    is_proxy = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    source = relationship("DataSource", back_populates="time_series")
    observations = relationship("Observation", back_populates="time_series", cascade="all, delete-orphan")

class Observation(Base):
    __tablename__ = "observations"
    __table_args__ = (
        Index("idx_obs_ts_date", "time_series_id", "date"),
    )

    id = Column(Integer, primary_key=True, index=True)
    time_series_id = Column(Integer, ForeignKey("time_series.id"))
    date = Column(Date, index=True)
    value = Column(Float)
    revised_value = Column(Float, nullable=True)

    time_series = relationship("TimeSeries", back_populates="observations")

class Instrument(Base):
    __tablename__ = "instruments"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, unique=True, index=True)
    name = Column(String)
    type = Column(String)  # Equity, Bond, FX, Commodity, Crypto
    region = Column(String, nullable=True)
    country = Column(String, nullable=True)
    asset_class = Column(String, nullable=True)
    notes = Column(Text, nullable=True)

    prices = relationship("Price", back_populates="instrument", cascade="all, delete-orphan")

class Price(Base):
    __tablename__ = "prices"
    __table_args__ = (
        Index("idx_price_inst_date", "instrument_id", "date"),
    )

    id = Column(Integer, primary_key=True, index=True)
    instrument_id = Column(Integer, ForeignKey("instruments.id"))
    date = Column(Date, index=True)
    open = Column(Float, nullable=True)
    high = Column(Float, nullable=True)
    low = Column(Float, nullable=True)
    close = Column(Float)
    volume = Column(Float, nullable=True)

    instrument = relationship("Instrument", back_populates="prices")

class FlowScore(Base):
    __tablename__ = "flow_scores"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, index=True)
    category = Column(String)  # Global Liquidity, Private Credit, Yield Curve, Fund Flow, Dollar, Growth, Price/RRG, Volatility
    score = Column(Float)
    regime = Column(String)  # Bull Flow, Outflow, Neutral etc.
    details = Column(Text, nullable=True)

class BacktestResult(Base):
    __tablename__ = "backtest_results"

    id = Column(Integer, primary_key=True, index=True)
    strategy_name = Column(String)
    run_date = Column(DateTime, default=datetime.utcnow)
    parameters = Column(Text)  # JSON representation of parameters
    sharpe_ratio = Column(Float)
    max_drawdown = Column(Float)
    total_return = Column(Float)
    annualized_return = Column(Float)
    win_rate = Column(Float)
    metrics_json = Column(Text)  # Detailed metrics JSON
    trades_json = Column(Text)  # Trade logs JSON

class Alert(Base):
    __tablename__ = "alerts_macro"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, index=True)
    entity = Column(String)
    alert_type = Column(String)
    severity = Column(String)
    message = Column(Text)
    supporting_data = Column(Text, nullable=True)
    contradicting_data = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class DerivedIndicator(Base):
    __tablename__ = "derived_indicators"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, index=True)
    indicator_type = Column(String, index=True)  # Creation, Transmission, Confirmation, Euphoria, Drain
    score = Column(Float)
    sub_scores = Column(Text)  # JSON string
    confidence = Column(Float)
    data_quality = Column(Float)
    input_vars = Column(Text)  # JSON string
    explanation = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class HistoricalSimilarity(Base):
    __tablename__ = "historical_similarity"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, index=True)
    asset_symbol = Column(String, index=True)
    historical_date = Column(Date)
    regime_name = Column(String)
    similarity_score = Column(Float)
    matched_indicators = Column(Text)  # JSON string
    created_at = Column(DateTime, default=datetime.utcnow)


# ==========================================
# INDIAN EQUITY QUANT PLATFORM MODELS (QUANT)
# ==========================================

class Stock(Base):
    __tablename__ = "stocks"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, unique=True, index=True)
    isin = Column(String, index=True)
    company_name = Column(String)
    exchange = Column(String, index=True)  # NSE, BSE
    sector = Column(String, index=True)
    industry = Column(String, index=True)
    market_cap = Column(Float, index=True)  # In ₹ Crores
    free_float = Column(Float, nullable=True)
    is_sme = Column(Boolean, default=False, index=True)
    listing_date = Column(Date)
    delisting_date = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    face_value = Column(Float, default=10.0)

    # Relationships
    daily_prices = relationship("DailyPrice", back_populates="stock", cascade="all, delete-orphan")
    adjusted_prices = relationship("AdjustedPrice", back_populates="stock", cascade="all, delete-orphan")
    corporate_actions = relationship("CorporateAction", back_populates="stock", cascade="all, delete-orphan")
    financials_quarterly = relationship("FinancialQuarterly", back_populates="stock", cascade="all, delete-orphan")
    financials_annual = relationship("FinancialAnnual", back_populates="stock", cascade="all, delete-orphan")
    ratios_daily = relationship("RatiosDaily", back_populates="stock", cascade="all, delete-orphan")
    ratios_quarterly = relationship("RatiosQuarterly", back_populates="stock", cascade="all, delete-orphan")
    shareholding_pattern = relationship("ShareholdingPattern", back_populates="stock", cascade="all, delete-orphan")
    factor_scores = relationship("FactorScores", back_populates="stock", cascade="all, delete-orphan")

class StockSymbolHistory(Base):
    __tablename__ = "stock_symbol_history"

    id = Column(Integer, primary_key=True, index=True)
    old_symbol = Column(String, index=True)
    new_symbol = Column(String, index=True)
    change_date = Column(Date, index=True)

class DailyPrice(Base):
    __tablename__ = "daily_prices"
    __table_args__ = (
        Index("idx_daily_price_stock_date", "stock_id", "date"),
    )

    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(Integer, ForeignKey("stocks.id", ondelete="CASCADE"), index=True)
    date = Column(Date, index=True)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float)
    volume = Column(Float)
    delivery_volume = Column(Float, nullable=True)
    delivery_pct = Column(Float, nullable=True)
    turnover = Column(Float, nullable=True)  # in ₹ Lakhs
    vwap = Column(Float, nullable=True)

    stock = relationship("Stock", back_populates="daily_prices")

class AdjustedPrice(Base):
    __tablename__ = "adjusted_prices"
    __table_args__ = (
        Index("idx_adj_price_stock_date", "stock_id", "date"),
    )

    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(Integer, ForeignKey("stocks.id", ondelete="CASCADE"), index=True)
    date = Column(Date, index=True)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float)
    volume = Column(Float)
    vwap = Column(Float, nullable=True)
    adjustment_factor = Column(Float, default=1.0)  # Dividend/Split/Bonus multiplier

    stock = relationship("Stock", back_populates="adjusted_prices")

class CorporateAction(Base):
    __tablename__ = "corporate_actions"
    __table_args__ = (
        Index("idx_corp_act_stock_date", "stock_id", "date"),
    )

    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(Integer, ForeignKey("stocks.id", ondelete="CASCADE"), index=True)
    date = Column(Date, index=True)
    type = Column(String, index=True)  # Bonus, Split, Dividend, Rights, Merger, Demerger
    ratio_from = Column(Float, nullable=True)  # e.g., for 5:1 split, from = 1, to = 5
    ratio_to = Column(Float, nullable=True)
    dividend_amount = Column(Float, nullable=True)
    description = Column(Text, nullable=True)

    stock = relationship("Stock", back_populates="corporate_actions")

class FinancialQuarterly(Base):
    __tablename__ = "financials_quarterly"
    __table_args__ = (
        Index("idx_fin_q_stock_date", "stock_id", "date"),
    )

    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(Integer, ForeignKey("stocks.id", ondelete="CASCADE"), index=True)
    date = Column(Date, index=True)  # Quarter end date
    period_end = Column(Date)
    announcement_date = Column(Date, index=True)  # Point-in-time reference date
    sales = Column(Float)
    raw_materials = Column(Float, nullable=True)
    employee_cost = Column(Float, nullable=True)
    other_expenses = Column(Float, nullable=True)
    ebitda = Column(Float)
    depreciation = Column(Float, nullable=True)
    ebit = Column(Float)
    finance_cost = Column(Float, nullable=True)
    pbt = Column(Float)
    tax = Column(Float, nullable=True)
    pat = Column(Float)
    minority_interest = Column(Float, nullable=True)
    eps = Column(Float)
    is_audited = Column(Boolean, default=False)

    stock = relationship("Stock", back_populates="financials_quarterly")

class FinancialAnnual(Base):
    __tablename__ = "financials_annual"
    __table_args__ = (
        Index("idx_fin_a_stock_date", "stock_id", "date"),
    )

    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(Integer, ForeignKey("stocks.id", ondelete="CASCADE"), index=True)
    date = Column(Date, index=True)  # Fiscal year end date
    period_end = Column(Date)
    publication_date = Column(Date, index=True)  # Point-in-time reference date
    
    # Income Statement
    sales = Column(Float)
    ebitda = Column(Float)
    depreciation = Column(Float, nullable=True)
    ebit = Column(Float)
    finance_cost = Column(Float, nullable=True)
    pbt = Column(Float)
    tax = Column(Float, nullable=True)
    pat = Column(Float)
    eps = Column(Float)
    
    # Balance Sheet
    equity_share_capital = Column(Float)
    reserves = Column(Float)
    total_debt = Column(Float)  # short term + long term borrowings
    short_term_borrowings = Column(Float, default=0.0)
    long_term_borrowings = Column(Float, default=0.0)
    cash_equivalents = Column(Float)
    fixed_assets = Column(Float)
    cwip = Column(Float, default=0.0)
    investments = Column(Float, default=0.0)
    inventory = Column(Float, default=0.0)
    receivables = Column(Float, default=0.0)
    payables = Column(Float, default=0.0)

    # Cash Flow Statement
    operating_cash_flow = Column(Float)
    investing_cash_flow = Column(Float)
    financing_cash_flow = Column(Float)
    free_cash_flow = Column(Float)
    capex = Column(Float, default=0.0)
    dividend_paid = Column(Float, default=0.0)

    stock = relationship("Stock", back_populates="financials_annual")

class RatiosDaily(Base):
    __tablename__ = "ratios_daily"
    __table_args__ = (
        Index("idx_ratios_d_stock_date", "stock_id", "date"),
    )

    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(Integer, ForeignKey("stocks.id", ondelete="CASCADE"), index=True)
    date = Column(Date, index=True)
    pe = Column(Float, nullable=True)
    pb = Column(Float, nullable=True)
    ev_ebitda = Column(Float, nullable=True)
    ev_sales = Column(Float, nullable=True)
    mc_sales = Column(Float, nullable=True)
    price_cfo = Column(Float, nullable=True)
    price_fcf = Column(Float, nullable=True)
    dividend_yield = Column(Float, nullable=True)
    fcf_yield = Column(Float, nullable=True)

    stock = relationship("Stock", back_populates="ratios_daily")

class RatiosQuarterly(Base):
    __tablename__ = "ratios_quarterly"
    __table_args__ = (
        Index("idx_ratios_q_stock_date", "stock_id", "date"),
    )

    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(Integer, ForeignKey("stocks.id", ondelete="CASCADE"), index=True)
    date = Column(Date, index=True)
    roe = Column(Float, nullable=True)
    roce = Column(Float, nullable=True)
    roa = Column(Float, nullable=True)
    ebitda_margin = Column(Float, nullable=True)
    pat_margin = Column(Float, nullable=True)
    debt_equity = Column(Float, nullable=True)
    interest_coverage = Column(Float, nullable=True)
    current_ratio = Column(Float, nullable=True)
    quick_ratio = Column(Float, nullable=True)
    sales_cagr_3y = Column(Float, nullable=True)
    pat_cagr_3y = Column(Float, nullable=True)
    working_capital = Column(Float, nullable=True)
    
    # Advanced metrics & Forensics
    gross_block = Column(Float, nullable=True)
    net_block = Column(Float, nullable=True)
    cwip = Column(Float, nullable=True)
    depreciation = Column(Float, nullable=True)
    operating_cash_flow = Column(Float, nullable=True)
    free_cash_flow = Column(Float, nullable=True)
    cash_conversion_cycle = Column(Float, nullable=True)
    piotroski_f_score = Column(Integer, nullable=True)
    piotroski_f_score_9 = Column(Integer, nullable=True)  # Authentic 0-9 scale
    beneish_m_score = Column(Float, nullable=True)       # Manipulation threshold: > -1.78
    sloan_ratio = Column(Float, nullable=True)
    sloan_accruals_ratio = Column(Float, nullable=True)  # (Net Income - CFO)/Assets
    altman_z_score = Column(Float, nullable=True)

    stock = relationship("Stock", back_populates="ratios_quarterly")

class ShareholdingPattern(Base):
    __tablename__ = "shareholding_pattern"
    __table_args__ = (
        Index("idx_sh_pattern_stock_date", "stock_id", "date"),
    )

    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(Integer, ForeignKey("stocks.id", ondelete="CASCADE"), index=True)
    date = Column(Date, index=True)
    promoter_pct = Column(Float)
    fii_pct = Column(Float)
    dii_pct = Column(Float)
    public_pct = Column(Float)
    pledged_promoter_pct = Column(Float, default=0.0)
    mutual_fund_pct = Column(Float, default=0.0)

    stock = relationship("Stock", back_populates="shareholding_pattern")

class FactorScores(Base):
    __tablename__ = "factor_scores"
    __table_args__ = (
        Index("idx_factors_stock_date", "stock_id", "date"),
    )

    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(Integer, ForeignKey("stocks.id", ondelete="CASCADE"), index=True)
    date = Column(Date, index=True)
    quality = Column(Float)     # Score 0-100
    growth = Column(Float)      # Score 0-100
    value = Column(Float)       # Score 0-100
    momentum = Column(Float)    # Score 0-100
    risk = Column(Float)        # Score 0-100
    ownership = Column(Float)   # Score 0-100
    governance = Column(Float)  # Score 0-100
    composite = Column(Float)   # Score 0-100

    stock = relationship("Stock", back_populates="factor_scores")

class Screen(Base):
    __tablename__ = "screens"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(Text, nullable=True)
    formula_json = Column(JSON)  # screen query config
    created_at = Column(DateTime, default=datetime.utcnow)

class Strategy(Base):
    __tablename__ = "strategies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(Text, nullable=True)
    config_json = Column(JSON)  # Universe filters, ranking system, stops, rebalance
    created_at = Column(DateTime, default=datetime.utcnow)

class BacktestRun(Base):
    __tablename__ = "backtest_runs"

    id = Column(Integer, primary_key=True, index=True)
    strategy_name = Column(String)
    run_date = Column(DateTime, default=datetime.utcnow)
    parameters_json = Column(JSON)  # config parameters
    metrics_json = Column(JSON)      # performance metrics
    trade_log_json = Column(JSON)    # list of executed trades
    holdings_log_json = Column(JSON) # daily holdings history

class Portfolio(Base):
    __tablename__ = "portfolios"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    description = Column(Text, nullable=True)
    cash_balance = Column(Float)
    holdings_json = Column(JSON)
    transactions_json = Column(JSON)

class Watchlist(Base):
    __tablename__ = "watchlists"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    symbols_json = Column(JSON)

class DataQualityIssue(Base):
    __tablename__ = "data_quality_issues"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, index=True)
    symbol = Column(String, index=True)
    issue_type = Column(String, index=True)
    description = Column(Text, nullable=True)
    status = Column(String, default="Open")

class DataUpdateLog(Base):
    __tablename__ = "data_update_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    job_name = Column(String, index=True)
    status = Column(String)
    details = Column(Text, nullable=True)

class QuantAlert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, index=True)
    symbol = Column(String, index=True)
    type = Column(String, index=True)
    severity = Column(String, index=True)
    message = Column(Text)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
