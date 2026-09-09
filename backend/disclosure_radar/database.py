"""
SQLite Database Layer for tracking NSE/BSE corporate disclosures,
preventing duplicate notifications, and recording AI interpretations.
"""

import sqlite3
import hashlib
import json
from typing import Optional, Dict, Any, List
from .config import DATABASE_PATH

def get_connection():
    conn = sqlite3.connect(DATABASE_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize database tables and indexes."""
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS disclosures (
                id TEXT PRIMARY KEY,
                exchange TEXT NOT NULL,
                symbol TEXT,
                bse_code TEXT,
                company_name TEXT,
                headline TEXT,
                category TEXT,
                subcategory TEXT,
                pdf_url TEXT,
                broadcast_time TEXT,
                is_watchlist INTEGER DEFAULT 0,
                impact_rating TEXT DEFAULT 'NEUTRAL',
                interpretation TEXT,
                whatsapp_status TEXT DEFAULT 'PENDING',
                raw_json TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_disc_exchange ON disclosures(exchange)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_disc_symbol ON disclosures(symbol)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_disc_time ON disclosures(broadcast_time)")

        conn.execute("""
            CREATE TABLE IF NOT EXISTS stock_news (
                id TEXT PRIMARY KEY,
                symbol TEXT,
                company_name TEXT,
                source TEXT,
                title TEXT,
                link TEXT,
                catalyst TEXT,
                published_time TEXT,
                telegram_status TEXT DEFAULT 'PENDING',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_news_symbol ON stock_news(symbol)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_news_time ON stock_news(published_time)")
        conn.commit()

def generate_disclosure_id(exchange: str, symbol: str, bse_code: str, broadcast_time: str, headline: str) -> str:
    """Generate deterministic unique ID to deduplicate disclosures across cycles."""
    key = f"{exchange.upper()}:{str(symbol).upper()}:{str(bse_code)}:{str(broadcast_time)}:{str(headline).strip().lower()}"
    return hashlib.sha256(key.encode("utf-8")).hexdigest()

def is_disclosure_seen(disclosure_id: str) -> bool:
    """Check if disclosure has already been stored and processed."""
    with get_connection() as conn:
        row = conn.execute("SELECT 1 FROM disclosures WHERE id = ?", (disclosure_id,)).fetchone()
        return row is not None

def get_all_seen_ids() -> set:
    """Fetch all known disclosure IDs from DB into a set for fast O(1) in-memory checks."""
    try:
        with get_connection() as conn:
            rows = conn.execute("SELECT id FROM disclosures").fetchall()
            return {r["id"] for r in rows}
    except Exception:
        return set()

def save_disclosure(record: Dict[str, Any]):
    """Insert or replace disclosure record into database."""
    with get_connection() as conn:
        conn.execute("""
            INSERT OR REPLACE INTO disclosures (
                id, exchange, symbol, bse_code, company_name,
                headline, category, subcategory, pdf_url,
                broadcast_time, is_watchlist, impact_rating,
                interpretation, whatsapp_status, raw_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            record.get("id"),
            record.get("exchange"),
            record.get("symbol"),
            record.get("bse_code"),
            record.get("company_name"),
            record.get("headline"),
            record.get("category"),
            record.get("subcategory"),
            record.get("pdf_url"),
            record.get("broadcast_time"),
            1 if record.get("is_watchlist") else 0,
            record.get("impact_rating", "NEUTRAL"),
            record.get("interpretation", ""),
            record.get("whatsapp_status", "PENDING"),
            json.dumps(record.get("raw_json", {}))
        ))
        conn.commit()

def update_whatsapp_status(disclosure_id: str, status: str):
    """Update status of WhatsApp message delivery."""
    with get_connection() as conn:
        conn.execute(
            "UPDATE disclosures SET whatsapp_status = ? WHERE id = ?",
            (status, disclosure_id)
        )
        conn.commit()

def get_recent_disclosures(limit: int = 25, watchlist_only: bool = False) -> List[Dict[str, Any]]:
    """Fetch recent processed disclosures."""
    with get_connection() as conn:
        if watchlist_only:
            query = "SELECT * FROM disclosures WHERE is_watchlist = 1 ORDER BY created_at DESC LIMIT ?"
        else:
            query = "SELECT * FROM disclosures ORDER BY created_at DESC LIMIT ?"
        rows = conn.execute(query, (limit,)).fetchall()
        return [dict(r) for r in rows]

def get_stats() -> Dict[str, int]:
    """Retrieve operational statistics from database."""
    with get_connection() as conn:
        total = conn.execute("SELECT COUNT(*) FROM disclosures").fetchone()[0]
        watchlist_cnt = conn.execute("SELECT COUNT(*) FROM disclosures WHERE is_watchlist = 1").fetchone()[0]
        whatsapp_sent = conn.execute("SELECT COUNT(*) FROM disclosures WHERE whatsapp_status = 'SENT'").fetchone()[0]
        return {
            "total_disclosures": total,
            "watchlist_disclosures": watchlist_cnt,
            "whatsapp_sent": whatsapp_sent
        }


def generate_news_id(symbol: str, title: str, published_time: str) -> str:
    """Generate deterministic unique ID to deduplicate news items."""
    key = f"{str(symbol).upper()}:{str(title).strip().lower()}:{str(published_time)}"
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


def is_news_seen(news_id: str) -> bool:
    """Check if news item has already been processed."""
    with get_connection() as conn:
        row = conn.execute("SELECT 1 FROM stock_news WHERE id = ?", (news_id,)).fetchone()
        return row is not None


def get_all_seen_news_ids() -> set:
    """Fetch all known news IDs for fast O(1) in-memory checks."""
    try:
        with get_connection() as conn:
            rows = conn.execute("SELECT id FROM stock_news").fetchall()
            return {r["id"] for r in rows}
    except Exception:
        return set()


def save_news_item(record: Dict[str, Any]):
    """Insert or replace stock news record into database."""
    with get_connection() as conn:
        conn.execute("""
            INSERT OR REPLACE INTO stock_news (
                id, symbol, company_name, source, title,
                link, catalyst, published_time, telegram_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            record.get("id"),
            record.get("symbol"),
            record.get("company_name"),
            record.get("source"),
            record.get("title"),
            record.get("link"),
            record.get("catalyst", "MARKET NEWS"),
            record.get("published_time"),
            record.get("telegram_status", "PENDING")
        ))
        conn.commit()


def update_news_status(news_id: str, status: str):
    """Update delivery status of a news item."""
    with get_connection() as conn:
        conn.execute("UPDATE stock_news SET telegram_status = ? WHERE id = ?", (status, news_id))
        conn.commit()

