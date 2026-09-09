"""
User Watchlist for Real-Time NSE/BSE Corporate Disclosures.
Contains ~63 primary companies requested by the user, with symbol and scrip mappings.
"""

import re
from typing import Optional, Dict, Any, List

WATCHLIST: List[Dict[str, Any]] = [
    {
        "name": "Adani Energy Solutions Limited",
        "symbol": "ADANIENSOL",
        "bse_code": "539254",
        "aliases": ["ADANI ENERGY", "ADANI TRANSMISSION", "ADANIENSOL"]
    },
    {
        "name": "Adani Power Limited",
        "symbol": "ADANIPOWER",
        "bse_code": "533096",
        "aliases": ["ADANI POWER", "ADANIPOWER"]
    },
    {
        "name": "Arman Financial Services Limited",
        "symbol": "ARMANFIN",
        "bse_code": "531179",
        "aliases": ["ARMAN FINANCIAL", "ARMANFIN"]
    },
    {
        "name": "Bharat Heavy Electricals Ltd.",
        "symbol": "BHEL",
        "bse_code": "500103",
        "aliases": ["BHARAT HEAVY", "BHEL"]
    },
    {
        "name": "BLS International Services Ltd",
        "symbol": "BLS",
        "bse_code": "540073",
        "aliases": ["BLS INTERNATIONAL", "BLS INTL", "BLS"]
    },
    {
        "name": "BSE Limited",
        "symbol": "BSE",
        "bse_code": "",
        "aliases": ["BSE LIMITED", "BOMBAY STOCK EXCHANGE", "BSE"]
    },
    {
        "name": "COFORGE LIMITED",
        "symbol": "COFORGE",
        "bse_code": "532541",
        "aliases": ["COFORGE", "NIIT TECHNOLOGIES"]
    },
    {
        "name": "Delhivery Limited",
        "symbol": "DELHIVERY",
        "bse_code": "543529",
        "aliases": ["DELHIVERY LIMITED", "DELHIVERY"]
    },
    {
        "name": "Eternal Ltd",
        "symbol": "ETERNAL",
        "bse_code": "543320",
        "aliases": ["ETERNAL LIMITED", "ETERNAL LTD", "ZOMATO LIMITED", "ETERNAL", "ZOMATO"]
    },
    {
        "name": "ETHOS LIMITED",
        "symbol": "ETHOSLTD",
        "bse_code": "543532",
        "aliases": ["ETHOS LIMITED", "ETHOSLTD", "ETHOS"]
    },
    {
        "name": "GARWARE HI-TECH FILMS LIMITED",
        "symbol": "GRWRHITECH",
        "bse_code": "500655",
        "aliases": ["GARWARE HI-TECH", "GARWARE POLYESTER", "GRWRHITECH"]
    },
    {
        "name": "HFCL LIMITED",
        "symbol": "HFCL",
        "bse_code": "500183",
        "aliases": ["HFCL", "HIMACHAL FUTURISTIC"]
    },
    {
        "name": "ICICI AMC",
        "symbol": "ICICIAMC",
        "bse_code": "544658",
        "aliases": ["ICICI PRUDENTIAL ASSET", "ICICI AMC", "ICICI PRUDENTIAL MUTUAL", "ICICIPRULI"]
    },
    {
        "name": "Jeena Sikho Lifecare Limited",
        "symbol": "JSLL",
        "bse_code": "544476",
        "aliases": ["JEENA SIKHO", "JSLL", "SHUDDHI"]
    },
    {
        "name": "Kalyan Jewellers India Limited",
        "symbol": "KALYANKJIL",
        "bse_code": "543278",
        "aliases": ["KALYAN JEWELLERS", "KALYANKJIL"]
    },
    {
        "name": "Lenskart Solutions Ltd",
        "symbol": "LENSKART",
        "bse_code": "544600",
        "aliases": ["LENSKART SOLUTIONS", "LENSKART"]
    },
    {
        "name": "Lloyds Metals and Energy Limited",
        "symbol": "LLOYDSME",
        "bse_code": "512455",
        "aliases": ["LLOYDS METALS", "LLOYDSME"]
    },
    {
        "name": "Lalithaa Jewellery Mart Limited",
        "symbol": "LALITHAA",
        "bse_code": "544879",
        "aliases": ["LALITHAA JEWELLERY", "LALITHA JEWELLER", "LALITHA JEWELLERS", "LALITHAA", "LALITHA", "LALITHAA JEWELLERY MART"]
    },
    {
        "name": "Meesho Ltd",
        "symbol": "MEESHO",
        "bse_code": "544632",
        "aliases": ["MEESHO", "FASHNEAR TECHNOLOGIES"]
    },
    {
        "name": "MTAR Technologies Limited",
        "symbol": "MTARTECH",
        "bse_code": "543270",
        "aliases": ["MTAR TECHNOLOGIES", "MTARTECH", "MTAR"]
    },
    {
        "name": "MUTHOOT FINANCE LIMITED",
        "symbol": "MUTHOOTFIN",
        "bse_code": "533398",
        "aliases": ["MUTHOOT FINANCE", "MUTHOOTFIN"]
    },
    {
        "name": "NIPPON LIFE INDIA ASSET MANAGEMENT LIMITED",
        "symbol": "NAM-INDIA",
        "bse_code": "540767",
        "aliases": ["NIPPON LIFE INDIA", "NAM-INDIA", "RELIANCE NIPPON"]
    },
    {
        "name": "NLC India Limited",
        "symbol": "NLCINDIA",
        "bse_code": "513683",
        "aliases": ["NLC INDIA", "NLCINDIA", "NEYVELI LIGNITE"]
    },
    {
        "name": "Polycab India Limited",
        "symbol": "POLYCAB",
        "bse_code": "542652",
        "aliases": ["POLYCAB INDIA", "POLYCAB"]
    },
    {
        "name": "Shadowfax Technologies Ltd",
        "symbol": "SHADOWFAX",
        "bse_code": "544685",
        "aliases": ["SHADOWFAX TECHNOLOGIES", "SHADOWFAX"]
    },
    {
        "name": "Rashi Peripherals Limited",
        "symbol": "RPTECH",
        "bse_code": "544119",
        "aliases": ["RASHI PERIPHERALS", "RPTECH"]
    },
    {
        "name": "RateGain Travel Technologies Limited",
        "symbol": "RATEGAIN",
        "bse_code": "543417",
        "aliases": ["RATEGAIN", "RATE GAIN"]
    },
    {
        "name": "Sky Gold Ltd",
        "symbol": "SKYGOLD",
        "bse_code": "541967",
        "aliases": ["SKY GOLD", "SKYGOLD"]
    },
    {
        "name": "Solar Industries India Limited",
        "symbol": "SOLARINDS",
        "bse_code": "532725",
        "aliases": ["SOLAR INDUSTRIES", "SOLARINDS"]
    },
    {
        "name": "Sterlite Technologies Limited.",
        "symbol": "STLTECH",
        "bse_code": "532374",
        "aliases": ["STERLITE TECHNOLOGIES", "STLTECH", "STL"]
    },
    {
        "name": "Timex Group India Ltd",
        "symbol": "TIMEX",
        "bse_code": "500414",
        "aliases": ["TIMEX GROUP", "TIMEX"]
    },
    {
        "name": "Transformers and Rectifiers (India) Limited",
        "symbol": "TRIL",
        "bse_code": "532928",
        "aliases": ["TRANSFORMERS AND RECTIFIERS", "TARIL", "TRIL"]
    },
    {
        "name": "V2 Retail Limited",
        "symbol": "V2RETAIL",
        "bse_code": "532867",
        "aliases": ["V2 RETAIL", "V2RETAIL"]
    },
    {
        "name": "Tilaknagar Industries Ltd",
        "symbol": "TI",
        "bse_code": "507205",
        "aliases": ["TILAKNAGAR INDUSTRIES", "TILAKNAGAR"]
    },
    {
        "name": "Welspun Corp Limited",
        "symbol": "WELCORP",
        "bse_code": "532144",
        "aliases": ["WELSPUN CORP", "WELCORP"]
    },
    {
        "name": "Aimtron Electronics",
        "symbol": "AIMTRON",
        "bse_code": "",
        "aliases": ["AIMTRON ELECTRONICS", "AIMTRON"]
    },
    {
        "name": "Akiko global",
        "symbol": "AKIKO",
        "bse_code": "",
        "aliases": ["AKIKO GLOBAL", "AKIKO"]
    },
    {
        "name": "Amic Forging Limited",
        "symbol": "AMIC",
        "bse_code": "544037",
        "aliases": ["AMIC FORGING", "AMIC"]
    },
    {
        "name": "Anand Rathi Share",
        "symbol": "ANANDRATHI",
        "bse_code": "543415",
        "aliases": ["ANAND RATHI SHARE", "ANAND RATHI WEALTH", "ANAND RATHI", "ARSSBL"]
    },
    {
        "name": "Apollo Micro Systems Limited",
        "symbol": "APOLLO",
        "bse_code": "540879",
        "aliases": ["APOLLO MICRO SYSTEMS", "APOLLO MICRO"]
    },
    {
        "name": "Creative Graphics Solutions India Limited",
        "symbol": "CGRAPHICS",
        "bse_code": "",
        "aliases": ["CREATIVE GRAPHICS", "CREATIVE GRAPHICS SOLUTIONS", "CGRAPHICS", "CREATIVE"]
    },
    {
        "name": "Felix Industries Ltd",
        "symbol": "FELIX",
        "bse_code": "",
        "aliases": ["FELIX INDUSTRIES", "FELIX"]
    },
    {
        "name": "GSM Foils Limited",
        "symbol": "GSMFOILS",
        "bse_code": "",
        "aliases": ["GSM FOIL", "GSM FOILS", "GSMFOIL", "GSMFOILS", "GSM FOILS LIMITED", "GSM FOILS LTD"]
    },
    {
        "name": "MRP Agro Limited",
        "symbol": "MRPRAGRO",
        "bse_code": "543262",
        "aliases": ["MRP AGRO", "MRPRAGRO", "MRP"]
    },
    {
        "name": "Novus Loyalty Limited",
        "symbol": "NOVUS",
        "bse_code": "544735",
        "aliases": ["NOVUS LOYALTY", "NOVUS LOYALITY", "NOVUS"]
    },
    {
        "name": "OBSC Perfection Limited",
        "symbol": "OBSCP",
        "bse_code": "",
        "aliases": ["OBSC PERFECTION", "OBSCP", "OBSC"]
    },
    {
        "name": "Oriana Power",
        "symbol": "ORIANA",
        "bse_code": "",
        "aliases": ["ORIANA POWER", "ORIANA"]
    },
    {
        "name": "PNGS Reva Diamond Jewellery Limited",
        "symbol": "PNGSREVA",
        "bse_code": "544718",
        "aliases": ["PNGS REVA", "PNGS REVA DIAMOND", "PNGSREVA", "PNGS GARGI", "PNGS"]
    },
    {
        "name": "Purple United Sales Limited",
        "symbol": "PURPLEUTED",
        "bse_code": "",
        "aliases": ["PURPLE UNITED", "PURPLE UNITED SALES", "PURPLEUTED", "PURPLE"]
    },
    {
        "name": "RAJESH POWER SERVICES LIMITED",
        "symbol": "RAJESHPOWER",
        "bse_code": "544291",
        "aliases": ["RAJESH POWER", "RAJESHPOWER", "RAJESH"]
    },
    {
        "name": "RNFi Services",
        "symbol": "RNFI",
        "bse_code": "",
        "aliases": ["RNFI SERVICES", "RNFI"]
    },
    {
        "name": "S J Logistic",
        "symbol": "SJLOGISTIC",
        "bse_code": "",
        "aliases": ["S J LOGISTIC", "SJ LOGISTIC", "SJLOGISTIC"]
    },
    {
        "name": "Saj Hotels Limited",
        "symbol": "SAJHOTELS",
        "bse_code": "",
        "aliases": ["SAJ HOTELS", "SAJ HOTEL", "SAJHOTELS", "SAJHOTEL"]
    },
    {
        "name": "SAT KARTAR LIFE LIMITED",
        "symbol": "SATKARTAR",
        "bse_code": "",
        "aliases": ["SAT KARTAR LIFE", "SAT KARTAR", "SATKARTAR"]
    },
    {
        "name": "SEDEMAC MECHATRONICS LTD",
        "symbol": "SEDEMAC",
        "bse_code": "544723",
        "aliases": ["SEDEMAC MECHATRONICS", "SEDEMAC"]
    },
    {
        "name": "Shree Refrigerations Limited",
        "symbol": "SHREEREF",
        "bse_code": "544458",
        "aliases": ["SHREE REFRIGERATIONS", "SHREE REFRIGERATION", "SHREERF", "SHREEREF", "544078"]
    },
    {
        "name": "Sunita Tools Limited",
        "symbol": "SUNITATOOLS",
        "bse_code": "544001",
        "aliases": ["SUNITA TOOLS", "SUNITATOOLS", "SUNITATOOL"]
    },
    {
        "name": "Telge Projects Limited",
        "symbol": "TELGE",
        "bse_code": "544544",
        "aliases": ["TELGE PROJECTS", "TELGI PROJECT", "TELGE", "TELGI"]
    },
    {
        "name": "Tembo Global Industries Lt",
        "symbol": "TEMBO",
        "bse_code": "",
        "aliases": ["TEMBO GLOBAL", "TEMBO"]
    },
    {
        "name": "Vigor Plast",
        "symbol": "VIGOR",
        "bse_code": "",
        "aliases": ["VIGOR PLAST", "VIGOR"]
    },
    {
        "name": "Vilas Transcore Limited",
        "symbol": "VILAS",
        "bse_code": "",
        "aliases": ["VILAS TRANSCORE", "VILASTRA", "VILAS"]
    },
    {
        "name": "Viviana Power",
        "symbol": "VIVIANA",
        "bse_code": "",
        "aliases": ["VIVIANA POWER", "VIVIANA"]
    },
    {
        "name": "Steel strip wheels ltd.",
        "symbol": "SSWL",
        "bse_code": "513262",
        "aliases": ["STEEL STRIP WHEELS", "STEEL STRIPS WHEELS", "SSWL"]
    },
    {
        "name": "Vegorama Punjabi Angithi Limited",
        "symbol": "VPAL",
        "bse_code": "544765",
        "aliases": ["VEGORAMA PUNJABI ANGITHI", "VEGORAMA", "PUNJABI ANGITHI", "VPAL"]
    },
    {
        "name": "Godrej Properties Limited",
        "symbol": "GODREJPROP",
        "bse_code": "533150",
        "aliases": ["GODREJ PROPERTIES", "GODREJPROP"]
    },
    {
        "name": "Silkflex Polymers India Limited",
        "symbol": "SILKFLEX",
        "bse_code": "",
        "aliases": ["SILKFLEX POLYMERS", "SILKFLEX"]
    },
    {
        "name": "Tipco Engineering India Limited",
        "symbol": "TIPCO",
        "bse_code": "544740",
        "aliases": ["TIPCO ENGINEERING", "TIPCO"]
    },
    {
        "name": "Aeroflex Industries Limited",
        "symbol": "AEROFLEX",
        "bse_code": "543972",
        "aliases": ["AEROFLEX INDUSTRIES", "AEROFLEX"]
    },
    {
        "name": "R R Kabel Limited",
        "symbol": "RRKABEL",
        "bse_code": "543981",
        "aliases": ["R R KABEL", "RR KABEL", "RRKABEL"]
    }
]

