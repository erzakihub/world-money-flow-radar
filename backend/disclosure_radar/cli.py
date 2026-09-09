"""
Command Line Interface for NSE & BSE Corporate Disclosure Radar.
Commands:
  run          : Run radar continuously in foreground
  poll-once    : Run a single polling cycle across NSE and BSE
  test-wa      : Send an immediate sample test alert to WhatsApp
  stats        : View current database and tracking statistics
  recent       : Show recent processed disclosures and interpretations
  watchlist    : List all active watchlist companies being tracked
"""

import sys
import json
import argparse
from typing import Optional

from .radar_daemon import DisclosureRadarDaemon
from .database import init_db, get_stats, get_recent_disclosures
from .watchlist import WATCHLIST
from .notifiers.whatsapp_notifier import WhatsAppNotifier
from .notifiers.telegram_notifier import TelegramNotifier
from .config import (
    WHATSAPP_PHONE_NUMBER,
    WHATSAPP_PROVIDER,
    CALLMEBOT_API_KEY,
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID,
    ENV_FILE
)

def update_env_key(env_path, key: str, value: str):
    """Update or add a key=value pair in .env file."""
    lines = []
    found = False
    if env_path.exists():
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip().startswith(f"{key}=") or line.strip() == f"{key}":
                    lines.append(f"{key}={value}\n")
                    found = True
                else:
                    lines.append(line)
    if not found:
        lines.append(f"{key}={value}\n")
    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(lines)

def cmd_run():
    daemon = DisclosureRadarDaemon(run_once=False)
    daemon.run()

def cmd_poll_once():
    daemon = DisclosureRadarDaemon(run_once=True)
    daemon.run()

def cmd_test_wa():
    print(f"Testing WhatsApp dispatch to: {WHATSAPP_PHONE_NUMBER} via {WHATSAPP_PROVIDER}...")
    sample_item = {
        "exchange": "NSE",
        "symbol": "POLYCAB",
        "bse_code": "542652",
        "company_name": "Polycab India Limited",
        "headline": "Award of ₹845 Crore EPC Power Transmission and Cable Supply Contract",
        "category": "Material Order Win",
        "broadcast_time": "Today, 12:35 PM",
        "pdf_url": "https://nsearchives.nseindia.com/corporate/sample_order_filing.pdf"
    }
    sample_analysis = {
        "category": "Material Order Win",
        "impact_rating": "🟢 BULLISH / HIGH POSITIVE",
        "summary": "Polycab India has bagged an ₹845 Cr high-voltage cable and EPC contract from State Electricity Board.",
        "exact_interpretation": "Substantially expands FY26 transmission cable order book with expected operating margins of 13-14%. Execution across 15 months provides solid quarterly revenue visibility.",
        "is_routine": False
    }

    notifier = WhatsAppNotifier()
    card = notifier.format_alert_card(sample_item, sample_analysis)
    print("\n--- SAMPLE FORMATTED WHATSAPP ALERT CARD ---")
    print(card)
    print("-------------------------------------------\n")

    res = notifier.dispatch(sample_item, sample_analysis)
    if res == "SENT":
        print(f"🎉 SUCCESS: Test WhatsApp message was delivered to {WHATSAPP_PHONE_NUMBER}!")
    elif res == "LOGGED_NO_KEY":
        print("ℹ️ Note: Saved card to 'latest_alerts.txt'. To deliver directly to your phone via WhatsApp:")
        print("  1. Send a WhatsApp message from your phone (+919471009531) to +34 644 59 75 14 with text:")
        print("     'I allow callmebot to send me messages'")
        print("  2. CallMeBot will reply with an API key.")
        print("  3. Add CALLMEBOT_API_KEY=<key> into backend/disclosure_radar/.env")
    else:
        print(f"Result: {res}")

