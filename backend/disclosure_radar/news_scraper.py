"""
Real-Time Stock News Scraper for Premier Indian Financial Media.
Whitelisted Sources:
  - CNBC-TV18 Live & Nigel D'Souza (cnbctv18.com)
  - NDTV Profit (ndtvprofit.com)
  - ET NOW & The Economic Times (economictimes.indiatimes.com)
  - Moneycontrol (moneycontrol.com)
  - Zee Business & CNBC Awaaz (zeebiz.com)
  - Reuters India (reuters.com)
  - Trendlyne Alerts (trendlyne.com)

Concurrently queries Google News RSS, matches articles to the user's 70 watchlist stocks,
classifies high-impact market catalysts (brokerage upgrades, block deals, order wins, M&A),
and deduplicates against past alerts.
"""

import logging
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
import datetime
from email.utils import parsedate_to_datetime
import re
from typing import List, Dict, Any, Optional
from concurrent.futures import ThreadPoolExecutor

from .watchlist import get_all_watchlist
from .database import generate_news_id

logger = logging.getLogger("disclosure_radar.news")

# Target reputed media outlets whitelisted by user
WHITELISTED_SITES = (
    "site:cnbctv18.com OR site:moneycontrol.com OR site:ndtvprofit.com OR "
    "site:economictimes.indiatimes.com OR site:zeebiz.com OR site:reuters.com OR site:trendlyne.com"
)

# Standardized display names for publishers
PUBLISHER_DISPLAY_NAMES = {
    "cnbctv18.com": "CNBC-TV18",
    "cnbc tv18": "CNBC-TV18",
    "cnbc-tv18": "CNBC-TV18",
    "moneycontrol": "Moneycontrol",
    "moneycontrol.com": "Moneycontrol",
    "ndtv profit": "NDTV Profit",
    "ndtvprofit.com": "NDTV Profit",
    "the economic times": "The Economic Times / ET NOW",
    "economictimes": "The Economic Times / ET NOW",
    "economictimes.indiatimes.com": "The Economic Times / ET NOW",
    "et now": "ET NOW",
    "zee business": "Zee Business / CNBC Awaaz",
    "zeebiz.com": "Zee Business",
    "zeebiz": "Zee Business",
    "reuters": "Reuters",
    "reuters.com": "Reuters",
    "trendlyne": "Trendlyne",
    "trendlyne.com": "Trendlyne",
}

# Catalyst Regex Classifier
CATALYST_PATTERNS = [
    (
        "🎯 BROKERAGE ACTION & TARGET PRICE",
        "Brokerage rating revision, target price hike/cut, or coverage initiation by marquee institutional desk.",
        re.compile(r'\b(jpmorgan|jefferies|morgan stanley|goldman|clsa|nomura|kotak|motilal|macquarie|citi|ubs|hsbc|prabhudas|nuvama|investec|bernstein|emkay|edelweiss|icici securities|hdfc sec|target price|target of|upgrades|downgrades|overweight|underweight|buy call|sell call|retains buy|initiates coverage|brokerage)\b', re.I)
    ),
    (
        "💼 BLOCK DEAL / PROMOTER ACTION",
        "Institutional block transaction, bulk deal, or promoter stake buying/selling.",
        re.compile(r'(block deal|bulk deal|stake sale|stake purchase|promoter\s+.*?sells|promoter\s+.*?buys|offloads|sells stake|buys stake|sells \d+.*shares|buys \d+.*shares|pe exit|promoter holding)', re.I)
    ),
    (
        "📜 ORDER WIN / STRATEGIC CONTRACT",
        "New commercial contract, EPC order, LOI receipt, or lowest-bidder status.",
        re.compile(r'\b(bags order|secures order|wins order|order worth|order win|epc contract|contract worth|receives loi|letter of intent|lowest bidder|l1 bidder)\b', re.I)
    ),
    (
        "🤝 M&A / JOINT VENTURE / STRATEGIC DEAL",
        "Inorganic acquisition, corporate merger, joint venture, or asset purchase.",
        re.compile(r'\b(acquires|acquisition|merger|amalgamation|takeover|joint venture|\bjv\b|buys out|buys stake in)\b', re.I)
    ),
    (
        "🏭 CAPACITY EXPANSION / CAPEX",
        "New manufacturing facility, capacity expansion, trial run, or commercial commissioning.",
        re.compile(r'\b(capacity expansion|commissioning|commissions|new plant|capex|commercial production|trial run|sets up plant)\b', re.I)
    ),
    (
        "🏛️ POLICY / TARIFF / REGULATION",
        "Government cabinet approval, anti-dumping duty, PLI incentive, or ministry tariff.",
        re.compile(r'\b(cabinet|ccea|ministry|tariff|customs duty|anti-dumping|subsidy|pli scheme|dgtr|sebi|rbi)\b', re.I)
    ),
    (
        "📈 EARNINGS / MANAGEMENT GUIDANCE",
        "Quarterly financial trajectory, margin commentary, or executive guidance.",
        re.compile(r'\b(guidance|beats guidance|growth guidance|q[1-4]|quarterly profit|revenue up|pat up|ebitda|margin|interview|says md|says ceo)\b', re.I)
    ),
]