def clean_string(text: str) -> str:
    """Normalize string for fuzzy comparison."""
    if not text:
        return ""
    text = re.sub(r'[^a-zA-Z0-9\s]', ' ', text)
    return " ".join(text.upper().split())

import os
import json
from pathlib import Path

CUSTOM_WATCHLIST_FILE = Path(__file__).resolve().parent / "custom_watchlist.json"

def load_custom_watchlist() -> List[Dict[str, Any]]:
    """Load user-added custom watchlist entries from disk."""
    if not CUSTOM_WATCHLIST_FILE.exists():
        return []
    try:
        with open(CUSTOM_WATCHLIST_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def save_custom_watchlist(items: List[Dict[str, Any]]):
    """Save custom watchlist entries to disk."""
    with open(CUSTOM_WATCHLIST_FILE, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=2)

def get_all_watchlist() -> List[Dict[str, Any]]:
    """Get unified list of base watchlist + user-added stocks."""
    base = list(WATCHLIST)
    custom = load_custom_watchlist()
    seen = {item["symbol"].upper() for item in base if item.get("symbol")}
    for c in custom:
        sym = c.get("symbol", "").upper()
        if sym and sym not in seen:
            base.append(c)
            seen.add(sym)
        elif not sym:
            base.append(c)
    return base

def add_stock_to_watchlist(name: str, symbol: str = "", bse_code: str = "", aliases: Optional[List[str]] = None) -> Dict[str, Any]:
    """Add a new company to the watchlist dynamically."""
    custom = load_custom_watchlist()
    sym = symbol.strip().upper() if symbol else ""
    code = bse_code.strip() if bse_code else ""
    alias_list = aliases or [name.upper()]
    if sym and sym not in alias_list:
        alias_list.append(sym)

    new_item = {
        "name": name.strip(),
        "symbol": sym,
        "bse_code": code,
        "aliases": alias_list
    }

    # Deduplicate if already present
    filtered = [c for c in custom if (c.get("symbol", "").upper() != sym or not sym)]
    filtered.append(new_item)
    save_custom_watchlist(filtered)
    return new_item

def remove_stock_from_watchlist(symbol_or_name: str) -> bool:
    """Remove a company from the custom watchlist."""
    custom = load_custom_watchlist()
    target = symbol_or_name.strip().upper()
    initial_len = len(custom)
    filtered = [c for c in custom if c.get("symbol", "").upper() != target and c.get("name", "").upper() != target]
    save_custom_watchlist(filtered)
    return len(filtered) < initial_len

def _names_reasonably_match(watchlist_item: Any, api_name: str) -> bool:
    """
    Cross-verify that the company name from the API is reasonably consistent
    with the expected watchlist company. This prevents BSE exchange-level filings
    (e.g., SAST disclosures received by BSE Ltd about ICICI Bank) from being
    falsely attributed to a watchlist company.

    Returns True if:
    - Either name is empty (can't verify, allow it)
    - Watchlist official name or any alias appears in API name (or vice versa)
    - Meaningful word stem overlap exists between the names/aliases
    """
    if not api_name:
        return True

    # Support passing either dict item or str name for backwards compatibility
    if isinstance(watchlist_item, dict):
        watchlist_name = watchlist_item.get("name", "")
        aliases = watchlist_item.get("aliases", [])
    else:
        watchlist_name = str(watchlist_item or "")
        aliases = []

    w_clean = clean_string(watchlist_name)
    a_clean = clean_string(api_name)

    if not w_clean:
        return True

    # Exact or substring match of official name
    if w_clean == a_clean or w_clean in a_clean or a_clean in w_clean:
        return True

    # Check aliases
    for alias in aliases:
        al_clean = clean_string(alias)
        if al_clean and (al_clean in a_clean or a_clean in al_clean):
            return True

    # Stem / prefix word overlap check
    stop_words = {"LIMITED", "LTD", "PRIVATE", "PVT", "THE", "OF", "AND", "INDIA",
                  "INDUSTRIES", "COMPANY", "CORP", "CORPORATION", "INC", "SERVICES"}
    w_words = [w for w in w_clean.split() if w not in stop_words]
    for al in aliases:
        for w in clean_string(al).split():
            if w not in stop_words:
                w_words.append(w)
    a_words = [w for w in a_clean.split() if w not in stop_words]

    for w1 in w_words:
        for w2 in a_words:
            if w1 == w2:
                return True
            # Prefix stem match (e.g. LALITHA / LALITHAA, JEWELLER / JEWELLERY)
            if len(w1) >= 4 and len(w2) >= 4:
                if w1.startswith(w2) or w2.startswith(w1):
                    return True

    return False


def match_watchlist(
    symbol: Optional[str] = None,
    company_name: Optional[str] = None,
    bse_code: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Check if a disclosure matches any company in the user's priority watchlist.
    Returns the watchlist metadata dictionary if matched, else None.

    Includes cross-verification: when matching by bse_code alone,
    verifies the company_name from the API is consistent with the watchlist entry.
    This prevents BSE exchange-level filings from being falsely attributed.
    """
    sym = (symbol or "").strip().upper()
    comp_clean = clean_string(company_name or "")
    code = str(bse_code or "").strip()

    all_items = get_all_watchlist()
    for item in all_items:
        # 1. Match by Symbol (exact — highly reliable, no cross-check needed)
        item_sym = item["symbol"].upper()
        if sym and sym == item_sym:
            return item

        # 2. Match by BSE Scrip Code (cross-verify company name to prevent false attribution)
        item_code = str(item.get("bse_code", "")).strip()
        if code and item_code and code == item_code:
            # Cross-verify: does the filing company name match the expected company?
            if _names_reasonably_match(item, company_name):
                return item
            else:
                # BSE code matched but company name is completely different
                # This is a cross-company filing (e.g., SAST disclosure)
                continue

        # 3. Match by Official Watchlist Name (if company name is clean and has 2+ words)
        item_name_clean = clean_string(item["name"])
        if comp_clean and len(item_name_clean.split()) >= 2:
            if item_name_clean == comp_clean or item_name_clean in comp_clean:
                return item

        # 4. Match by Aliases
        for alias in item.get("aliases", []):
            alias_clean = clean_string(alias)
            if not alias_clean:
                continue

            # 4a. Exact symbol match against alias (always safe)
            if sym and alias_clean == sym:
                return item

            # 4b. Company name matching — ONLY for multi-word aliases (2+ words)
            #     Single-word aliases like CREATIVE, ETERNAL, PURPLE, TEMBO, ORIANA
            #     are too generic and match unrelated companies (Creative Eye, Eternal Springs, etc.)
            #     They should only match via exact symbol (4a above) or bse_code (step 2).
            alias_words = alias_clean.split()
            if len(alias_words) >= 2 and comp_clean:
                # Support exact and plural/singular variations (e.g. GSM FOIL vs GSM FOILS)
                pattern = rf"\b{re.escape(alias_clean.rstrip('S'))}S?\b"
                if re.search(pattern, comp_clean):
                    return item

    return None
