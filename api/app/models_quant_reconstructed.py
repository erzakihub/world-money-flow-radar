from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Date, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

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

stock = relationship("Stock", back_populates="ratios_quarterly")

class ShareholdingPattern(Base):
__tablename__ = "shareholding_pattern"

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
