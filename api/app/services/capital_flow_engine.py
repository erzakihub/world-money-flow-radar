import numpy as np
from sqlalchemy.orm import Session
from .reserve_flow_engine import compute_reserve_flow_data

def get_surplus_allocation_matrix(db: Session) -> dict:
    """
    Computes surplus allocation matrices (rows: surplus creators, columns: destinations).
    """
    # Rows and columns defined in spec
    rows = [
        "China", "Japan", "Eurozone / Germany", "Gulf / GCC", 
        "Switzerland", "Taiwan", "South Korea", "Singapore", 
        "Norway / SWF", "Global Pension Funds", "Global Sovereign Wealth Funds"
    ]
    columns = [
        "US Treasuries", "US Equities", "US Corporate Debt", "Gold", 
        "Oil / Energy", "Europe Assets", "India Equities", "India Debt", 
        "EM Equities", "EM Debt", "China Domestic Assets", "Japan Equities", 
        "Cash / USD", "Crypto / Alternative Assets"
    ]
    
    # Establish mock but logically realistic base intensities
    # e.g., Japan and China heavily buy US Treasuries. Gulf SWFs heavily buy US Equities & Real Estate.
    base_intensities = {
        ("China", "US Treasuries"): -45.0, # China has been selling
        ("China", "Gold"): 85.6,          # China buying gold
        ("China", "EM Equities"): 22.1,
        ("Japan", "US Treasuries"): 82.5,  # Japan largest holder
        ("Japan", "US Equities"): 42.1,
        ("Japan", "Europe Assets"): 25.0,
        ("Gulf / GCC", "US Equities"): 78.5,
        ("Gulf / GCC", "US Corporate Debt"): 35.0,
        ("Gulf / GCC", "Oil / Energy"): 62.0,
        ("Gulf / GCC", "India Equities"): 28.4,
        ("Norway / SWF", "US Equities"): 92.0,
        ("Norway / SWF", "Europe Assets"): 68.0,
        ("Norway / SWF", "India Equities"): 18.0,
        ("Global Pension Funds", "US Treasuries"): 75.0,
        ("Global Pension Funds", "US Corporate Debt"): 62.0,
        ("Switzerland", "Cash / USD"): 55.0,
        ("Switzerland", "US Treasuries"): 32.0,
        ("Taiwan", "US Treasuries"): 48.0,
        ("Taiwan", "US Equities"): 34.0,
        ("South Korea", "US Equities"): 52.0,
        ("Singapore", "US Equities"): 65.0,
        ("Singapore", "EM Equities"): 42.0
    }

    cells = []
    for r in rows:
        for c in columns:
            base = base_intensities.get((r, c), 0.0)
            if base == 0.0:
                # Add tiny random noise for cells that don't have explicit flows
                base = round(float(np.random.choice([0.0, 5.0, -2.0], p=[0.7, 0.2, 0.1]) * np.random.uniform(0.5, 2.0)), 1)
            
            intensity = base
            
            # Flow direction
            if intensity > 10:
                direction = "inflow"
            elif intensity < -10:
                direction = "outflow"
            else:
                direction = "neutral"
                
            # Compute mock momentum and trends
            momentum = "Improving" if intensity > 0 else "Weakening" if intensity < 0 else "Stable"
            trend = "Rising" if intensity > 0 else "Declining" if intensity < 0 else "Flat"
            confidence = 85 if abs(intensity) > 30 else 60

            cells.append({
                "source": r,
                "destination": c,
                "intensity": intensity,
                "direction": direction,
                "momentum": momentum,
                "trend": trend,
                "confidence": confidence,
                "date": "2026-06-26"
            })

    # Country details summary
    country_details = {
        "China": {
            "current_account": 410.0,
            "trade_balance": 850.0,
            "fx_reserves": 3220.0,
            "reserve_composition": "USD (52%), EUR (18%), Gold (15%), Others (15%)",
            "swf_aum": 1350.0,
            "currency_trend": "Depreciating vs USD (Controlled)",
            "capital_export_pressure": "HIGH (Seeking resources/Gold)",
            "savings_destination": "Gold, EM Equities, European Assets"
        },
        "Japan": {
            "current_account": 220.0,
            "trade_balance": -15.0,
            "fx_reserves": 1280.0,
            "reserve_composition": "USD (75%), EUR (12%), Gold (5%), Others (8%)",
            "swf_aum": 0.0,
            "currency_trend": "Inverted Carry Trade pressure, historical lows",
            "capital_export_pressure": "EXTREME (Yield search)",
            "savings_destination": "US Treasuries, US Tech Stocks, European sovereign debt"
        },
        "Gulf / GCC": {
            "current_account": 280.0,
            "trade_balance": 390.0,
            "fx_reserves": 820.0,
            "reserve_composition": "USD (65%), EUR (15%), SWF assets (20%)",
            "swf_aum": 2850.0, # Combined SWFs AUM
            "currency_trend": "Pegged to USD",
            "capital_export_pressure": "HIGH (SWF reinvestment)",
            "savings_destination": "US Equities, Global Tech, Venture/Private Equity, India Infrastructure"
        },
        "Norway / SWF": {
            "current_account": 85.0,
            "trade_balance": 110.0,
            "fx_reserves": 80.0,
            "reserve_composition": "GPFG Global Portfolio (100%)",
            "swf_aum": 1620.0,
            "currency_trend": "Weakening NOK",
            "capital_export_pressure": "HIGH (Statutory reinvestment)",
            "savings_destination": "Global Equities (70%), Global Fixed Income (27%), Alternatives (3%)"
        }
    }

    return {
        "rows": rows,
        "columns": columns,
        "matrix": cells,
        "country_details": country_details
    }

