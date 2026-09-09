"""
Always-Running Background Daemon for NSE/BSE Corporate Disclosure Radar.
Continuously monitors exchange feeds every 15 seconds, extracts filings,
performs fast institutional AI/heuristic interpretations, and dispatches
instant Telegram notifications on the spot with zero delay and zero repetitions.
"""

import os
import sys
import re
import time
import signal
import datetime
import logging
from typing import Dict, Any, Optional, Tuple, Set, List

from .config import (
    POLL_INTERVAL_SECONDS,
    WATCHLIST_ONLY,
    FILTER_ROUTINE_NOISE,
    FILTER_AMC_SCHEME_FILINGS,
    ONLY_TIER_1_ALERTS,
    ENABLE_NEWS_RADAR,
    NEWS_POLL_INTERVAL_SECONDS,
    LOG_FILE_PATH,
    PID_FILE_PATH,
    WHATSAPP_PHONE_NUMBER,
    ALERT_CHANNEL,
    TELEGRAM_BOT_TOKEN
)
from .database import (
    init_db,
    generate_disclosure_id,
    is_disclosure_seen,
    get_all_seen_ids,
    save_disclosure,
    update_whatsapp_status,
    get_stats,
    generate_news_id,
    is_news_seen,
    get_all_seen_news_ids,
    save_news_item,
    update_news_status
)
from .watchlist import match_watchlist, get_all_watchlist
from .scrapers.nse_scraper import NSEScraper
from .scrapers.bse_scraper import BSEScraper
from .news_scraper import StockNewsScraper
from .analyzer.pdf_extractor import extract_pdf_text
from .analyzer.interpreter import analyze_disclosure
from .notifiers.whatsapp_notifier import WhatsAppNotifier
from .notifiers.telegram_notifier import TelegramNotifier

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE_PATH, encoding="utf-8"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("disclosure_radar.daemon")


def parse_broadcast_time(ts_str: str) -> Optional[datetime.datetime]:
    """Parse various exchange timestamp formats into a datetime object."""
    if not ts_str:
        return None
    s = str(ts_str).strip()
    clean_s = s.split('+')[0].rstrip('Z')
    for fmt in [
        '%Y-%m-%dT%H:%M:%S.%f',
        '%Y-%m-%dT%H:%M:%S',
        '%Y-%m-%d %H:%M:%S',
        '%d-%b-%Y %H:%M:%S',
        '%d-%m-%Y %H:%M:%S',
        '%d/%m/%Y %H:%M:%S',
        '%d-%b-%Y %H:%M',
        '%d/%m/%Y %H:%M',
        '%Y-%m-%d',
    ]:
        try:
            return datetime.datetime.strptime(clean_s, fmt)
        except ValueError:
            continue
    return None


def check_announcement_freshness(ts_str: str, max_age_minutes: float = 25.0) -> Tuple[bool, float]:
    """
    Check if an announcement was published recently.
    Returns (is_fresh, age_in_minutes).
    If timestamp cannot be parsed, assumes fresh (True, 0.0).
    """
    dt = parse_broadcast_time(ts_str)
    if not dt:
        return True, 0.0
    now = datetime.datetime.now()
    age_minutes = (now - dt).total_seconds() / 60.0
    # Future timestamp with clock drift (< 5 mins) is treated as fresh
    if age_minutes < 0 and age_minutes > -5:
        return True, 0.0
    return age_minutes <= max_age_minutes, age_minutes


def extract_headline_keywords(text: str) -> Set[str]:
    """Extract significant keywords from a headline for cross-exchange similarity comparison."""
    t = re.sub(r'[^a-zA-Z0-9\s]', ' ', (text or '').lower())
    stop_words = {
        'the', 'and', 'of', 'for', 'in', 'to', 'a', 'an', 'is', 'at', 'by',
        'under', 'reg', 'regulation', '30', 'sebi', 'lodr', 'intimation',
        'outcome', 'meeting', 'board', 'directors', 'updates', 'submission',
        'copy', 'disclosure', 'regarding', 'enclosed', 'herewith', 'ltd', 'limited'
    }
    return {w for w in t.split() if w not in stop_words and len(w) > 2}