def cmd_test_telegram(token: Optional[str] = None):
    token = token or TELEGRAM_BOT_TOKEN
    if not token:
        print("❌ No Telegram Bot Token configured.")
        print("\n👉 How to get your free token in 30 seconds:")
        print("  1. Open Telegram on your phone and search for @BotFather")
        print("  2. Tap Start and send: /newbot")
        print("  3. Enter a name (e.g. My Stock Radar) and a username ending in 'bot'")
        print("  4. BotFather gives you an HTTP API token (e.g. 7123456789:AAH...)")
        print("  5. Run: python3 -m backend.disclosure_radar.cli test-telegram --token <your_token>\n")
        return

    notifier = TelegramNotifier(bot_token=token)
    print(f"Connecting to Telegram Bot (Token: {token[:12]}...)...")

    # Verify bot identity
    import urllib.request
    import json
    try:
        req = urllib.request.Request(f"https://api.telegram.org/bot{token}/getMe", headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            bot_info = data.get("result", {})
            bot_user = bot_info.get('username')
            print(f"🤖 Bot Verified: @{bot_user} ({bot_info.get('first_name')})")
    except Exception as e:
        print(f"❌ Network error connecting to Telegram: {e}")
        return

    # Auto-detect chat_id if not explicitly set
    chat_id = notifier.chat_id
    if not chat_id:
        print("🔍 Auto-detecting your Chat ID from recent messages...")
        chat_id = notifier.fetch_latest_chat_id()

    if not chat_id:
        print(f"\n⚠️ Chat ID not detected yet.")
        print(f"👉 Please open your bot link in Telegram: https://t.me/{bot_user}")
        print(f"👉 Tap 'START' (or send any message like 'hello' to @{bot_user})")
        print("👉 Then run this test command again!")
        return

    notifier.chat_id = chat_id
    print(f"📱 Connected to Telegram Chat ID: {chat_id}")

    sample_item = {
        "exchange": "NSE",
        "symbol": "POLYCAB",
        "bse_code": "542652",
        "company_name": "Polycab India Limited",
        "headline": "Award of ₹845 Crore EPC Power Transmission and Cable Supply Contract",
        "category": "Material Order Win",
        "broadcast_time": "Today, 01:00 PM",
        "pdf_url": "https://nsearchives.nseindia.com/corporate/sample_order_filing.pdf"
    }
    sample_analysis = {
        "category": "Material Order Win",
        "impact_rating": "🟢 BULLISH / HIGH POSITIVE",
        "summary": "Polycab India has bagged an ₹845 Cr high-voltage cable and EPC contract from State Electricity Board.",
        "exact_interpretation": "Substantially expands FY26 transmission cable order book with expected operating margins of 13-14%. Execution across 15 months provides solid quarterly revenue visibility.",
        "is_routine": False
    }

    card = notifier.format_alert_card(sample_item, sample_analysis)
    sent = notifier.send_message(card)

    if sent:
        print("\n🎉 SUCCESS: High-speed test alert delivered to your Telegram app!")
        # Save to .env
        update_env_key(ENV_FILE, "TELEGRAM_BOT_TOKEN", token)
        update_env_key(ENV_FILE, "TELEGRAM_CHAT_ID", chat_id)
        update_env_key(ENV_FILE, "ALERT_CHANNEL", "telegram")
        print(f"✅ Automatically configured in {ENV_FILE}!")
    else:
        print("❌ Could not deliver Telegram alert.")

def cmd_stats():
    init_db()
    stats = get_stats()
    print("\n📊 --- DISCLOSURE RADAR STATISTICS ---")
    print(f"  Total Processed Filings : {stats['total_disclosures']}")
    print(f"  Watchlist Matches       : {stats['watchlist_disclosures']}")
    print(f"  WhatsApp Alerts Sent    : {stats['whatsapp_sent']}")
    print(f"  Monitored Watchlist Size: {len(WATCHLIST)} companies")
    print("---------------------------------------\n")

def cmd_recent(limit: int = 15, watchlist_only: bool = False):
    init_db()
    rows = get_recent_disclosures(limit=limit, watchlist_only=watchlist_only)
    if not rows:
        print("No disclosures processed yet.")
        return
    print(f"\n📑 --- RECENT DISCLOSURES (Showing {len(rows)}) ---")
    for r in rows:
        badge = "⭐ [WATCHLIST]" if r["is_watchlist"] else "  [OTHER]"
        print(f"{badge} {r['exchange']} | {r['company_name']} ({r['symbol'] or r['bse_code']})")
        print(f"   🕒 {r['broadcast_time']} | Impact: {r['impact_rating']}")
        print(f"   📝 {r['headline'][:80]}")
        if r.get('interpretation'):
            print(f"   💡 {r['interpretation'][:100]}...")
        print(f"   📱 Status: {r['whatsapp_status']}")
        print("-" * 50)

def cmd_watchlist():
    print(f"\n🎯 --- MONITORED WATCHLIST ({len(WATCHLIST)} Companies) ---")
    for idx, w in enumerate(WATCHLIST, 1):
        sym_str = f"NSE: {w['symbol']}" if w['symbol'] else "NSE: SME"
        bse_str = f"BSE: {w['bse_code']}" if w['bse_code'] else "BSE: -"
        print(f"{idx:2d}. {w['name']:<42} | {sym_str:<15} | {bse_str}")
    print("----------------------------------------------------------\n")

def main():
    parser = argparse.ArgumentParser(description="NSE & BSE Corporate Disclosure Radar CLI")
    parser.add_argument("command", choices=["run", "poll-once", "test-wa", "test-telegram", "stats", "recent", "watchlist"],
                        help="Action to perform")
    parser.add_argument("--token", type=str, default="", help="Telegram bot token for test-telegram")
    parser.add_argument("--limit", type=int, default=15, help="Number of recent records to display")
    parser.add_argument("--all", action="store_true", help="Include non-watchlist items in recent records")

    if len(sys.argv) == 1:
        parser.print_help()
        sys.exit(1)

    args = parser.parse_args()

    if args.command == "run":
        cmd_run()
    elif args.command == "poll-once":
        cmd_poll_once()
    elif args.command == "test-wa":
        cmd_test_wa()
    elif args.command == "test-telegram":
        cmd_test_telegram(token=args.token)
    elif args.command == "stats":
        cmd_stats()
    elif args.command == "recent":
        cmd_recent(limit=args.limit, watchlist_only=not args.all)
    elif args.command == "watchlist":
        cmd_watchlist()

if __name__ == "__main__":
    main()
