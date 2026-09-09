"""
BSE Real-Time Corporate Disclosures Scraper (Mainboard & SME).
Fetches live corporate announcements directly from the Bombay Stock Exchange feed.
Scans multiple active pages concurrently with today's date parameter so older announcements are never lost.
"""

import logging
import datetime
import time
import math
import requests
from typing import List, Dict, Any
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger("disclosure_radar.bse")

class BSEScraper:
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.bseindia.com/",
            "Origin": "https://www.bseindia.com",
            "Connection": "keep-alive"
        }

    def _fetch_page(self, page: int, today_bse: str) -> List[Dict[str, Any]]:
        """Fetch a single page of announcements from BSE."""
        url = f"https://api.bseindia.com/BseIndiaAPI/api/AnnSubCategoryGetData/w?pageno={page}&strCat=-1&strPrevDate={today_bse}&strScrip=&strSearch=P&strToDate={today_bse}&strType=C"
        for attempt in range(2):
            try:
                resp = requests.get(url, headers=self.headers, timeout=12)
                if resp.status_code == 200:
                    data = resp.json()
                    return data.get("Table", []) if isinstance(data, dict) else (data if isinstance(data, list) else [])
            except Exception as e:
                if attempt == 1:
                    logger.debug(f"Error fetching BSE page {page}: {e}")
            if attempt == 0:
                time.sleep(0.5)
        return []

    def get_latest_disclosures(self) -> List[Dict[str, Any]]:
        """Fetch and normalize latest disclosures from BSE live feed across recent pages concurrently."""
        today_bse = datetime.datetime.now().strftime("%Y%m%d")
        results = []
        seen_ids = set()

        GENERIC_PHRASES = (
            "as per attachment", "as per enclosed", "attachment enclosed", 
            "enclosed herewith", "as attached", "pdf attached", 
            "disclosure under reg", "intimation under reg", "announcement under reg",
            "submission of", "details as enclosed", "copy of"
        )

        # Fetch page 1 directly to extract ROWCNT
        url_page1 = f"https://api.bseindia.com/BseIndiaAPI/api/AnnSubCategoryGetData/w?pageno=1&strCat=-1&strPrevDate={today_bse}&strScrip=&strSearch=P&strToDate={today_bse}&strType=C"
        page1_data = {}
        for attempt in range(2):
            try:
                resp = requests.get(url_page1, headers=self.headers, timeout=12)
                if resp.status_code == 200:
                    page1_data = resp.json()
                    break
            except Exception as e:
                if attempt == 1:
                    logger.debug(f"Error fetching BSE page 1: {e}")
            if attempt == 0:
                time.sleep(0.5)

        page1_table = page1_data.get("Table", []) if isinstance(page1_data, dict) else (page1_data if isinstance(page1_data, list) else [])
        page_results = [page1_table]

        total_pages = 8 # Fallback
        if isinstance(page1_data, dict):
            table1 = page1_data.get("Table1", [])
            if isinstance(table1, list) and len(table1) > 0:
                rowcnt = table1[0].get("ROWCNT")
                if rowcnt:
                    try:
                        total_pages = math.ceil(int(rowcnt) / 50)
                    except ValueError:
                        pass
        
        # Cap at maximum 12 pages
        total_pages = min(max(total_pages, 1), 12)

        if total_pages > 1:
            pages_to_fetch = list(range(2, total_pages + 1))
            with ThreadPoolExecutor(max_workers=6) as executor:
                additional_results = list(executor.map(lambda p: self._fetch_page(p, today_bse), pages_to_fetch))
            page_results.extend(additional_results)

        for table in page_results:
            for item in table:
                news_id = item.get("NEWSID") or item.get("ATTACHMENTNAME") or item.get("DissemDT")
                if news_id and news_id in seen_ids:
                    continue
                if news_id:
                    seen_ids.add(news_id)

                scrip_cd = str(item.get("SCRIP_CD", "")).strip()
                company_name = item.get("SLONGNAME", "").strip()
                headline = item.get("HEADLINE", "").strip()
                newssub = item.get("NEWSSUB", "").strip()

                is_headline_generic = not headline or any(p in headline.lower() for p in GENERIC_PHRASES)
                is_newssub_generic = any(p in newssub.lower() for p in GENERIC_PHRASES)

                if is_headline_generic and newssub and not is_newssub_generic:
                    headline = newssub
                elif newssub and not is_newssub_generic and newssub.lower() not in headline.lower():
                    headline = f"{newssub} - {headline}" if is_headline_generic else f"{headline} ({newssub})"
                elif not headline and newssub:
                    headline = newssub

                category = item.get("CATEGORYNAME", "Company Update") or "Company Update"
                subcategory = item.get("SUBCATNAME", "") or ""
                dissem_dt = item.get("DissemDT") or item.get("DT_TM") or item.get("News_submission_dt") or ""

                attach_file = item.get("ATTACHMENTNAME", "") or ""
                pdf_url = ""
                if attach_file:
                    pdf_url = f"https://www.bseindia.com/xml-data/corpfiling/AttachLive/{attach_file.strip()}"

                results.append({
                    "exchange": "BSE",
                    "symbol": "",
                    "bse_code": scrip_cd,
                    "company_name": company_name,
                    "headline": headline,
                    "category": category,
                    "subcategory": subcategory,
                    "pdf_url": pdf_url,
                    "broadcast_time": dissem_dt,
                    "raw_json": item
                })

        return results
