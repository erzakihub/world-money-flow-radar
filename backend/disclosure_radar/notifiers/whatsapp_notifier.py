"""
WhatsApp Dispatcher for NSE/BSE Corporate Disclosures.
Formats institutional-grade alert cards and delivers them directly to WhatsApp.
Supports CallMeBot, Twilio, and Meta WhatsApp Cloud API gateways.
"""

import os
import re
import urllib.parse
import logging
import requests
from typing import Dict, Any, Optional
from ..config import (
    WHATSAPP_PHONE_NUMBER,
    WHATSAPP_PROVIDER,
    CALLMEBOT_API_KEY,
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_WHATSAPP_FROM,
    META_PHONE_NUMBER_ID,
    META_ACCESS_TOKEN,
    LATEST_ALERTS_FILE
)

logger = logging.getLogger("disclosure_radar.whatsapp")

class WhatsAppNotifier:
    def __init__(self):
        self.provider = WHATSAPP_PROVIDER.lower().strip()
        self.phone = self._clean_phone(WHATSAPP_PHONE_NUMBER)

    def _clean_phone(self, phone: str) -> str:
        """Strip non-digits, keep country code (e.g. 919471009531)."""
        cleaned = re.sub(r"[^\d]", "", phone or "")
        return cleaned

    def format_alert_card(self, item: Dict[str, Any], analysis: Dict[str, Any]) -> str:
        """Format a rich WhatsApp markdown message card."""
        company = item.get("company_name") or "Listed Company"
        symbol = item.get("symbol") or ""
        bse = item.get("bse_code") or ""
        exchange = item.get("exchange") or "EXCHANGE"
        time_str = item.get("broadcast_time") or "Just Now"

        ticker_tag = f"{symbol}" if symbol else ""
        if bse:
            ticker_tag = f"{ticker_tag} | BSE: {bse}" if ticker_tag else f"BSE: {bse}"

        category = analysis.get("category") or item.get("category") or "Corporate Update"
        impact = analysis.get("impact_rating") or "NEUTRAL"
        summary = analysis.get("summary") or item.get("headline") or ""
        interpretation = analysis.get("exact_interpretation") or ""
        pdf_url = item.get("pdf_url") or ""

        # Build clean WhatsApp text
        lines = [
            f"⚡ *NSE/BSE DISCLOSURE RADAR* ⚡",
            f"🏢 *{company.upper()}*",
            f"📌 *Ticker:* `{ticker_tag}` ({exchange})",
            f"🕒 *Time:* {time_str}",
            f"🏷️ *Category:* {category}",
            f"📊 *Impact:* {impact}",
            f"",
            f"📝 *Summary:*",
            f"{summary.strip()}",
            f"",
            f"💡 *Exact Interpretation:*",
            f"{interpretation.strip()}",
        ]

        if pdf_url:
            lines.extend([
                f"",
                f"📎 *Official Regulatory Filing:*",
                f"{pdf_url}"
            ])

        lines.append(f"━━━━━━━━━━━━━━━━━━━━━━")
        return "\n".join(lines)

    def send_via_callmebot(self, message: str) -> bool:
        """Send message via CallMeBot API (free personal WhatsApp gateway)."""
        if not CALLMEBOT_API_KEY:
            logger.warning("CALLMEBOT_API_KEY is not set in .env. Skipping WhatsApp network dispatch.")
            return False

        encoded_text = urllib.parse.quote(message)
        url = f"https://api.callmebot.com/whatsapp.php?phone={self.phone}&text={encoded_text}&apikey={CALLMEBOT_API_KEY}"

        try:
            resp = requests.get(url, timeout=12)
            if resp.status_code == 200 or "Message queued" in resp.text:
                logger.info(f"✅ WhatsApp alert delivered to +{self.phone} via CallMeBot")
                return True
            else:
                logger.error(f"CallMeBot response ({resp.status_code}): {resp.text}")
                return False
        except Exception as e:
            logger.error(f"CallMeBot dispatch exception: {e}")
            return False

    def send_via_twilio(self, message: str) -> bool:
        """Send message via Twilio WhatsApp API."""
        if not (TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN):
            logger.warning("Twilio credentials not configured in .env.")
            return False

        url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"
        data = {
            "From": TWILIO_WHATSAPP_FROM,
            "To": f"whatsapp:+{self.phone}",
            "Body": message
        }
        try:
            resp = requests.post(url, data=data, auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN), timeout=12)
            if resp.status_code in (200, 201):
                logger.info(f"✅ WhatsApp alert delivered to +{self.phone} via Twilio")
                return True
            else:
                logger.error(f"Twilio error ({resp.status_code}): {resp.text}")
                return False
        except Exception as e:
            logger.error(f"Twilio dispatch exception: {e}")
            return False

    def send_via_meta(self, message: str) -> bool:
        """Send message via Meta WhatsApp Cloud API."""
        if not (META_PHONE_NUMBER_ID and META_ACCESS_TOKEN):
            logger.warning("Meta Cloud API credentials not configured in .env.")
            return False

        url = f"https://graph.facebook.com/v19.0/{META_PHONE_NUMBER_ID}/messages"
        headers = {
            "Authorization": f"Bearer {META_ACCESS_TOKEN}",
            "Content-Type": "application/json"
        }
        payload = {
            "messaging_product": "whatsapp",
            "to": self.phone,
            "type": "text",
            "text": {"preview_url": True, "body": message}
        }
        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=12)
            if resp.status_code in (200, 201):
                logger.info(f"✅ WhatsApp alert delivered to +{self.phone} via Meta Cloud API")
                return True
            else:
                logger.error(f"Meta Cloud API error ({resp.status_code}): {resp.text}")
                return False
        except Exception as e:
            logger.error(f"Meta dispatch exception: {e}")
            return False

    def log_alert_to_file(self, message: str):
        """Append formatted alert card to latest_alerts.txt."""
        try:
            with open(LATEST_ALERTS_FILE, "a", encoding="utf-8") as f:
                f.write(message + "\n\n")
        except Exception as e:
            logger.debug(f"Failed to log alert to file: {e}")

    def dispatch(self, item: Dict[str, Any], analysis: Dict[str, Any]) -> str:
        """
        Format card, save to latest_alerts.txt, and dispatch to selected WhatsApp provider.
        Returns delivery status ('SENT', 'FAILED', or 'SKIPPED').
        """
        card = self.format_alert_card(item, analysis)

        # Always record to local alert file
        self.log_alert_to_file(card)

        sent = False
        if self.provider == "callmebot":
            sent = self.send_via_callmebot(card)
        elif self.provider == "twilio":
            sent = self.send_via_twilio(card)
        elif self.provider == "meta_cloud":
            sent = self.send_via_meta(card)
        elif self.provider == "console":
            print("\n" + "="*50)
            print(card)
            print("="*50 + "\n")
            return "SENT"

        if sent:
            return "SENT"
        elif not CALLMEBOT_API_KEY and not TWILIO_AUTH_TOKEN and not META_ACCESS_TOKEN:
            return "LOGGED_NO_KEY"
        return "FAILED"
