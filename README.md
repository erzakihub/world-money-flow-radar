# World Money Flow Tracker

A professional-grade macro-financial analytical dashboard for tracking global liquidity, asset class capital flows, region-wise indices, sector rotations, and running out-of-sample backtests.

## Features

The dashboard includes 13 primary sections:
1. **Global Command Centre**: Overview of active liquidity regimes, risk appetites, and dominant capital flows.
2. **Global Liquidity Map**: Dynamic Composite Liquidity Index over time with interactive weight sliders to adjust calculations.
3. **Asset Class Flow**: Interactive SVG-based Sankey Flow Map showing capital rotations, and performance return heatmaps.
4. **World Region Flow Map**: Inflow intensities overlayed on a world map with EM currency confirmation index tracking.
5. **India Money Flow**: In-depth foreign (FPI) and domestic (DII) cumulative charts, AMFI Mutual Fund flows, and cyclical stage detection.
6. **Sector Rotation**: Relative strength vectors and price breakout trackers for S&P 500 ETFs and Nifty sectors.
7. **RRG Engine**: Relative Rotation Graphs scatter plots displaying asset coordinate trails (Leading, Weakening, Lagging, Improving) vs benchmarks.
8. **Early Bull Detector**: Screener displaying assets moving from Lagging to Improving with historical win-rates and 6M forward returns.
9. **Backtesting**: Vectorized simulation tool for testing strategies (Global Liquidity, India Flow, RRG Rotation) complete with transaction cost calculations and equity curves.
10. **Reality Check**: Narrative auditor comparing price movements vs actual fund flow allocations to yield a Truth Score.
11. **Crowding & Overheating**: Monitors overbought sectors, RSI limits, and distance from 200DMAs to prevent chasing exhausted trends.
12. **Data Quality Feed**: Freshest observer statistics and staleness warnings across FRED, BIS, Yahoo Finance, and AMFI feeds.
13. **Settings & Ingestion**: Preferences configuration and uploader for parsing NSDL/AMFI CSV/Excel spreadsheets.

---

## Technical Architecture

- **Backend**: Python FastAPI with SQLite, Pandas, NumPy, and SQLAlchemy ORM.
- **Frontend**: React, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, and Recharts.

---

## Running the Application

### 1. Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000
```
*Note: The backend automatically seeds the SQLite database with 6 years of high-fidelity daily observations (2020-2026) upon first startup so that the backtesting engines and charts work instantly.*

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser to view the application.
