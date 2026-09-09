"""
Configuration settings for NSE & BSE Disclosure Radar.
Loads environment variables from .env file or system environment.
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
ENV_FILE = BASE_DIR / ".env"

def load_dotenv_simple(env_path: Path):
    """Simple parser for .env file if python-dotenv is not installed."""
    if not env_path.exists():
        return
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            key = key.strip()
            val = val.strip().strip("'\"")
            if key not in os.environ:
                os.environ[key] = val

load_dotenv_simple(ENV_FILE)

# ─── Radar Settings ──────────────────────────────────────────────────
POLL_INTERVAL_SECONDS = int(os.environ.get("POLL_INTERVAL_SECONDS", "15"))
DATABASE_PATH = os.environ.get("DATABASE_PATH", str(BASE_DIR / "disclosures_radar.db"))
PID_FILE_PATH = os.environ.get("PID_FILE_PATH", str(BASE_DIR / "radar.pid"))
LOG_FILE_PATH = os.environ.get("LOG_FILE_PATH", str(BASE_DIR / "radar.log"))
LATEST_ALERTS_FILE = os.environ.get("LATEST_ALERTS_FILE", str(BASE_DIR / "latest_alerts.txt"))

# Filtering:
# If WATCHLIST_ONLY is True, alerts are dispatched only for the user's 63 target companies.
# If False, all listed companies on NSE/BSE will be monitored.
WATCHLIST_ONLY = os.environ.get("WATCHLIST_ONLY", "True").lower() in ("true", "1", "yes")

# Filter routine compliance noise (e.g. lost share certificate, reg 74(5), newspaper clippings, trading window closure)
FILTER_ROUTINE_NOISE = os.environ.get("FILTER_ROUTINE_NOISE", "True").lower() in ("true", "1", "yes")

# Filter AMC mutual fund scheme filings (Reg 90 daily NAVs, monthly scheme portfolios) from asset management companies
FILTER_AMC_SCHEME_FILINGS = os.environ.get("FILTER_AMC_SCHEME_FILINGS", "True").lower() in ("true", "1", "yes")

# Enforce only Tier 1 high-impact market-moving announcements to Telegram (silencing Tier 2 & Tier 3)
ONLY_TIER_1_ALERTS = os.environ.get("ONLY_TIER_1_ALERTS", "True").lower() in ("true", "1", "yes")

# Real-Time Stock News Radar (CNBC-TV18, NDTV Profit, ET NOW, Moneycontrol, Zee Business, Reuters)
ENABLE_NEWS_RADAR = os.environ.get("ENABLE_NEWS_RADAR", "True").lower() in ("true", "1", "yes")
NEWS_POLL_INTERVAL_SECONDS = int(os.environ.get("NEWS_POLL_INTERVAL_SECONDS", "60"))

# ─── WhatsApp Settings ───────────────────────────────────────────────
# Default recipient phone number provided by the user
WHATSAPP_PHONE_NUMBER = os.environ.get("WHATSAPP_PHONE_NUMBER", "+919471009531")

# Provider: 'callmebot', 'twilio', 'meta_cloud', or 'console' (for dry-run/preview)
WHATSAPP_PROVIDER = os.environ.get("WHATSAPP_PROVIDER", "callmebot")

# CallMeBot credentials (free 30-second setup for personal WhatsApp)
CALLMEBOT_API_KEY = os.environ.get("CALLMEBOT_API_KEY", "")

# Twilio credentials (optional, production grade)
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_WHATSAPP_FROM = os.environ.get("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")

# Meta WhatsApp Cloud API credentials (optional)
META_PHONE_NUMBER_ID = os.environ.get("META_PHONE_NUMBER_ID", "")
META_ACCESS_TOKEN = os.environ.get("META_ACCESS_TOKEN", "")

# ─── Telegram Settings (100% Free Forever) ───────────────────────────
ALERT_CHANNEL = os.environ.get("ALERT_CHANNEL", "telegram").lower() # 'telegram', 'whatsapp', or 'both'
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "8595375511:AAEB3NMlm3J85C5LGZ5G81D1Wv9PUyp-kMM")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "-5551466028, 499701259")
# Optional Secondary Bot / Recipient
TELEGRAM_BOT_TOKEN_2 = os.environ.get("TELEGRAM_BOT_TOKEN_2", "")
TELEGRAM_CHAT_ID_2 = os.environ.get("TELEGRAM_CHAT_ID_2", "")

# ─── AI / LLM Settings ───────────────────────────────────────────────
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
LLM_MODEL = os.environ.get("LLM_MODEL", "gemini-1.5-flash")