class DisclosureRadarDaemon:
    def __init__(self, run_once: bool = False):
        self.run_once = run_once
        self.running = True
        self.is_first_cycle = True
        self.seen_ids: Set[str] = set()
        self.recent_alerts: Dict[str, List[Tuple[float, Set[str]]]] = {}
        self.nse_scraper = NSEScraper()
        self.bse_scraper = BSEScraper()
        self.news_scraper = StockNewsScraper()
        self.seen_news_ids: Set[str] = set()
        self.last_news_poll_time: float = 0.0
        self.is_first_news_cycle: bool = True
        self.whatsapp_notifier = WhatsAppNotifier()
        self.telegram_notifier = TelegramNotifier()

        # Handle process termination signals
        try:
            signal.signal(signal.SIGINT, self._handle_signal)
            signal.signal(signal.SIGTERM, self._handle_signal)
        except (ValueError, AttributeError):
            pass

    def _handle_signal(self, signum, frame):
        logger.info(f"Received termination signal ({signum}). Gracefully stopping daemon...")
        self.running = False
        self._remove_pid()
        sys.exit(0)

    def _write_pid(self):
        try:
            with open(PID_FILE_PATH, "w") as f:
                f.write(str(os.getpid()))
        except Exception as e:
            logger.error(f"Failed to write PID file: {e}")

    def _remove_pid(self):
        try:
            if os.path.exists(PID_FILE_PATH):
                os.remove(PID_FILE_PATH)
        except Exception as e:
            logger.error(f"Failed to remove PID file: {e}")

    def record_alert_sent(self, canonical_key: str, headline: str):
        """Record that an alert was dispatched for cross-exchange deduplication."""
        if canonical_key not in self.recent_alerts:
            self.recent_alerts[canonical_key] = []
        kw = extract_headline_keywords(headline)
        self.recent_alerts[canonical_key].append((time.time(), kw))

    def is_duplicate_alert(self, canonical_key: str, headline: str, within_minutes: float = 60.0) -> bool:
        """Check if an alert was already dispatched for this company with a similar headline recently."""
        if canonical_key not in self.recent_alerts:
            return False
        now = time.time()
        current_keywords = extract_headline_keywords(headline)
        if not current_keywords:
            return False
        # Clean up entries older than 2 hours
        self.recent_alerts[canonical_key] = [
            (ts, kw) for ts, kw in self.recent_alerts[canonical_key]
            if (now - ts) < 7200
        ]
        for past_time, past_keywords in self.recent_alerts[canonical_key]:
            if (now - past_time) <= within_minutes * 60:
                overlap = current_keywords & past_keywords
                if len(overlap) >= 2 or (len(current_keywords) <= 2 and len(overlap) >= 1):
                    return True
        return False

    def process_item(self, item: Dict[str, Any]):
        exchange = item.get("exchange", "EXCHANGE")
        symbol = item.get("symbol", "")
        bse_code = item.get("bse_code", "")
        company_name = item.get("company_name", "")
        headline = item.get("headline", "")
        broadcast_time = item.get("broadcast_time", "")
        category = item.get("category", "")
        pdf_url = item.get("pdf_url", "")

        # 1. Fast In-Memory & Database Deduplication Check
        disc_id = generate_disclosure_id(exchange, symbol, bse_code, broadcast_time, headline)
        if disc_id in self.seen_ids or is_disclosure_seen(disc_id):
            self.seen_ids.add(disc_id)
            return

        # 2. Check Watchlist Match
        matched_watch = match_watchlist(symbol, company_name, bse_code)
        is_watch = matched_watch is not None

        if is_watch:
            company_name = matched_watch["name"]
            if not symbol and matched_watch.get("symbol"):
                symbol = matched_watch["symbol"]
                item["symbol"] = symbol
            if not bse_code and matched_watch.get("bse_code"):
                bse_code = matched_watch["bse_code"]
                item["bse_code"] = bse_code
            item["company_name"] = company_name

        # If user configured WATCHLIST_ONLY and item is not in watchlist, save to DB and skip alerting
        if WATCHLIST_ONLY and not is_watch:
            record = {
                "id": disc_id,
                "exchange": exchange,
                "symbol": symbol,
                "bse_code": bse_code,
                "company_name": company_name,
                "headline": headline,
                "category": category,
                "subcategory": item.get("subcategory", ""),
                "pdf_url": pdf_url,
                "broadcast_time": broadcast_time,
                "is_watchlist": 0,
                "impact_rating": "NEUTRAL",
                "interpretation": "Non-watchlist filing recorded.",
                "whatsapp_status": "SKIPPED_NOT_WATCHLIST",
                "raw_json": item.get("raw_json", {})
            }
            save_disclosure(record)
            self.seen_ids.add(disc_id)
            return

        # 3. Freshness Check: Skip historical / delayed filings (e.g. from hours ago during startup/redeploy)
        # On first cycle after startup/redeploy, max_age is 15 mins. During live cycles, 25 mins.
        max_age = 15.0 if self.is_first_cycle else 25.0
        is_fresh, age_mins = check_announcement_freshness(broadcast_time, max_age_minutes=max_age)

        if not is_fresh:
            logger.info(f"⏩ Skipping historical filing for {company_name} (Age: {age_mins:.0f}m > {max_age:.0f}m): {headline[:50]}...")
            record = {
                "id": disc_id,
                "exchange": exchange,
                "symbol": symbol,
                "bse_code": bse_code,
                "company_name": company_name,
                "headline": headline,
                "category": category,
                "subcategory": item.get("subcategory", ""),
                "pdf_url": pdf_url,
                "broadcast_time": broadcast_time,
                "is_watchlist": 1 if is_watch else 0,
                "impact_rating": "NEUTRAL",
                "interpretation": f"Historical filing recorded (published {age_mins:.0f}m ago).",
                "whatsapp_status": "SKIPPED_HISTORICAL",
                "raw_json": item.get("raw_json", {})
            }
            save_disclosure(record)
            self.seen_ids.add(disc_id)
            return

        # 4. Cross-Exchange Duplicate Check (e.g. filed on NSE, then reported on BSE 1 min later)
        canonical_key = (matched_watch.get("symbol") if matched_watch else None) or company_name
        if canonical_key and self.is_duplicate_alert(canonical_key, headline, within_minutes=60.0):
            logger.info(f"⏩ Skipping cross-exchange duplicate alert for {company_name} from {exchange}: {headline[:50]}...")
            record = {
                "id": disc_id,
                "exchange": exchange,
                "symbol": symbol,
                "bse_code": bse_code,
                "company_name": company_name,
                "headline": headline,
                "category": category,
                "subcategory": item.get("subcategory", ""),
                "pdf_url": pdf_url,
                "broadcast_time": broadcast_time,
                "is_watchlist": 1 if is_watch else 0,
                "impact_rating": "NEUTRAL",
                "interpretation": "Cross-exchange duplicate of alert already sent today.",
                "whatsapp_status": "SKIPPED_CROSS_EXCHANGE_DUPLICATE",
                "raw_json": item.get("raw_json", {})
            }
            save_disclosure(record)
            self.seen_ids.add(disc_id)
            return

        logger.info(f"🎯 NEW REAL-TIME DISCLOSURE [{exchange}]: {company_name} ({symbol or bse_code}) - {headline[:60]}...")

        # 5. Extract PDF text if available
        pdf_text = ""
        if pdf_url:
            pdf_text = extract_pdf_text(pdf_url, max_pages=3, timeout=8)

        # 6. Analyze & Generate Exact Interpretation
        analysis = analyze_disclosure(
            company_name=company_name,
            symbol=symbol or bse_code,
            headline=headline,
            category=category,
            pdf_text=pdf_text,
            subcategory=item.get("subcategory", "")
        )

        is_routine = analysis.get("is_routine", False)
        tier = analysis.get("tier", "tier_2")

        # 6a. Filter AMC mutual fund scheme filings (Reg 90 daily NAVs, monthly scheme portfolios)
        if FILTER_AMC_SCHEME_FILINGS:
            subcat_lower = str(item.get("subcategory", "")).lower()
            cat_lower = str(category).lower()
            hl_lower = str(headline).lower()
            if (
                "reg. 90" in subcat_lower
                or "reg. 90" in cat_lower
                or "reg. 90" in hl_lower
                or "mutual fund" in cat_lower
                or "declaration of   nav" in subcat_lower
                or "declaration of nav" in subcat_lower
                or "portfolio of mutual fund" in subcat_lower
            ):
                logger.info(f"⏩ AMC Mutual Fund scheme filing filtered for {company_name}: {headline[:50]}...")
                record = {
                    "id": disc_id,
                    "exchange": exchange,
                    "symbol": symbol,
                    "bse_code": bse_code,
                    "company_name": company_name,
                    "headline": headline,
                    "category": analysis.get("category", category),
                    "subcategory": item.get("subcategory", ""),
                    "pdf_url": pdf_url,
                    "broadcast_time": broadcast_time,
                    "is_watchlist": 1 if is_watch else 0,
                    "impact_rating": "NEUTRAL",
                    "interpretation": "AMC mutual fund scheme filing recorded silently.",
                    "whatsapp_status": "SKIPPED_AMC_SCHEME_FILING",
                    "raw_json": item.get("raw_json", {})
                }
                save_disclosure(record)
                self.seen_ids.add(disc_id)
                return

        # 6b. Filter Tier 3 procedural noise (newspaper ads, reg 74(5) demat, trading window closures, etc.)
        if FILTER_ROUTINE_NOISE and (is_routine or tier == "tier_3"):
            logger.info(f"⏩ Tier 3 procedural noise filtered for {company_name}: {headline[:50]}...")
            record = {
                "id": disc_id,
                "exchange": exchange,
                "symbol": symbol,
                "bse_code": bse_code,
                "company_name": company_name,
                "headline": headline,
                "category": analysis.get("category", category),
                "subcategory": item.get("subcategory", ""),
                "pdf_url": pdf_url,
                "broadcast_time": broadcast_time,
                "is_watchlist": 1 if is_watch else 0,
                "impact_rating": analysis.get("impact_rating", "NEUTRAL"),
                "interpretation": analysis.get("exact_interpretation", ""),
                "whatsapp_status": "SKIPPED_PROCEDURAL_NOISE",
                "raw_json": item.get("raw_json", {})
            }
            save_disclosure(record)
            self.seen_ids.add(disc_id)
            return

        # 6c. Enforce ONLY Tier 1 announcements for Telegram/WhatsApp alerts
        if ONLY_TIER_1_ALERTS and tier != "tier_1":
            logger.info(f"⏩ Non-Tier-1 filing recorded silently for {company_name} ({tier}): {headline[:50]}...")
            record = {
                "id": disc_id,
                "exchange": exchange,
                "symbol": symbol,
                "bse_code": bse_code,
                "company_name": company_name,
                "headline": headline,
                "category": analysis.get("category", category),
                "subcategory": item.get("subcategory", ""),
                "pdf_url": pdf_url,
                "broadcast_time": broadcast_time,
                "is_watchlist": 1 if is_watch else 0,
                "impact_rating": analysis.get("impact_rating", "NEUTRAL"),
                "interpretation": analysis.get("exact_interpretation", ""),
                "whatsapp_status": "SKIPPED_NOT_TIER_1",
                "raw_json": item.get("raw_json", {})
            }
            save_disclosure(record)
            self.seen_ids.add(disc_id)
            return

        # 7. Dispatch Alert Instantly
        dispatch_status = "SKIPPED"
        if ALERT_CHANNEL in ("telegram", "both"):
            logger.info(f"🚀 Dispatching Instant Telegram Alert for {company_name}...")
            dispatch_status = self.telegram_notifier.dispatch(item, analysis)

        if ALERT_CHANNEL in ("whatsapp", "both"):
            logger.info(f"🚀 Dispatching WhatsApp Alert for {company_name} to {WHATSAPP_PHONE_NUMBER}...")
            wa_status = self.whatsapp_notifier.dispatch(item, analysis)
            if dispatch_status != "SENT":
                dispatch_status = wa_status

        # 8. Record Alert in Dedup Tracker to block cross-exchange repetitions
        if canonical_key and dispatch_status == "SENT":
            self.record_alert_sent(canonical_key, headline)

        # 9. Save Record in Database
        record = {
            "id": disc_id,
            "exchange": exchange,
            "symbol": symbol,
            "bse_code": bse_code,
            "company_name": company_name,
            "headline": headline,
            "category": analysis.get("category", category),
            "subcategory": item.get("subcategory", ""),
            "pdf_url": pdf_url,
            "broadcast_time": broadcast_time,
            "is_watchlist": 1 if is_watch else 0,
            "impact_rating": analysis.get("impact_rating", "NEUTRAL"),
            "interpretation": analysis.get("exact_interpretation", ""),
            "whatsapp_status": dispatch_status,
            "raw_json": item.get("raw_json", {})
        }
        save_disclosure(record)
        self.seen_ids.add(disc_id)

    def poll_news_cycle(self):
        """Poll Google News RSS for whitelisted breaking news on watchlist stocks."""
        if not ENABLE_NEWS_RADAR:
            return

        logger.debug("Polling stock news feeds across whitelisted financial media...")
        try:
            # On first cycle or daemon start, scan past 24 hours to catch today's news
            hours_window = 24.0 if self.is_first_news_cycle else 2.0
            news_items = self.news_scraper.get_latest_news(within_hours=hours_window)

            new_count = 0
            for item in news_items:
                news_id = item["id"]
                if news_id in self.seen_news_ids or is_news_seen(news_id):
                    continue

                self.seen_news_ids.add(news_id)
                new_count += 1

                company_name = item.get("company_name", "")
                symbol = item.get("symbol", "")
                source = item.get("source", "")
                title = item.get("title", "")

                logger.info(f"📰 Breaking Stock News for {symbol} ({company_name}) from {source}: {title[:60]}...")

                # Dispatch Telegram alert
                status = "SKIPPED"
                if ALERT_CHANNEL in ("telegram", "both"):
                    status = self.telegram_notifier.dispatch_news(item)

                # Persist to database
                db_record = {
                    "id": news_id,
                    "symbol": symbol,
                    "company_name": company_name,
                    "source": source,
                    "title": title,
                    "link": item.get("link", ""),
                    "catalyst": item.get("catalyst", "MARKET NEWS"),
                    "published_time": item.get("published_time", ""),
                    "telegram_status": status
                }
                save_news_item(db_record)

            if new_count > 0:
                logger.info(f"✅ Dispatched {new_count} breaking stock news alerts to Telegram.")

            if self.is_first_news_cycle:
                self.is_first_news_cycle = False

        except Exception as e:
            logger.error(f"Error during stock news poll cycle: {e}")

    def poll_cycle(self):
        """Execute a single polling pass across NSE, BSE, and News feeds."""
        logger.debug("Polling NSE and BSE corporate announcement feeds...")

        # 1. Fetch NSE announcements (equities & SME)
        try:
            nse_items = self.nse_scraper.get_latest_disclosures()
            for item in nse_items:
                self.process_item(item)
        except Exception as e:
            logger.error(f"Error during NSE poll cycle: {e}")

        # 2. Fetch BSE announcements
        try:
            bse_items = self.bse_scraper.get_latest_disclosures()
            for item in bse_items:
                self.process_item(item)
        except Exception as e:
            logger.error(f"Error during BSE poll cycle: {e}")

        # 3. Fetch Stock News (every NEWS_POLL_INTERVAL_SECONDS)
        now_ts = time.time()
        if ENABLE_NEWS_RADAR and (now_ts - self.last_news_poll_time >= NEWS_POLL_INTERVAL_SECONDS):
            self.last_news_poll_time = now_ts
            self.poll_news_cycle()

        if self.is_first_cycle:
            self.is_first_cycle = False
            logger.info("✅ First poll cycle completed. Initial seeding done. Live instant alerting active!")

    def run(self):
        """Main daemon loop."""
        init_db()
        self._write_pid()
        self.seen_ids = get_all_seen_ids()
        self.seen_news_ids = get_all_seen_news_ids()
        logger.info(f"Loaded {len(self.seen_ids)} previously seen disclosure IDs from database.")
        logger.info(f"Loaded {len(self.seen_news_ids)} previously seen news IDs from database.")

        logger.info("=" * 65)
        logger.info("📡 24/7 NSE & BSE Corporate Disclosure Radar Started")
        logger.info(f"🎯 Target Watchlist: {len(get_all_watchlist())} companies")
        logger.info(f"📰 Stock News Radar: {'ENABLED (every ' + str(NEWS_POLL_INTERVAL_SECONDS) + 's)' if ENABLE_NEWS_RADAR else 'DISABLED'}")
        logger.info(f"📱 Alert Channel: {ALERT_CHANNEL}")
        logger.info(f"⏱️ Poll Interval: {POLL_INTERVAL_SECONDS} seconds")
        logger.info("=" * 65)

        try:
            while self.running:
                start_t = time.time()
                self.poll_cycle()

                if self.run_once:
                    logger.info("Single pass run completed (--once). Exiting.")
                    break

                elapsed = time.time() - start_t
                sleep_time = max(1.0, POLL_INTERVAL_SECONDS - elapsed)
                time.sleep(sleep_time)
        finally:
            self._remove_pid()
            logger.info("🛑 Disclosure Radar Daemon stopped.")


def main():
    run_once = "--once" in sys.argv
    daemon = DisclosureRadarDaemon(run_once=run_once)
    daemon.run()


if __name__ == "__main__":
    main()
