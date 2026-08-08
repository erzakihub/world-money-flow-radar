import pytest
import datetime
from sqlalchemy.orm import Session
from app.database import engine, SessionLocal, Base
from app.models import Stock, AdjustedPrice, RatiosDaily, FactorScores
from app.services.seed_generator import generate_mock_data
from app.services.factor_engine import rebuild_factors_for_date
from app.services.scanner_engine import run_screen_on_date
from app.services.backtest_engine import run_strategy_backtest
from app.services.risk_engine import compute_portfolio_risk_analytics

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

TEST_DB_URL = "sqlite:///./test_quant.db"

@pytest.fixture(scope="module")
def db_session():
    # Setup temporary test SQLite database
    test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
    TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    
    Base.metadata.create_all(bind=test_engine)
    db = TestSessionLocal()
    
    # Clean seed target
    generate_mock_data(db)
    
    yield db
    
    db.close()
    Base.metadata.drop_all(bind=test_engine)
    # Remove test database file
    import os
    if os.path.exists("./test_quant.db"):
        try:
            os.remove("./test_quant.db")
        except Exception:
            pass

def test_database_seeding(db_session: Session):
    # Verify stocks are loaded
    stocks = db_session.query(Stock).all()
    assert len(stocks) > 0, "No stocks seeded."
    
    # Check specific constituents
    reliance = db_session.query(Stock).filter(Stock.symbol == "RELIANCE").first()
    assert reliance is not None, "Reliance Industries not seeded."
    assert reliance.sector == "Energy"

def test_price_history_and_adjustments(db_session: Session):
    reliance = db_session.query(Stock).filter(Stock.symbol == "RELIANCE").first()
    
    # Check that both unadjusted and adjusted prices are seeded
    adj_prices = db_session.query(AdjustedPrice).filter(AdjustedPrice.stock_id == reliance.id).all()
    assert len(adj_prices) > 0, "Adjusted prices not seeded."

def test_screener_engine(db_session: Session):
    target_dt = datetime.date(2025, 6, 30)
    
    # Define screener rule: ROCE > 18 AND Debt_Equity < 0.75
    rules = [
        {"field": "roce", "op": ">", "val": 18.0},
        {"field": "debt_equity", "op": "<", "val": 0.75}
    ]
    
    matches = run_screen_on_date(db_session, rules, target_dt)
    assert isinstance(matches, list)
    for m in matches:
        assert m["roce"] > 18.0
        assert m["debt_equity"] < 0.75

def test_backtest_execution(db_session: Session):
    config = {
        "name": "Test Strategy",
        "universe": {
            "min_market_cap": 100.0,
            "sme_allowed": True
        },
        "filters": [
            {"field": "roce", "op": ">", "val": 15.0}
        ],
        "ranking": {
            "quality": 0.50,
            "growth": 0.50,
            "value": 0.0,
            "momentum": 0.0,
            "risk": 0.0
        },
        "portfolio": {
            "max_holdings": 5,
            "weight_type": "equal",
            "max_sector_exposure": 50.0,
            "rebalance_freq": "quarterly",
            "transaction_cost": 0.0025,
            "slippage": 0.0025
        },
        "exits": []
    }
    
    start_dt = datetime.date(2020, 1, 1)
    end_dt = datetime.date(2025, 12, 31)
    
    res = run_strategy_backtest(db_session, config, start_dt, end_dt)
    assert "metrics" in res
    assert "trade_log" in res
    assert "equity_curve" in res
    
    metrics = res["metrics"]
    assert metrics["cagr"] != 0.0
    assert "max_drawdown" in metrics

def test_risk_engine(db_session: Session):
    holdings = [
        {"symbol": "RELIANCE", "weight": 50.0},
        {"symbol": "TCS", "weight": 50.0}
    ]
    
    target_dt = datetime.date(2025, 12, 31)
    risk_res = compute_portfolio_risk_analytics(db_session, holdings, target_dt)
    
    assert "portfolio_volatility" in risk_res
    assert "portfolio_var_95" in risk_res
    assert "correlation_matrix" in risk_res
