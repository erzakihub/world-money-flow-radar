"""
NSE Real-Time Corporate Disclosures Scraper (Mainboard & SME).
Fetches live corporate announcements directly from the National Stock Exchange of India.
"""

import logging
import time
import requests
from typing import List, Dict, Any, Optional

logger = logging.getLogger("disclosure_radar.nse")

class NSEScraper:
    def __init__(self):
        self.session = requests.Session()
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            "Accept": "*/*",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.nseindia.com/companies-listing/corporate-filings/announcements",
            "Connection": "keep-alive"
        }
        self.last_cookie_refresh = 0

    def refresh_cookies(self):
        """Warm up session cookies from NSE domain."""
        try:
            self.session.get("https://www.nseindia.com", headers=self.headers, timeout=10)
            self.last_cookie_refresh = time.time()
        except Exception as e:
            logger.debug(f"NSE cookie warm-up exception: {e}")

    def fetch_feed(self, index: str = "equities") -> List[Dict[str, Any]]:
        """Fetch announcements for index ('equities' or 'sme') with 3-day catchup window."""
        if time.time() - self.last_cookie_refresh > 600:
            self.refresh_cookies()

        import datetime
        now = datetime.datetime.now()
        from_date_str = (now - datetime.timedelta(days=3)).strftime("%d-%m-%Y")
        today_str = now.strftime("%d-%m-%Y")
        url = f"https://www.nseindia.com/api/corporate-announcements?index={index}&from_date={from_date_str}&to_date={today_str}"
        try:
            resp = self.session.get(url, headers=self.headers, timeout=15)
            if resp.status_code == 403:
                # Cookie might be expired; refresh and retry once
                self.refresh_cookies()
                resp = self.session.get(url, headers=self.headers, timeout=15)

            if resp.status_code != 200:
                # Fallback to index URL without date if specific date query fails
                fallback_url = f"https://www.nseindia.com/api/corporate-announcements?index={index}"
                resp = self.session.get(fallback_url, headers=self.headers, timeout=12)

            if resp.status_code != 200:
                logger.warning(f"NSE {index} returned status {resp.status_code}")
                return []

            data = resp.json()
            if isinstance(data, list):
                return data
            elif isinstance(data, dict):
                return data.get("data", [])
            return []
        except Exception as e:
            logger.error(f"Error fetching NSE announcements ({index}): {e}")
            return []

    def get_latest_disclosures(self) -> List[Dict[str, Any]]:
        """Fetch and normalize latest disclosures from both NSE Mainboard and SME."""
        results = []
        raw_items = []
        raw_items.extend(self.fetch_feed("equities"))
        raw_items.extend(self.fetch_feed("sme"))

        for item in raw_items:
            symbol = item.get("symbol", "").strip()
            company_name = item.get("sm_name", "").strip()
            desc = item.get("desc", "").strip()
            att_text = item.get("attchmntText", "") or ""
            headline = att_text.strip() if att_text.strip() else desc

            an_dt = item.get("an_dt") or item.get("dt") or ""
            pdf_url = item.get("attchmntFile", "")
            if pdf_url and not pdf_url.startswith("http"):
                pdf_url = f"https://nsearchives.nseindia.com/corporate/{pdf_url.lstrip('/')}"

            results.append({
                "exchange": "NSE",
                "symbol": symbol,
                "bse_code": "",
                "company_name": company_name,
                "headline": headline,
                "category": desc or "Company Update",
                "subcategory": "",
                "pdf_url": pdf_url,
                "broadcast_time": an_dt,
                "raw_json": item
            })

        return results
