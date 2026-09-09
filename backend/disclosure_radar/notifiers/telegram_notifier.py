"""
Telegram Dispatcher for NSE/BSE Corporate Disclosures.
100% Free Forever, Sub-second delivery, rich formatting, and direct push alerts to mobile.
Supports:
  - Single Bot with multiple recipients / chat IDs (comma-separated: TELEGRAM_CHAT_ID="id1, id2")
  - Secondary Bot / Multi-bot API (TELEGRAM_BOT_TOKEN_2 and TELEGRAM_CHAT_ID_2)
  - Telegram Groups and Channels (using group chat ID e.g. -100xxxxxxxxxx)
"""

import logging
import requests
import html
from typing import Dict, Any, Optional, List, Tuple
from ..config import (
    TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, 
    TELEGRAM_BOT_TOKEN_2, TELEGRAM_CHAT_ID_2,
    LATEST_ALERTS_FILE
)

logger = logging.getLogger("disclosure_radar.telegram")

def sanitize_for_telegram_html(text: str) -> str:
    """Escape HTML but preserve intentional styling tags <b>, </b>, <i>, </i>, <code>, </code>."""
    t = str(text).replace("<b>", "[[B]]").replace("</b>", "[[/B]]")
    t = t.replace("<code>", "[[C]]").replace("</code>", "[[/C]]")
    t = t.replace("<i>", "[[I]]").replace("</i>", "[[/I]]")
    t = html.escape(t, quote=False)
    t = t.replace("[[B]]", "<b>").replace("[[/B]]", "</b>")
    t = t.replace("[[C]]", "<code>").replace("[[/C]]", "</code>")
    t = t.replace("[[I]]", "<i>").replace("[[/I]]", "</i>")
    return t