class StockNewsScraper:
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
        }
        self.stock_metadata = self._build_stock_metadata()
        self.query_chunks = self._build_query_chunks(chunk_size=5)

    def _build_stock_metadata(self) -> Dict[str, Dict[str, Any]]:
        """Map each watchlist stock to search terms and precise matching regexes."""
        stocks = get_all_watchlist()
        meta = {}
        
        # Manual refinements for symbols prone to generic word confusion
        special_patterns = {
            "BSE": (['"BSE Ltd"', '"BSE Limited"', '"shares of BSE"'], re.compile(r'\b(bse\s+ltd|bse\s+limited|shares\s+of\s+bse|bse\s+shares|bse\s+stock|bse\s+surges|bse\s+rallies|bse\s+falls|bse\s+slips|bse\s+gains|bse\s+target|bse\s+q[1-4])\b', re.I)),
            "CREATIVE": (['"Creative Graphics"'], re.compile(r'\bcreative\s+graphics\b', re.I)),
            "PURPLE": (['"Purple United"'], re.compile(r'\bpurple\s+united\b', re.I)),
            "TI": (['"Tilaknagar Industries"'], re.compile(r'\btilaknagar\b', re.I)),
            "ETERNAL": (['"Zomato"', '"Eternal Ltd"'], re.compile(r'\b(zomato|eternal\s+ltd|eternal\s+limited)\b', re.I)),
            "AMIC": (['"Amic Forging"'], re.compile(r'\bamic\s+forging\b', re.I)),
            "FELIX": (['"Felix Industries"'], re.compile(r'\bfelix\s+industries\b', re.I)),
            "VIGOR": (['"Vigor Plast"'], re.compile(r'\bvigor\s+plast\b', re.I)),
            "OBSC": (['"OBSC Perfection"'], re.compile(r'\bobsc\s+perfection\b', re.I)),
            "SEDEMAC": (['"Sedemac"'], re.compile(r'\bsedemac\b', re.I)),
            "VPAL": (['"Vegorama Punjabi Angithi"', '"Punjabi Angithi"'], re.compile(r'\b(vegorama|punjabi\s+angithi)\b', re.I)),
            "SSWL": (['"Steel Strips Wheels"', '"SSWL"'], re.compile(r'\b(steel\s+strips?\s+wheels?|sswl)\b', re.I)),
            "ICICIAMC": (['"ICICI Prudential AMC"', '"ICICI AMC"'], re.compile(r'\b(icici\s+prudential\s+amc|icici\s+amc|icici\s+prudential\s+mutual)\b', re.I)),
            "NAM-INDIA": (['"Nippon Life India AMC"', '"Nippon AMC"'], re.compile(r'\b(nippon\s+life\s+india|nippon\s+amc|reliance\s+nippon)\b', re.I)),
            "BLS": (['"BLS International"'], re.compile(r'\bbls\s+international\b|\bbls\s+intl\b|\bbls\b', re.I)),
            "HFCL": (['"HFCL"'], re.compile(r'\bhfcl\b|\bhimachal\s+futuristic\b', re.I)),
            "RRKABEL": (['"RR Kabel"', '"R R Kabel"'], re.compile(r'\br\s*r\s*kabel\b', re.I)),
            "POLYCAB": (['"Polycab"'], re.compile(r'\bpolycab\b', re.I)),
            "BHEL": (['"BHEL"'], re.compile(r'\bbhel\b|\bbharat\s+heavy\b', re.I)),
            "COFORGE": (['"Coforge"'], re.compile(r'\bcoforge\b|\bniit\s+tech\b', re.I)),
            "ADANIPOWER": (['"Adani Power"'], re.compile(r'\badani\s+power\b', re.I)),
            "ADANIENSOL": (['"Adani Energy Solutions"', '"Adani Energy"'], re.compile(r'\badani\s+energy|\badani\s+transmission|\badaniensol\b', re.I)),
            "DELHIVERY": (['"Delhivery"'], re.compile(r'\bdelhivery\b', re.I)),
            "MTARTECH": (['"MTAR Technologies"', '"MTAR Tech"'], re.compile(r'\bmtar\b', re.I)),
            "AEROFLEX": (['"Aeroflex Industries"'], re.compile(r'\baeroflex\b', re.I)),
            "APOLLO": (['"Apollo Micro Systems"', '"Apollo Micro"'], re.compile(r'\bapollo\s+micro\b', re.I)),
            "GODREJPROP": (['"Godrej Properties"'], re.compile(r'\bgodrej\s+prop', re.I)),
            "KALYANKJIL": (['"Kalyan Jewellers"'], re.compile(r'\bkalyan\s+jeweller', re.I)),
            "MUTHOOTFIN": (['"Muthoot Finance"'], re.compile(r'\bmuthoot\s+finance\b', re.I)),
            "RATEGAIN": (['"RateGain"'], re.compile(r'\brategain\b', re.I)),
            "SOLARINDS": (['"Solar Industries"'], re.compile(r'\bsolar\s+industries\b', re.I)),
            "STLTECH": (['"Sterlite Technologies"', '"Sterlite Tech"'], re.compile(r'\bsterlite\s+tech', re.I)),
            "TRIL": (['"Transformers and Rectifiers"'], re.compile(r'\btransformers\s+and\s+rectifiers\b|\btaril\b', re.I)),
            "V2RETAIL": (['"V2 Retail"'], re.compile(r'\bv2\s+retail\b', re.I)),
            "WELCORP": (['"Welspun Corp"'], re.compile(r'\bwelspun\s+corp\b', re.I)),
            "ETHOSLTD": (['"Ethos Limited"', '"Ethos Ltd"'], re.compile(r'\bethos\b', re.I)),
            "GRWRHITECH": (['"Garware Hi-Tech"'], re.compile(r'\bgarware\s+hi-?tech\b', re.I)),
            "JSLL": (['"Jeena Sikho"'], re.compile(r'\bjeena\s+sikho\b|\bshuddhi\b', re.I)),
            "LLOYDSME": (['"Lloyds Metals"'], re.compile(r'\blloyds\s+metal', re.I)),
            "LALITHAA": (['"Lalithaa Jewellery"', '"Lalitha Jewellery"'], re.compile(r'\blalitha', re.I)),
            "LENSKART": (['"Lenskart"'], re.compile(r'\blenskart\b', re.I)),
            "MEESHO": (['"Meesho"'], re.compile(r'\bmeesho\b', re.I)),
            "NLCINDIA": (['"NLC India"'], re.compile(r'\bnlc\s+india\b|\bneyveli\b', re.I)),
            "SHADOWFAX": (['"Shadowfax"'], re.compile(r'\bshadowfax\b', re.I)),
            "RPTECH": (['"Rashi Peripherals"'], re.compile(r'\brashi\s+peripheral', re.I)),
            "SKYGOLD": (['"Sky Gold"'], re.compile(r'\bsky\s+gold\b', re.I)),
            "TIMEX": (['"Timex Group"'], re.compile(r'\btimex\b', re.I)),
        }

        for stock in stocks:
            sym = stock.get("symbol", "").upper()
            name = stock.get("name", "")
            if not sym:
                continue

            if sym in special_patterns:
                terms, pat = special_patterns[sym]
            else:
                # Default clean name
                clean_name = re.sub(r'\b(limited|ltd|pvt|india|services)\b\.?', '', name, flags=re.I).strip()
                terms = [f'"{clean_name}"'] if len(clean_name) >= 3 else [f'"{sym}"']
                pat = re.compile(rf'\b{re.escape(clean_name)}\b|\b{re.escape(sym)}\b', re.I)

            meta[sym] = {
                "symbol": sym,
                "company_name": name,
                "search_terms": terms,
                "pattern": pat
            }
        return meta

    def _build_query_chunks(self, chunk_size: int = 5) -> List[str]:
        """Combine search terms into batched queries of ~5 terms each."""
        all_terms = []
        for stock_info in self.stock_metadata.values():
            all_terms.extend(stock_info["search_terms"])
        
        # Deduplicate terms while preserving order
        unique_terms = list(dict.fromkeys(all_terms))
        chunks = []
        for i in range(0, len(unique_terms), chunk_size):
            chunk = " OR ".join(unique_terms[i:i + chunk_size])
            chunks.append(chunk)
        return chunks

    def _fetch_chunk_rss(self, chunk: str) -> List[ET.Element]:
        """Fetch RSS feed for a batched query chunk with when:7d filter."""
        query = f"({chunk}) ({WHITELISTED_SITES}) when:7d"
        url = f"https://news.google.com/rss/search?q={urllib.parse.quote(query)}&hl=en-IN&gl=IN&ceid=IN:en"
        req = urllib.request.Request(url, headers=self.headers)
        try:
            with urllib.request.urlopen(req, timeout=12) as resp:
                root = ET.fromstring(resp.read())
                return root.findall(".//item")
        except Exception as e:
            logger.debug(f"Error fetching Google News RSS chunk: {e}")
            return []

    def classify_catalyst(self, title: str) -> tuple:
        """Classify catalyst type and description from headline text."""
        for label, desc, pattern in CATALYST_PATTERNS:
            if pattern.search(title):
                return label, desc
        return "⚡ BREAKING MARKET UPDATE", "Stock-specific financial reporting or breaking price catalyst."

    def normalize_publisher(self, raw_source: str, link: str) -> Optional[str]:
        """Verify publisher is in whitelisted list and return normalized name."""
        src_lower = (raw_source or "").lower().strip()
        link_lower = (link or "").lower().strip()

        for domain, name in PUBLISHER_DISPLAY_NAMES.items():
            if domain in src_lower or domain in link_lower:
                return name
        return None

    def get_latest_news(self, within_hours: float = 24.0) -> List[Dict[str, Any]]:
        """
        Poll Google News RSS concurrently across all watchlist chunks,
        filter for whitelisted publishers within the time window,
        and match articles to watchlist stocks.
        """
        now = datetime.datetime.now(datetime.timezone.utc)
        
        # Concurrently fetch all query chunks
        with ThreadPoolExecutor(max_workers=min(len(self.query_chunks), 12)) as executor:
            chunk_results = list(executor.map(self._fetch_chunk_rss, self.query_chunks))

        raw_items = [it for sub in chunk_results for it in sub]
        logger.debug(f"Scraped {len(raw_items)} raw news items across {len(self.query_chunks)} chunks.")

        seen_articles = set()
        matched_news: List[Dict[str, Any]] = []

        for item in raw_items:
            raw_title = item.findtext("title") or ""
            link = item.findtext("link") or ""
            pub_date_str = item.findtext("pubDate") or ""
            source_el = item.find("source")
            raw_source = source_el.text if source_el is not None else ""

            # Check publisher whitelist
            norm_publisher = self.normalize_publisher(raw_source, link)
            if not norm_publisher:
                continue

            # Check time window
            try:
                dt = parsedate_to_datetime(pub_date_str)
                age_h = (now - dt).total_seconds() / 3600.0
                if age_h > within_hours or age_h < -1.0:
                    continue
            except Exception:
                continue

            # Strip trailing source from title e.g. "Headline - CNBC TV18"
            clean_title = re.sub(r'\s*-\s*[^-]+$', '', raw_title).strip()
            if not clean_title or len(clean_title.split()) < 4:
                continue

            # Filter static SEO price tickers / non-news directories
            if re.search(r'(share\s+price\s+today|stock\s+price\s+live|competitors/peers\s+analysis|share\s+price\s+forecast|historical\s+stock\s+price)', clean_title, re.I):
                continue

            # Detect reporter attribution e.g. Nigel D'Souza
            reporter = None
            if re.search(r'\bnigel\s+d[\'’]?souza\b', clean_title, re.I) or re.search(r'\bnigel\s+d[\'’]?souza\b', link, re.I):
                reporter = "Nigel D'Souza (CNBC-TV18)"

            # Check which watchlist stock(s) are mentioned
            for sym, stock_info in self.stock_metadata.items():
                if stock_info["pattern"].search(clean_title):
                    article_key = f"{sym}:{clean_title}"
                    if article_key in seen_articles:
                        continue
                    seen_articles.add(article_key)

                    catalyst_type, catalyst_desc = self.classify_catalyst(clean_title)
                    news_id = generate_news_id(sym, clean_title, pub_date_str)

                    matched_news.append({
                        "id": news_id,
                        "symbol": sym,
                        "company_name": stock_info["company_name"],
                        "source": norm_publisher,
                        "title": clean_title,
                        "link": link,
                        "catalyst": catalyst_type,
                        "catalyst_desc": catalyst_desc,
                        "reporter": reporter,
                        "published_time": pub_date_str,
                        "published_dt": dt
                    })

        # Sort newest first
        matched_news.sort(key=lambda x: x["published_dt"], reverse=True)
        return matched_news