def get_sankey_flow_data(db: Session, filter_opts: dict = None) -> dict:
    """
    Generates links and nodes for Sankey diagrams.
    Sankey Chain: Surplus Generation -> Reserves/SWFs -> Allocation Channel -> Destination -> Impact
    """
    nodes = [
        # Layer 0: Surplus Generators (Surplus)
        {"id": "China_Trade", "name": "China Trade Surplus"},
        {"id": "Japan_Savings", "name": "Japan Domestic Savings"},
        {"id": "GCC_Oil", "name": "Gulf/GCC Oil Windfalls"},
        {"id": "Norway_Oil", "name": "Norway Oil Revenues"},
        {"id": "India_Domestic", "name": "India Domestic Savings (SIP)"},
        
        # Layer 1: Reserve Accumulation / SWFs (Reserve)
        {"id": "PBOC_FX", "name": "PBoC FX Reserves"},
        {"id": "BOJ_FX", "name": "BoJ FX Reserves & Carry"},
        {"id": "GCC_SWF", "name": "GCC SWFs (ADIA/PIF)"},
        {"id": "Norway_SWF", "name": "Norway GPFG (SWF)"},
        {"id": "India_Mutual", "name": "Indian Mutual Funds (DII)"},

        # Layer 2: Allocation Channels (Channel)
        {"id": "UST_Purchase", "name": "US Treasury Allocation"},
        {"id": "Global_Equity_Alloc", "name": "Global Equities Channel"},
        {"id": "Gold_Bullion", "name": "Gold / Bullion buying"},
        {"id": "India_Equity_Alloc", "name": "Indian Equities Channel"},
        {"id": "FDI_EM_Bonds", "name": "EM Assets & Infrastructure"},

        # Layer 3: Final Destination Assets (Asset)
        {"id": "US_Bonds", "name": "US Long-Term Treasuries"},
        {"id": "US_Tech_Stocks", "name": "US Tech Equities (Nasdaq)"},
        {"id": "Gold_Reserves", "name": "Physical Gold Reserves"},
        {"id": "India_Index", "name": "Nifty 50 Index"},
        {"id": "EM_Bonds_Assets", "name": "EM Sovereign Bonds"},

        # Layer 4: Market Impact (Impact)
        {"id": "USD_Funding_Ease", "name": "Supports US Deficit Funding"},
        {"id": "US_Asset_Inflation", "name": "Inflates Tech Stock Multiples"},
        {"id": "Gold_Price_Floor", "name": "Establishes Gold Price Floor"},
        {"id": "India_valuation_cushion", "name": "Cushions India Valuations"},
        {"id": "EM_growth_support", "name": "Supports EM Infrastructure Growth"}
    ]

    # Links: Source -> Target with flow value (USD Billions)
    links = [
        # China Flows
        {"source": "China_Trade", "target": "PBOC_FX", "value": 410.0},
        {"source": "PBOC_FX", "target": "Gold_Bullion", "value": 85.0},
        {"source": "PBOC_FX", "target": "FDI_EM_Bonds", "value": 115.0},
        {"source": "PBOC_FX", "target": "UST_Purchase", "value": -45.0}, # representing outflow/diversification from UST
        
        # Japan Flows
        {"source": "Japan_Savings", "target": "BOJ_FX", "value": 220.0},
        {"source": "BOJ_FX", "target": "UST_Purchase", "value": 140.0},
        {"source": "BOJ_FX", "target": "Global_Equity_Alloc", "value": 80.0},

        # GCC Flows
        {"source": "GCC_Oil", "target": "GCC_SWF", "value": 280.0},
        {"source": "GCC_SWF", "target": "Global_Equity_Alloc", "value": 150.0},
        {"source": "GCC_SWF", "target": "UST_Purchase", "value": 40.0},
        {"source": "GCC_SWF", "target": "India_Equity_Alloc", "value": 35.0},
        {"source": "GCC_SWF", "target": "FDI_EM_Bonds", "value": 55.0},

        # Norway Flows
        {"source": "Norway_Oil", "target": "Norway_SWF", "value": 85.0},
        {"source": "Norway_SWF", "target": "Global_Equity_Alloc", "value": 60.0},
        {"source": "Norway_SWF", "target": "UST_Purchase", "value": 25.0},

        # India Domestic Flows
        {"source": "India_Domestic", "target": "India_Mutual", "value": 190.0},
        {"source": "India_Mutual", "target": "India_Equity_Alloc", "value": 190.0},

        # Channel to Destination
        {"source": "UST_Purchase", "target": "US_Bonds", "value": 242.0},
        {"source": "Global_Equity_Alloc", "target": "US_Tech_Stocks", "value": 290.0},
        {"source": "Gold_Bullion", "target": "Gold_Reserves", "value": 85.0},
        {"source": "India_Equity_Alloc", "target": "India_Index", "value": 225.0},
        {"source": "FDI_EM_Bonds", "target": "EM_Bonds_Assets", "value": 170.0},

        # Destination to Impact
        {"source": "US_Bonds", "target": "USD_Funding_Ease", "value": 242.0},
        {"source": "US_Tech_Stocks", "target": "US_Asset_Inflation", "value": 290.0},
        {"source": "Gold_Reserves", "target": "Gold_Price_Floor", "value": 85.0},
        {"source": "India_Index", "target": "India_valuation_cushion", "value": 225.0},
        {"source": "EM_Bonds_Assets", "target": "EM_growth_support", "value": 170.0}
    ]

    # Adjust links if absolute negative values exist for layout simplicity
    for link in links:
        if link["value"] < 0:
            link["value"] = abs(link["value"])

    return {
        "nodes": nodes,
        "links": links
    }
