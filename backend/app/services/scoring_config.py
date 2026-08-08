# Scoring and asset configurations for World Money Flow Radar

ASSETS_LIST = [
    {"id": "us_equities", "name": "US Equities (S&P 500 / Nasdaq)", "type": "Equity", "region": "North America", "symbol": "SPY"},
    {"id": "india_equities", "name": "India Equities (Nifty 50)", "type": "Equity", "region": "Asia-Pacific", "symbol": "INDA"},
    {"id": "china_equities", "name": "China Equities (CSI 300)", "type": "Equity", "region": "Asia-Pacific", "symbol": "ASHR"},
    {"id": "japan_equities", "name": "Japan Equities (Nikkei 225)", "type": "Equity", "region": "Asia-Pacific", "symbol": "DXJ"},
    {"id": "em_equities", "name": "Emerging Market Equities", "type": "Equity", "region": "Emerging Markets", "symbol": "EEM"},
    {"id": "us_treasuries", "name": "US Treasuries (20Y+ Bonds)", "type": "Bond", "region": "North America", "symbol": "TLT"},
    {"id": "india_bonds", "name": "Indian 10Y Sovereign Bonds", "type": "Bond", "region": "Asia-Pacific", "symbol": "IN_10Y"},
    {"id": "gold", "name": "Gold (Spot/GLD)", "type": "Commodity", "region": "Global", "symbol": "GLD"},
    {"id": "silver", "name": "Silver", "type": "Commodity", "region": "Global", "symbol": "SLV"},
    {"id": "copper", "name": "Copper (Doctor Copper)", "type": "Commodity", "region": "Global", "symbol": "CPER"},
    {"id": "crude_oil", "name": "Crude Oil (WTI)", "type": "Commodity", "region": "Global", "symbol": "USO"},
    {"id": "lng_energy", "name": "Natural Gas / LNG", "type": "Commodity", "region": "Global", "symbol": "UNG"},
    {"id": "uranium", "name": "Uranium (Sprott Physical)", "type": "Commodity", "region": "Global", "symbol": "URA"},
    {"id": "bitcoin", "name": "Bitcoin / Cryptocurrencies", "type": "Crypto", "region": "Global", "symbol": "BTC-USD"},
    {"id": "dxy", "name": "US Dollar Index (DXY)", "type": "Currency", "region": "North America", "symbol": "DXY"},
    {"id": "jpy", "name": "Japanese Yen (USD/JPY inverted)", "type": "Currency", "region": "Asia-Pacific", "symbol": "USDJPY=X"},
    {"id": "em_currencies", "name": "Emerging Market Currencies Basket", "type": "Currency", "region": "Emerging Markets", "symbol": "CEW"},
    {"id": "defense", "name": "Defense Sector (US/Global)", "type": "Sector", "region": "North America", "symbol": "ITA"},
    {"id": "power_utilities", "name": "Power & Utilities (Cyclical Safety)", "type": "Sector", "region": "Global", "symbol": "XLU"},
    {"id": "capital_goods", "name": "Capital Goods / Industrials", "type": "Sector", "region": "Global", "symbol": "XLI"},
    {"id": "banks", "name": "Global Financials & Banks", "type": "Sector", "region": "Global", "symbol": "XLF"},
    {"id": "real_estate", "name": "Real Estate / REITs", "type": "Sector", "region": "Global", "symbol": "XLRE"},
    {"id": "tech_ai", "name": "Technology & AI (Semiconductors)", "type": "Sector", "region": "Global", "symbol": "XLK"},
    {"id": "commodities_basket", "name": "Broad Commodities Basket", "type": "Commodity", "region": "Global", "symbol": "DBC"}
]

INDIA_SECTORS_LIST = [
    {"id": "banks", "name": "Banks (Nifty Bank)", "symbol": "CNXBANK"},
    {"id": "nbfc", "name": "NBFCs / Financial Services", "symbol": "CNXFIN"},
    {"id": "capital_goods", "name": "Capital Goods & Engineering", "symbol": "CNXINDUS"},
    {"id": "power", "name": "Power & Utilities", "symbol": "CNXPOWER"},
    {"id": "defence", "name": "Defence & Aerospace", "symbol": "CNXDEFENCE"},
    {"id": "railways", "name": "Railways Infrastructure", "symbol": "CNXRAIL"},
    {"id": "real_estate", "name": "Real Estate / Realty", "symbol": "CNXREALTY"},
    {"id": "it", "name": "Information Technology", "symbol": "CNXIT"},
    {"id": "pharma", "name": "Pharmaceuticals & Healthcare", "symbol": "CNXPHARMA"},
    {"id": "fmcg", "name": "FMCG / Staples", "symbol": "CNXFMCG"},
    {"id": "metals", "name": "Metals & Mining", "symbol": "CNXMETAL"},
    {"id": "oil_gas", "name": "Oil, Gas & Energy", "symbol": "CNXENERGY"},
    {"id": "autos", "name": "Automobiles & Auto Components", "symbol": "CNXAUTO"},
    {"id": "consumption", "name": "Consumer Durables / Discretionary", "symbol": "CNXCONSP"},
    {"id": "chemicals", "name": "Specialty Chemicals", "symbol": "CNXCHEM"},
    {"id": "electronics_ems", "name": "Electronics & EMS Manufacturing", "symbol": "CNXELEC"},
    {"id": "data_centers", "name": "Data Centers & Infrastructure", "symbol": "CNXDATA"},
    {"id": "telecom", "name": "Telecom & Connectivity", "symbol": "CNXTEL"},
    {"id": "infrastructure", "name": "Infrastructure & Construction", "symbol": "CNXINFRA"}
]

# Weighting configuration for the general Bull Pocket Score
BULL_POCKET_WEIGHTS = {
    "liquidity_impulse": 0.30,
    "fund_flow_momentum": 0.20,
    "relative_strength": 0.15,
    "currency_tailwind": 0.10,
    "yield_tailwind": 0.10,
    "commodity_earnings": 0.10,
    "volatility_risk": 0.05
}

# Weighting configuration for Global Liquidity Impulse
GLOBAL_LIQUIDITY_IMPULSE_WEIGHTS = {
    "fed_net_liquidity": 0.25,
    "ecb_assets": 0.15,
    "boj_assets": 0.10,
    "pboc_assets": 0.15,
    "global_m2": 0.15,
    "dxy_inverted": 0.10,
    "real_yields_inverted": 0.10
}