class TelegramNotifier:
    def __init__(self, bot_token: Optional[str] = None, chat_id: Optional[str] = None):
        self.bot_token = bot_token or TELEGRAM_BOT_TOKEN
        self.chat_id = chat_id or TELEGRAM_CHAT_ID

    def format_alert_card(self, item: Dict[str, Any], analysis: Dict[str, Any]) -> str:
        """Format a clean, high-impact Telegram alert card in HTML."""
        from datetime import datetime, timedelta

        company = html.escape(str(item.get("company_name") or "Listed Company"))
        symbol = html.escape(str(item.get("symbol") or ""))
        bse = html.escape(str(item.get("bse_code") or ""))
        exchange = html.escape(str(item.get("exchange") or "EXCHANGE"))
        raw_time = str(item.get("broadcast_time") or "Just Now")
        time_display = raw_time
        if "T" in raw_time:
            try:
                dt_part, tm_part = raw_time.split("T", 1)
                tm = tm_part.split(".")[0]
                hh, mm = tm.split(":")[:2]
                hour = int(hh)
                minute = int(mm)
                ampm = "AM" if hour < 12 else "PM"
                h12 = hour % 12 or 12
                
                today_str = datetime.now().strftime("%Y-%m-%d")
                yesterday_str = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
                
                if dt_part == today_str:
                    time_display = f"Today, {h12:02d}:{minute:02d} {ampm}"
                elif dt_part == yesterday_str:
                    time_display = f"Yesterday, {h12:02d}:{minute:02d} {ampm}"
                else:
                    time_display = dt_part
            except Exception:
                time_display = raw_time
        time_str = html.escape(time_display)

        ticker_tag = f"<code>{symbol}</code>" if symbol else ""
        if bse:
            ticker_tag = f"{ticker_tag} | BSE: <code>{bse}</code>" if ticker_tag else f"BSE: <code>{bse}</code>"

        category = html.escape(str(analysis.get("category") or item.get("category") or "Corporate Update"))
        impact = html.escape(str(analysis.get("impact_rating") or "🟡 NEUTRAL"))
        summary = sanitize_for_telegram_html(analysis.get("summary") or item.get("headline") or "")
        interpretation = sanitize_for_telegram_html(analysis.get("exact_interpretation") or "")
        
        raw_amount = analysis.get("amount")
        if not raw_amount or str(raw_amount).strip().lower() in ("none", "null", "false", ""):
            amount = ""
        else:
            amount = html.escape(str(raw_amount))
            
        pdf_url = item.get("pdf_url") or ""

        tier = str(analysis.get("tier", "tier_2")).lower()
        cat_lower = str(analysis.get("category", "")).lower()

        def build_lines(interp: str) -> List[str]:
            lines = []
            
            # 1. Quarterly Financial Results (Reg 33)
            if "financial results" in cat_lower or "quarterly results" in cat_lower or category == "Result":
                lines = [
                    f"⚡ <b>FINANCIAL RESULTS RADAR</b> ⚡",
                    f"🏢 <b>{company.upper()}</b>",
                    f"📌 <b>Ticker:</b> {ticker_tag} ({exchange})",
                    f"🕒 <b>Time:</b> {time_str} | 📊 <b>Impact:</b> {impact}",
                    f"",
                    f"📊 <b>FINANCIAL PERFORMANCE:</b>",
                    f"{summary.strip()}",
                    f"",
                    f"🎯 <b>Fund Manager Assessment:</b>",
                    f"{interp.strip()}",
                ]
                
            # 1B. Monthly Business & Sales Update
            elif "monthly" in cat_lower and any(k in cat_lower for k in ["sales", "business", "volume", "update", "dispatch", "performance"]):
                period = html.escape(str(analysis.get("period") or "Monthly Performance"))
                lines = [
                    f"📊 <b>MONTHLY BUSINESS & SALES UPDATE</b> 📊",
                    f"🏢 <b>{company.upper()}</b>",
                    f"📌 <b>Ticker:</b> {ticker_tag} ({exchange})",
                    f"🕒 <b>Time:</b> {time_str} | 📊 <b>Impact:</b> {impact}",
                    f"🗓️ <b>Period:</b> <b>{period}</b>",
                ]
                if amount:
                    lines.append(f"💰 <b>Net Sales / Volume:</b> <b>{amount}</b>")
                lines.extend([
                    f"",
                    f"📈 <b>MONTHLY PERFORMANCE BREAKDOWN:</b>",
                    f"{summary.strip()}",
                    f"",
                    f"🎯 <b>Fund Manager Assessment:</b>",
                    f"{interp.strip()}",
                ])
                
            # 2. Board Meeting Prior Intimation
            elif "board meeting" in cat_lower and ("prior" in cat_lower or "intimation" in cat_lower):
                meeting_date = html.escape(str(analysis.get("meeting_date") or "Upcoming"))
                agendas = html.escape(str(analysis.get("agendas") or "Financial Results & Corporate Matters"))
                lines = [
                    f"📅 <b>BOARD MEETING INTIMATION</b>",
                    f"🏢 <b>{company.upper()}</b>",
                    f"📌 <b>Ticker:</b> {ticker_tag} ({exchange}) | 🕒 {time_str}",
                    f"🗓️ <b>Meeting Date:</b> <b>{meeting_date}</b>",
                    f"🎯 <b>Key Agendas:</b> <b>{agendas}</b>",
                    f"",
                    f"📝 <b>Summary:</b>",
                    f"{summary.strip()}",
                    f"",
                    f"🎯 <b>Fund Manager Assessment:</b>",
                    f"{interp.strip()}",
                ]
                
            # 3. Strategic Tie-Up / Press Release / MOU
            elif any(k in cat_lower for k in ["strategic tie-up", "press release", "partnership", "mou", "collaboration"]):
                partner = html.escape(str(analysis.get("partner") or ""))
                lines = [
                    f"🤝 <b>STRATEGIC TIE-UP / PRESS RELEASE</b>",
                    f"🏢 <b>{company.upper()}</b>",
                    f"📌 <b>Ticker:</b> {ticker_tag} ({exchange}) | 🕒 {time_str}",
                ]
                if partner:
                    lines.append(f"🏷️ <b>Partner / Entity:</b> <b>{partner}</b>")
                lines.append(f"📊 <b>Impact:</b> {impact}")
                if amount:
                    lines.append(f"💰 <b>Deal / Scope Value:</b> {amount}")
                lines.extend([
                    f"",
                    f"📝 <b>Strategic Highlights:</b>",
                    f"{summary.strip()}",
                    f"",
                    f"🎯 <b>Fund Manager Assessment:</b>",
                    f"{interp.strip()}",
                ])
                
            # 4. Material Order / Contract Win
            elif "order" in cat_lower or "contract win" in cat_lower:
                magnitude = html.escape(str(analysis.get("magnitude") or ""))
                mag_tag = f" ({magnitude.upper()})" if magnitude else ""
                client = html.escape(str(analysis.get("client") or ""))
                
                lines = [
                    f"⚡ <b>MAJOR ORDER WIN{mag_tag}</b> ⚡",
                    f"🏢 <b>{company.upper()}</b>",
                    f"📌 <b>Ticker:</b> {ticker_tag} ({exchange}) | 🕒 {time_str}",
                ]
                order_meta = []
                if amount:
                    order_meta.append(f"<b>Order Value:</b> <b>{amount}</b>")
                if client:
                    order_meta.append(f"<b>Client:</b> <b>{client}</b>")
                if order_meta:
                    lines.append(f"💰 {' | '.join(order_meta)}")
                lines.append(f"📊 <b>Impact:</b> {impact}")
                lines.extend([
                    f"",
                    f"📝 <b>Scope of Work:</b>",
                    f"{summary.strip()}",
                    f"",
                    f"🎯 <b>Fund Manager Assessment:</b>",
                    f"{interp.strip()}",
                ])
                
            # 5. Strategic Acquisition / Merger / JV
            elif any(k in cat_lower for k in ["acquisition", "merger", "joint venture", "amalgamation", "stake purchase"]):
                target = html.escape(str(analysis.get("target") or ""))
                stake = html.escape(str(analysis.get("stake") or ""))
                lines = [
                    f"🏢 <b>STRATEGIC M&A / ACQUISITION</b>",
                    f"🏢 <b>{company.upper()}</b>",
                    f"📌 <b>Ticker:</b> {ticker_tag} ({exchange}) | 🕒 {time_str}",
                ]
                acq_meta = []
                if target:
                    acq_meta.append(f"<b>Target:</b> <b>{target}</b>")
                if stake:
                    acq_meta.append(f"<b>Stake:</b> <b>{stake}</b>")
                if acq_meta:
                    lines.append(f"🎯 {' | '.join(acq_meta)}")
                if amount:
                    lines.append(f"💰 <b>Deal Value:</b> {amount}")
                lines.append(f"📊 <b>Impact:</b> {impact}")
                lines.extend([
                    f"",
                    f"📝 <b>Transaction Details:</b>",
                    f"{summary.strip()}",
                    f"",
                    f"🎯 <b>Fund Manager Assessment:</b>",
                    f"{interp.strip()}",
                ])

            # 6. Corporate Action: Dividend / Bonus / Split / Buyback
            elif any(k in cat_lower for k in ["dividend", "bonus", "stock split", "buyback", "corporate action"]):
                record_date = html.escape(str(analysis.get("record_date") or ""))
                action_label = category.upper().replace("CORPORATE ACTION:", "").strip()
                lines = [
                    f"💰 <b>CORPORATE ACTION: {action_label}</b>",
                    f"🏢 <b>{company.upper()}</b>",
                    f"📌 <b>Ticker:</b> {ticker_tag} ({exchange}) | 🕒 {time_str}",
                ]
                ca_meta = []
                if amount:
                    ca_meta.append(f"<b>Value / Quantum:</b> <b>{amount}</b>")
                if record_date:
                    ca_meta.append(f"<b>Record Date:</b> <b>{record_date}</b>")
                if ca_meta:
                    lines.append(f"💵 {' | '.join(ca_meta)}")
                lines.append(f"📊 <b>Impact:</b> {impact}")
                lines.extend([
                    f"",
                    f"📝 <b>Action Details:</b>",
                    f"{summary.strip()}",
                    f"",
                    f"🎯 <b>Fund Manager Assessment:</b>",
                    f"{interp.strip()}",
                ])

            # 7. Credit Rating Action
            elif "credit rating" in cat_lower:
                agency = html.escape(str(analysis.get("agency") or "Rating Agency"))
                rating_val = html.escape(str(analysis.get("rating") or ""))
                lines = [
                    f"📈 <b>CREDIT RATING ACTION</b>",
                    f"🏢 <b>{company.upper()}</b>",
                    f"📌 <b>Ticker:</b> {ticker_tag} ({exchange}) | 🕒 {time_str}",
                    f"🏛️ <b>Agency:</b> <b>{agency}</b>" + (f" | <b>Rating:</b> <b>{rating_val}</b>" if rating_val else ""),
                ]
                if amount:
                    lines.append(f"💰 <b>Facilities:</b> {amount}")
                lines.append(f"📊 <b>Impact:</b> {impact}")
                lines.extend([
                    f"",
                    f"📝 <b>Rating Highlights:</b>",
                    f"{summary.strip()}",
                    f"",
                    f"🎯 <b>Fund Manager Assessment:</b>",
                    f"{interp.strip()}",
                ])

            # 8. Leadership / CXO Change
            elif "leadership change" in cat_lower or "management" in cat_lower:
                desg = html.escape(str(analysis.get("designation") or "Executive"))
                person = html.escape(str(analysis.get("person") or ""))
                action_type = html.escape(str(analysis.get("action") or "Change"))
                lines = [
                    f"👤 <b>LEADERSHIP / CXO CHANGE</b>",
                    f"🏢 <b>{company.upper()}</b>",
                    f"📌 <b>Ticker:</b> {ticker_tag} ({exchange}) | 🕒 {time_str}",
                    f"👔 <b>Designation:</b> <b>{desg}</b>",
                ]
                if person:
                    lines.append(f"👤 <b>Executive:</b> <b>{person}</b> (<b>{action_type}</b>)")
                lines.append(f"📊 <b>Impact:</b> {impact}")
                lines.extend([
                    f"",
                    f"📝 <b>Executive Profile:</b>",
                    f"{summary.strip()}",
                    f"",
                    f"🎯 <b>Fund Manager Assessment:</b>",
                    f"{interp.strip()}",
                ])

            # 9. Commercial Commissioning / Capex
            elif any(k in cat_lower for k in ["commissioning", "capacity expansion", "capex"]):
                capacity = html.escape(str(analysis.get("capacity") or ""))
                location = html.escape(str(analysis.get("location") or ""))
                lines = [
                    f"🏭 <b>COMMERCIAL COMMISSIONING / CAPEX</b>",
                    f"🏢 <b>{company.upper()}</b>",
                    f"📌 <b>Ticker:</b> {ticker_tag} ({exchange}) | 🕒 {time_str}",
                ]
                cap_info = []
                if capacity:
                    cap_info.append(f"<b>Capacity:</b> <b>{capacity}</b>")
                if location:
                    cap_info.append(f"<b>Location:</b> <b>{location}</b>")
                if cap_info:
                    lines.append(f"⚡ {' | '.join(cap_info)}")
                if amount:
                    lines.append(f"💰 <b>Capex Outlay:</b> {amount}")
                lines.append(f"📊 <b>Impact:</b> {impact}")
                lines.extend([
                    f"",
                    f"📝 <b>Commissioning Details:</b>",
                    f"{summary.strip()}",
                    f"",
                    f"🎯 <b>Fund Manager Assessment:</b>",
                    f"{interp.strip()}",
                ])

            # 10. Capital Raise / Fundraising
            elif any(k in cat_lower for k in ["fundraise", "capital raise", "qip", "rights issue", "warrants"]):
                mode = html.escape(str(analysis.get("mode") or "Equity Issuance"))
                price = html.escape(str(analysis.get("price") or ""))
                lines = [
                    f"🏦 <b>CAPITAL RAISE / FUNDRAISING</b>",
                    f"🏢 <b>{company.upper()}</b>",
                    f"📌 <b>Ticker:</b> {ticker_tag} ({exchange}) | 🕒 {time_str}",
                    f"🏷️ <b>Mode:</b> <b>{mode}</b>" + (f" | <b>Price:</b> <b>{price}</b>" if price else ""),
                ]
                if amount:
                    lines.append(f"💰 <b>Quantum:</b> {amount}")
                lines.append(f"📊 <b>Impact:</b> {impact}")
                lines.extend([
                    f"",
                    f"📝 <b>Fundraise Details:</b>",
                    f"{summary.strip()}",
                    f"",
                    f"🎯 <b>Fund Manager Assessment:</b>",
                    f"{interp.strip()}",
                ])

            # 11. Critical Red Flags (Auditor Resignation, Default, Penalty, Pledge Invocation)
            elif any(k in cat_lower for k in ["auditor resignation", "insolvency", "nclt", "default", "pledge invoked", "penalty", "regulatory"]):
                lines = [
                    f"🚨 <b>CRITICAL GOVERNANCE RED FLAG</b> 🚨",
                    f"🏢 <b>{company.upper()}</b>",
                    f"📌 <b>Ticker:</b> {ticker_tag} ({exchange}) | 🕒 {time_str}",
                    f"⚠️ <b>Issue:</b> <b>{category}</b>",
                    f"📊 <b>Impact:</b> {impact}",
                ]
                if amount:
                    lines.append(f"💰 <b>Exposure / Penalty:</b> {amount}")
                lines.extend([
                    f"",
                    f"📝 <b>Event Summary:</b>",
                    f"{summary.strip()}",
                    f"",
                    f"🎯 <b>Fund Manager Assessment:</b>",
                    f"{interp.strip()}",
                ])

            # 12. Generic Tier 1 Catalyst Card
            elif tier == "tier_1":
                header_icon = "🚨" if any(k in impact.lower() for k in ["bearish", "alert", "risk"]) else "⚡"
                lines = [
                    f"{header_icon} <b>HIGH IMPACT CATALYST</b> {header_icon}",
                    f"🏢 <b>{company.upper()}</b>",
                    f"📌 <b>Ticker:</b> {ticker_tag} ({exchange})",
                    f"🕒 <b>Time:</b> {time_str}",
                    f"🏷️ <b>Category:</b> {category}",
                    f"📊 <b>Impact:</b> {impact}",
                ]
                if amount:
                    lines.append(f"💰 <b>Key Metric:</b> {amount}")
                lines.extend([
                    f"",
                    f"📝 <b>Summary:</b>",
                    f"{summary.strip()}",
                    f"",
                    f"🎯 <b>Fund Manager Assessment:</b>",
                    f"{interp.strip()}",
                ])

            # 13. Tier 2 Fallback Card (in case Tier 2 alert is explicitly enabled)
            else:
                lines = [
                    f"📢 <b>CORPORATE UPDATE</b>",
                    f"🏢 <b>{company.upper()}</b>",
                    f"📌 <b>Ticker:</b> {ticker_tag} ({exchange}) | 🕒 {time_str}",
                    f"🏷️ <b>Category:</b> {category}",
                    f"📊 <b>Impact:</b> {impact}",
                ]
                if amount:
                    lines.append(f"💰 <b>Metric:</b> {amount}")
                lines.extend([
                    f"",
                    f"📝 <b>Summary:</b>",
                    f"{summary.strip()}",
                    f"",
                    f"🎯 <b>Fund Manager Assessment:</b>",
                    f"{interp.strip()}",
                ])

            if pdf_url and pdf_url.startswith("http"):
                lines.extend([
                    f"",
                    f"📎 <a href=\"{pdf_url}\"><b>Official Regulatory Filing PDF</b></a>"
                ])

            lines.append(f"━━━━━━━━━━━━━━━━━━━━━━")
            return lines

        card_text = "\n".join(build_lines(interpretation))
        if len(card_text) > 4000:
            excess = len(card_text) - 4000
            if len(interpretation) > excess + 3:
                interpretation = interpretation[:-(excess + 3)] + "..."
                card_text = "\n".join(build_lines(interpretation))
                
        return card_text

    def fetch_latest_chat_id(self, token: Optional[str] = None) -> Optional[str]:
        """Auto-detect chat ID from the latest message sent to the bot."""
        tk = token or self.bot_token
        if not tk:
            return None
        url = f"https://api.telegram.org/bot{tk}/getUpdates"
        try:
            import urllib.request
            import json
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                results = data.get("result", [])
                if results:
                    latest = results[-1]
                    message = latest.get("message") or latest.get("channel_post") or latest.get("my_chat_member")
                    if message and "chat" in message:
                        chat_id = str(message["chat"]["id"])
                        return chat_id
        except Exception as e:
            logger.error(f"Error auto-detecting Telegram chat_id: {e}")
        return None

    def get_destinations(self) -> List[Tuple[str, str]]:
        """
        Return list of (bot_token, chat_id) pairs to dispatch to.
        Supports multiple comma-separated chat IDs and secondary bot configs.
        """
        destinations = []

        # 1. Primary bot configuration
        if self.bot_token:
            tokens = [t.strip() for t in self.bot_token.split(",") if t.strip()]
            chats = [c.strip() for c in (self.chat_id or "").split(",") if c.strip()]

            if not chats and tokens:
                detected = self.fetch_latest_chat_id(tokens[0])
                if detected:
                    chats = [detected]
                    self.chat_id = detected

            for t in tokens:
                for c in chats:
                    destinations.append((t, c))

        # 2. Secondary bot configuration (if provided in env)
        import os
        token_2 = os.environ.get("TELEGRAM_BOT_TOKEN_2", "") or TELEGRAM_BOT_TOKEN_2
        chat_2 = os.environ.get("TELEGRAM_CHAT_ID_2", "") or TELEGRAM_CHAT_ID_2
        if token_2:
            tokens_2 = [t.strip() for t in token_2.split(",") if t.strip()]
            chats_2 = [c.strip() for c in (chat_2 or self.chat_id or "").split(",") if c.strip()]
            for t in tokens_2:
                for c in chats_2:
                    if (t, c) not in destinations:
                        destinations.append((t, c))

        return destinations

    def _send_single(self, token: str, chat_id: str, message: str) -> bool:
        """Send message to a single bot token and chat ID."""
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": message,
            "parse_mode": "HTML",
            "disable_web_page_preview": False
        }

        try:
            import urllib.request
            import json
            data_bytes = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                url, 
                data=data_bytes, 
                headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status == 200:
                    logger.info(f"✅ Telegram alert delivered to chat {chat_id}")
                    return True
            return False
        except Exception as e:
            # Fallback to plain text if HTML styling parsing failed
            try:
                import urllib.request
                import json
                payload.pop("parse_mode", None)
                data_bytes = json.dumps(payload).encode("utf-8")
                req2 = urllib.request.Request(
                    url, 
                    data=data_bytes, 
                    headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}
                )
                with urllib.request.urlopen(req2, timeout=10) as resp2:
                    if resp2.status == 200:
                        logger.info(f"✅ Telegram alert delivered (plain text fallback) to chat {chat_id}")
                        return True
            except Exception as e2:
                logger.error(f"Telegram dispatch error to chat {chat_id}: {e2}")
            return False

    def send_message(self, message: str) -> bool:
        """Broadcast message to all configured Telegram bots and chats."""
        destinations = self.get_destinations()
        if not destinations:
            logger.warning("No valid Telegram destinations configured.")
            return False

        any_success = False
        for token, chat_id in destinations:
            ok = self._send_single(token, chat_id, message)
            if ok:
                any_success = True

        return any_success

    def dispatch(self, item: Dict[str, Any], analysis: Dict[str, Any]) -> str:
        """Format alert card and send to all Telegram destinations."""
        card = self.format_alert_card(item, analysis)

        # Log alert to local file
        try:
            with open(LATEST_ALERTS_FILE, "a", encoding="utf-8") as f:
                f.write(card + "\n\n")
        except Exception:
            pass

        if not self.bot_token:
            return "LOGGED_NO_KEY"

        success = self.send_message(card)
        return "SENT" if success else "FAILED"
