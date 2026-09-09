"""
Institutional Equity Research & Fund Manager Interpretation Engine for NSE/BSE Corporate Disclosures.
Synthesizes regulatory announcements and attached PDF filings into actionable,
concrete, and high-conviction financial interpretations.
Answers:
  1. What happened (concrete facts, ₹ Cr, %, dates, client, scope)?
  2. Business & Financial Impact (revenue, margins, ROCE, order backlog, cash flows)?
  3. Stock Price & Valuation Impact (sentiment, multiple re-rating, institutional fund positioning)?
"""

import os
import re
import json
import logging
from typing import Dict, Any, Tuple, Optional, List
from ..config import GEMINI_API_KEY, OPENAI_API_KEY, LLM_MODEL
from .results_analyzer import evaluate_financial_results

logger = logging.getLogger("disclosure_radar.interpreter")

# ─── Financial & Regulatory Patterns (ordered by specificity) ─────────────────

PATTERNS = {
    # ── 1. Routine Administrative Noise (Tier 3) ──
    "routine_noise": re.compile(
        r"(declaration of\s+nav|portfolio of mutual fund|reg(?:ulation)?\s*90\s*\(1\)|"
        r"newspaper (?:publication|advertisement|clipping)|clippings? of (?:paper|newspaper)|"
        r"reg(?:ulation)?\s*(?:74|74\s*\(5\))|demat(?:eriali[sz]ation)? certificate|certificate under reg(?:ulation)?\s*74|"
        r"closure of trading window|trading window (?:closure|closing)|window closure intimation|"
        r"loss of share|duplicate share|reg(?:ulation)?\s*(?:39|39\s*\(3\))|issue of duplicate share|"
        r"investor complaint|grievance redressal|statement of investor complaint|reg(?:ulation)?\s*13\s*\(3\)|"
        r"secretarial compliance report|corporate governance report|reg(?:ulation)?\s*27\s*\(2\)|"
        r"listing fees|annual return under|completion of despatch|brsr reporting|"
        r"business responsibility and sustainability)",
        re.IGNORECASE
    ),

    # ── 2. Critical Red Flags (MUST be checked before broad patterns) ──
    "auditor_resignation": re.compile(
        r"(resignation of statutory auditor|auditor resignation|"
        r"statutory auditor.*?resign|resignation.*?statutory auditor)",
        re.IGNORECASE
    ),
    "default_insolvency": re.compile(
        r"(\bNCLT\b|\bCIRP\b|\bliquidation\b|"
        r"default\s+(?:in|on|of)\s+(?:payment|debt|loan|interest|NPA|bond|debenture)|"
        r"insolvency\s+(?:proceedings|petition|application|resolution)|"
        r"forensic audit|debt restructuring|one[- ]time settlement\s+(?:of|with)\s+(?:bank|lender))",
        re.IGNORECASE
    ),
    "regulatory_action": re.compile(
        r"(\bSEBI\s+order\b|show cause notice|penalty imposed|penalty of|"
        r"\bfine\s+of\b|\bfine\s+imposed\b|search and seizure|"
        r"enforcement directorate|income tax demand|gst demand|\braid\b|"
        r"SEBI\s+(?:adjudication|investigation|interim)\s+order|"
        r"prosecuti(?:on|ng)|debarment|compounding of offence)",
        re.IGNORECASE
    ),
    "pledge_creation": re.compile(
        r"\b(creation of pledge|pledge created|encumbrance created|"
        r"invocation of pledge|pledge invoked)\b",
        re.IGNORECASE
    ),

    # ── 3. Financial Results (handled by results_analyzer, pattern used for detection) ──
    "financial_results": re.compile(
        r"\b(financial results|quarterly results|audited results|"
        r"unaudited results|un-audited results|"
        r"statement of profit and loss|outcome of board meeting.*?results)\b",
        re.IGNORECASE
    ),

    # ── 3B. Monthly Business & Sales Updates ──
    "monthly_update": re.compile(
        r"\b(monthly\s+(?:business\s+update|update|sales|volume|production|dispatch|performance|revenue)|"
        r"sales\s+performance\s+figures|sales\s+volume\s+of|"
        r"monthly\s+update\s+of.*?for\s+the\s+month\s+of|"
        r"business\s+update\s+for\s+the\s+month\s+of|"
        r"operational\s+update\s+for\s+the\s+month\s+of)\b",
        re.IGNORECASE
    ),

    # ── 4. Specific Corporate Actions (checked before broad catalysts) ──
    "dividend_action": re.compile(
        r"(record date|book closure|cut-off date|dividend entitlement|"
        r"interim dividend|final dividend|dividend declared|dividend recommendation|"
        r"dividend of\s+(?:rs|₹|\binr))",
        re.IGNORECASE
    ),
    "bonus_split": re.compile(
        r"\b(bonus issue|stock split|sub-?division of|bonus shares|"
        r"face value.*?split|split.*?face value)\b",
        re.IGNORECASE
    ),
    "buyback": re.compile(
        r"\b(buyback|buy-?back|share repurchase|"
        r"repurchase of (?:equity )?shares|tender offer.*?buyback)\b",
        re.IGNORECASE
    ),
    "pledge_release": re.compile(
        r"\b(revocation of pledge|release of pledge|pledge released|"
        r"encumbrance released|reduction in pledge)\b",
        re.IGNORECASE
    ),

    # ── 5. Growth Catalysts (broad patterns, checked AFTER specific actions) ──
    "order_win": re.compile(
        r"\b(order\s+(?:worth|valued|of\s+(?:rs|₹|inr)|aggregating|amounting|for\s+supply|received\s+from|from\s+[A-Z])|"
        r"(?:purchase|work|supply)\s+order|letter of (?:award|intent)|"
        r"contract\s+(?:awarded|from|with|worth|for)|"
        r"(?:awarded|bags|secures|receives?|won)\s+(?:a\s+)?(?:new\s+)?(?:order|contract|project)|"
        r"new\s+order\s+(?:win|inflow|book)|order\s+(?:win|inflow))\b",
        re.IGNORECASE
    ),
    "expansion_capex": re.compile(
        r"\b(commercial production|capacity expansion|new plant|"
        r"new manufacturing unit|capex\s+(?:plan|outlay|of)|"
        r"commissioning of|operationalization|trial run|"
        r"greenfield|brownfield|production commenced)\b",
        re.IGNORECASE
    ),
    "acquisition_jv": re.compile(
        r"\b(acqui(?:sition|res)|stake purchase|amalgamation|"
        r"merger|joint venture|jv agreement|slump sale|"
        r"scheme of arrangement|subsidiary.*?acquired|"
        r"binding agreement.*?acqui|share purchase agreement)\b",
        re.IGNORECASE
    ),
    "fundraise": re.compile(
        r"\b(qip|preferential allotment|rights issue|warrants|"
        r"fund raising|issuance of (?:equity|shares)|"
        r"private placement|convertible debentures|"
        r"OFS\b|offer for sale)\b",
        re.IGNORECASE
    ),
    "credit_rating": re.compile(
        r"(\bCARE\s+Ratings?\b|\bCRISIL\b|\bICRA\b|\bInfomerics\b|"
        r"\bIndia\s+Ratings?\b|\bBrickwork\b|\bFitch\b|\bMoody'?s\b|\bS&P\b|"
        r"rating\s+(?:action|upgrade|downgrade|reaffirm|assign|withdraw)|"
        r"(?:upgraded|downgraded|reaffirmed|assigned)\s+(?:the\s+)?(?:credit\s+)?rating)",
        re.IGNORECASE
    ),
    "management_change": re.compile(
        r"\b(resignation|appointment|cessation|re-?appointment|retirement|superannuation)\b.*?\b(cfo|ceo|managing director|"
        r"whole[- ]time director|director|kmp|company secretary|chief financial officer|"
        r"chief executive officer|independent director|executive director|compliance officer)\b|"
        r"\b(change in (?:key managerial|management|directorate)|"
        r"key managerial personnel|directorate change)\b",
        re.IGNORECASE
    ),
    "board_meeting_prior": re.compile(
        r"(?:intimation\s+(?:under\s+.*?)?of\s+board\s+meeting|board\s+meeting\s+(?:scheduled|intimation|to\s+consider|on|held\s+on)|"
        r"meeting\s+of\s+(?:the\s+)?board\s+(?:of\s+directors\s+)?.*?(?:scheduled|to\s+be\s+held|to\s+consider)|"
        r"board\s+to\s+consider\s+(?:financial\s+results|dividend|bonus|fund\s*raising))",
        re.IGNORECASE
    ),
    "press_release_mou": re.compile(
        r"(?:press\s+release|media\s+release|"
        r"strategic\s+(?:collaboration|partnership|alliance|agreement|tie[- ]up)|"
        r"memorandum\s+of\s+understanding|\bMOU\b|"
        r"power\s+supply\s+agreement|\bPPA\b|"
        r"collaboration\s+agreement|commercial\s+agreement|"
        r"joint\s+venture\s+agreement|jv\s+agreement|"
        r"signing\s+of\s+(?:an?\s+)?agreement|"
        r"(?:strategic\s+)?partnership\s+with|tie[- ]up\s+with)",
        re.IGNORECASE
    ),

    # ── 6. Additional Categories ──
    "board_meeting_outcome": re.compile(
        r"\b(outcome of board meeting|board meeting outcome|"
        r"board of directors.*?(?:approved|decided|recommended|declared|considered)|"
        r"outcome of the meeting of (?:the )?board)\b",
        re.IGNORECASE
    ),
    "related_party_txn": re.compile(
        r"\b(related party transaction|RPT|"
        r"transaction with related party|material related party)\b",
        re.IGNORECASE
    ),
    "shareholding_change": re.compile(
        r"\b(change in shareholding|bulk deal|block deal|"
        r"substantial acquisition|acquisition of shares under|"
        r"disclosure under (?:reg(?:ulation)?\s*)?(?:29|31)|"
        r"increase in shareholding|decrease in shareholding)\b",
        re.IGNORECASE
    ),
    "agm_egm_outcome": re.compile(
        r"\b(outcome of (?:annual|extra.?ordinary) general meeting|"
        r"AGM outcome|EGM outcome|proceedings of (?:AGM|EGM)|"
        r"results? of (?:AGM|EGM|annual general|extra.?ordinary general))\b",
        re.IGNORECASE
    ),
}

# Words that disqualify order_win pattern (SEBI orders, court orders, etc.)
ORDER_WIN_EXCLUSIONS = re.compile(
    r"(SEBI\s+order|NCLT\s+order|court\s+order|tribunal\s+order|"
    r"in\s+order\s+to|order\s+(?:of\s+)?(?:the\s+)?(?:hon'?ble|court|tribunal|SEBI|NCLT|bench|authority)|"
    r"restraining\s+order|adjudication\s+order|penalty\s+order|"
    r"winding\s+up\s+order|liquidation\s+order)",
    re.IGNORECASE
)

AMOUNT_PATTERN = re.compile(
    r"(?:rs\.?|inr|₹|usd|\$)\s*([\d,]+(?:\.\d+)?)\s*(cr(?:ore)?s?|lakh?s?|mn|bn|billion|million)?",
    re.IGNORECASE
)

GENERIC_HEADLINE_PHRASES = (
    "as per attachment", "as per enclosed", "attachment enclosed",
    "enclosed herewith", "as attached", "pdf attached",
    "disclosure under reg", "intimation under reg", "announcement under reg",
    "submission of", "details as enclosed", "copy of", "updates"
)


# ─── Helper Functions ─────────────────────────────────────────────────────────

def extract_pdf_subject(pdf_text: str) -> str:
    """Extract the specific regulatory Subject/Topic from the filing PDF."""
    if not pdf_text:
        return ""
    m = re.search(
        r"(?:Subject|Sub)\s*[:–-]\s*(.*?)(?:\n\s*Dear|\n\s*Sir|\n\s*Madam|\n\s*Madam/Sir|\n\n\n|\n[A-Z\s]{4,}:)",
        pdf_text, re.IGNORECASE | re.DOTALL
    )
    if m:
        sub = " ".join(m.group(1).split())
        sub = re.sub(r"\b(\d+)o(th)\b", r"\g<1>0\g<2>", sub, flags=re.IGNORECASE)
        sub = re.sub(r"\)\s*7\s*", ") / ", sub)
        sub = re.sub(
            r"^(?:Intimation|Announcement|Disclosure)\s*(?:under|pursuant to)\s*(?:Regulation|SEBI).*?[-–:]\s*",
            "", sub, flags=re.IGNORECASE
        )
        if len(sub) > 10:
            return sub[:200].strip()
    return ""


def clean_headline(headline: str, pdf_subject: str = "") -> str:
    """Strip redundant stock exchange boilerplate to produce crisp headlines."""
    text = (headline or "").strip()
    text = re.sub(r"^[A-Z0-9\s]{2,15}:\s*", "", text)
    text = re.sub(
        r"^(?:Announcement under Regulation 30.*?[-–:]\s*|"
        r"Intimation under Regulation 30.*?[-–:]\s*|"
        r"Intimation under SEBI.*?[-–:]\s*|"
        r"Updates\s*[-–:]\s*)",
        "", text, flags=re.IGNORECASE
    )
    text = re.sub(
        r"(?:has informed the Exchange regarding(?: the)?|"
        r"has informed the Exchange about(?: the)?)\s*",
        "", text, flags=re.IGNORECASE
    )
    text = text.strip()

    is_generic = not text or any(p in text.lower() for p in GENERIC_HEADLINE_PHRASES)
    if is_generic and pdf_subject:
        return pdf_subject

    return text


def extract_financial_amounts(text: str) -> List[Tuple[float, str]]:
    """Extract all financial figures with their units, sorted by value descending."""
    matches = AMOUNT_PATTERN.findall(text)
    found = []
    seen_nums = set()
    for num, unit in matches:
        clean_num = num.replace(",", "")
        try:
            val = float(clean_num)
            if val > 0.5 and val not in seen_nums:  # Skip tiny amounts and reg numbers
                seen_nums.add(val)
                unit_str = f" {unit.capitalize()}" if unit else ""
                found.append((val, f"₹{num}{unit_str}"))
        except ValueError:
            pass
    found.sort(key=lambda x: x[0], reverse=True)
    return found


def format_amount(amounts: List[Tuple[float, str]], top_n: int = 2) -> str:
    """Format top N financial amounts as comma-separated string."""
    return ", ".join(a[1] for a in amounts[:top_n]) if amounts else ""


def get_primary_amount_cr(amounts: List[Tuple[float, str]]) -> Optional[float]:
    """Get the largest amount in Cr for magnitude comparison."""
    if not amounts:
        return None
    val, label = amounts[0]
    label_lower = label.lower()
    if "lakh" in label_lower or "lac" in label_lower:
        return val / 100.0
    if "bn" in label_lower or "billion" in label_lower:
        return val * 100.0 if "usd" not in label_lower else val * 8300.0
    if "mn" in label_lower or "million" in label_lower:
        return val / 10.0
    return val  # Assume Cr


def extract_dates(text: str) -> List[str]:
    """Extract dates mentioned in the filing."""
    date_matches = re.findall(
        r"\b(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|"
        r"\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+,?\s+\d{4})\b",
        text
    )
    return date_matches[:3]


def extract_person_name(text: str) -> str:
    """Extract person name from management change announcements."""
    patterns = [
        r"(?:Mr\.?|Mrs\.?|Ms\.?|Shri|Smt\.?|Dr\.?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})",
        r"resignation of\s+(?:Mr\.?|Mrs\.?|Ms\.?|Shri)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})",
        r"appointment of\s+(?:Mr\.?|Mrs\.?|Ms\.?|Shri)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})",
    ]
    for pat in patterns:
        m = re.search(pat, text)
        if m:
            name = m.group(1).strip()
            if len(name) > 3 and name.upper() not in ("THE", "AND", "FOR", "WITH"):
                return name
    return ""


def extract_designation(text: str) -> str:
    """Extract designation from management change text."""
    desg_pat = re.compile(
        r"\b(Chief Financial Officer|CFO|Chief Executive Officer|CEO|"
        r"Managing Director|Whole[- ]Time Director|Independent Director|"
        r"Company Secretary|KMP|Chairman|Non[- ]Executive Director|"
        r"Chief Operating Officer|COO|Chief Technology Officer|CTO)\b",
        re.IGNORECASE
    )
    m = desg_pat.search(text)
    if not m:
        return "Director"
    d = m.group(1)
    if d.upper() in ("CFO", "CEO", "COO", "CTO", "KMP", "MD"):
        return d.upper()
    return d.title()


def extract_target_company(text: str) -> str:
    """Extract acquisition target company name."""
    patterns = [
        r"acqui(?:sition|re[sd]?)\s+(?:of\s+)?(?:\d+(?:\.\d+)?%\s+(?:stake|equity|shareholding)\s+(?:in|of)\s+)?([A-Z][A-Za-z0-9\s&.,]{3,50}?(?:Limited|Ltd|Private|Pvt|LLP|Inc))",
        r"(?:merger|amalgamation)\s+(?:of|with)\s+([A-Z][A-Za-z0-9\s&.,]{3,50}?(?:Limited|Ltd|Private|Pvt|LLP|Inc))",
        r"joint venture\s+with\s+([A-Z][A-Za-z0-9\s&.,]{3,50}?(?:Limited|Ltd|Corporation|Inc))",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            return m.group(1).strip()[:60]
    return ""


def extract_key_sentence(text: str, max_chars: int = 200) -> str:
    """Extract the most informative sentence from PDF text for fallback summary."""
    if not text:
        return ""
    # Skip boilerplate headers and look for substantive content
    sentences = re.split(r'[.]\s+', text[:2000])
    for s in sentences:
        s = s.strip()
        if len(s) < 20:
            continue
        # Skip boilerplate
        if any(skip in s.lower() for skip in [
            "dear sir", "to the manager", "listing department",
            "pursuant to regulation", "we hereby", "this is to inform",
            "kindly take", "national stock exchange", "bombay stock exchange",
            "scrip code", "isin", "thanking you"
        ]):
            continue
        return s[:max_chars].strip()
    return ""


def extract_client_name(text: str) -> str:
    """Extract client/counterparty name from order win announcements."""
    patterns = [
        r"(?:from|by|awarded by|received from|placed by)\s+(?:M/s\.?\s+)?([A-Z][A-Za-z0-9\s&.,]{3,60}?(?:Limited|Ltd|Corporation|Board|Authority|NTPC|BHEL|Railways|Ministry|DISCOM|SEB|Government|Govt|Municipal|Power|Grid|Energy|Defence|Navy|Army|Air Force|Council|Commission))",
        r"(?:from|by)\s+(?:M/s\.?\s+)?([A-Z][A-Za-z0-9\s&.,]{3,50}?)(?:\s+(?:for|worth|valued|amounting|aggregating))",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            name = m.group(1).strip().rstrip(",.")
            if len(name) > 3:
                return name[:60]
    return ""


def extract_order_product(text: str) -> str:
    """Extract product/service description from order win."""
    patterns = [
        r"(?:for|towards|for supply of|for construction of|for execution of)\s+([a-zA-Z0-9\s,&-]{5,80}?)(?:\.|,\s+(?:valued|worth|amounting|from|at|in))",
        r"order\s+for\s+([a-zA-Z0-9\s,&-]{5,60}?)(?:\s+(?:worth|valued|from|amounting))",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            product = m.group(1).strip().rstrip(",.")
            if len(product) > 5:
                return product[:80]
    return ""


def extract_rating_details(text: str) -> Dict[str, str]:
    """Extract credit rating agency, instrument, and rating from text."""
    details = {}
    # Agency
    agency_pat = re.compile(
        r"(CARE\s+Ratings?|CRISIL|ICRA|Infomerics|India\s+Ratings?|Brickwork|Fitch|Moody'?s|S&P)",
        re.IGNORECASE
    )
    m = agency_pat.search(text)
    if m:
        details["agency"] = m.group(1).strip()

    # Rating value (e.g., AA+, A1+, BBB-, CRISIL A/Stable)
    rating_pat = re.compile(
        r"\b([A-D]{1,3}[+-]?(?:\s*/\s*(?:Stable|Positive|Negative|Watch|Under Review))?)\b"
    )
    ratings = rating_pat.findall(text)
    if ratings:
        details["rating"] = ratings[0]

    # Instrument
    inst_pat = re.compile(
        r"(long[- ]term\s+(?:bank\s+)?(?:facilities|loans|borrowings)|"
        r"short[- ]term\s+(?:bank\s+)?(?:facilities|loans|borrowings)|"
        r"non[- ]convertible debentures?|NCD|commercial paper|"
        r"term\s+loan|working capital|bank\s+facilities|"
        r"fund[- ]based|non[- ]fund[- ]based)",
        re.IGNORECASE
    )
    m = inst_pat.search(text)
    if m:
        details["instrument"] = m.group(1).strip()

    return details


def extract_meeting_agendas(text: str) -> str:
    """Extract key agenda items from board meeting intimation."""
    agendas = []
    text_lower = text.lower()
    
    if "unaudited" in text_lower and ("financial" in text_lower or "result" in text_lower or "finacial" in text_lower or "standalone" in text_lower or "consolidated" in text_lower):
        agendas.append("Unaudited Financial Results")
    elif "audited" in text_lower and ("financial" in text_lower or "result" in text_lower or "finacial" in text_lower):
        agendas.append("Audited Financial Results")
    elif "financial results" in text_lower or "quarterly results" in text_lower or "earnings" in text_lower or "financials" in text_lower:
        agendas.append("Financial Results")
        
    if "interim dividend" in text_lower:
        agendas.append("Interim Dividend")
    elif "special dividend" in text_lower:
        agendas.append("Special Dividend")
    elif "dividend" in text_lower:
        agendas.append("Dividend Consideration")
        
    if "bonus" in text_lower:
        agendas.append("Bonus Issue")
        
    if "split" in text_lower or "sub-division" in text_lower:
        agendas.append("Stock Split")
        
    if "warrant" in text_lower:
        agendas.append("Issuance of Warrants")
    elif "fund" in text_lower and ("raising" in text_lower or "raise" in text_lower):
        agendas.append("Fund Raising")
    elif "qip" in text_lower or "preferential" in text_lower or "rights issue" in text_lower:
        agendas.append("Fund Raising / Equity Issuance")
        
    if "buyback" in text_lower or "buy-back" in text_lower:
        agendas.append("Share Buyback")

    if not agendas:
        m = re.search(r"to\s+consider\s+(?:and\s+approve\s+)?(?:the\s+)?(.*?)(?:\.|\n|;|and\s+any\s+other|inter\s+alia)", text, re.IGNORECASE)
        if m:
            clean = " ".join(m.group(1).split()).strip()
            if (
                len(clean) > 5 and len(clean) < 80 
                and not any(k in clean.lower() for k in ["dear", "regulation", "pursuant", "sir", "madam", "board meeting", "intimation"])
            ):
                return clean
        return "Financial Results & Corporate Matters"
        
    return " & ".join(agendas)


def extract_meeting_date(text: str) -> str:
    """Extract the scheduled meeting date from board meeting intimation."""
    patterns = [
        r"(?:scheduled\s+(?:on|to\s+be\s+held\s+on)|held\s+on|convened\s+on)\s*(?:,\s*inter\s+alia\s*,\s*)?(?:[A-Za-z]+day,?\s*)?([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+,?\s+\d{4}|\d{1,2}[./-]\d{1,2}[./-]\d{2,4})",
        r"(?:meeting\s+on|meeting\s+scheduled\s+for)\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+,?\s+\d{4}|\d{1,2}[./-]\d{1,2}[./-]\d{2,4})",
    ]
    for p in patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            return m.group(1).strip().rstrip(",.")
    dates = extract_dates(text)
    if dates:
        return dates[0]
    return "Upcoming"


def extract_partner_name(text: str) -> str:
    """Extract partner or counterparty name from collaboration / MOU / agreement announcements."""
    patterns = [
        r"(?:with|and|from)\s+(?:M/s\.?\s+)?([a-zA-Z0-9\s&.,]{3,60}?(?:Limited|Ltd|Inc|LLC|Pte|GmbH|Corporation|Corp|Authority|DISCOM|Trust|Technologies|Solutions|Enterprises|Industries|Private Limited))",
        r"(?:MOU|agreement|collaboration|partnership|tie[- ]up)\s+with\s+(?:M/s\.?\s+)?([a-zA-Z0-9\s&.,]{3,50})",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            name = m.group(1).strip().rstrip(",.")
            if len(name) > 3 and not any(k in name.lower() for k in ["the exchange", "national stock", "bombay stock", "dear sir"]):
                return name[:60]
    return ""


def extract_mou_scope(text: str) -> str:
    """Extract scope of collaboration / agreement from announcement."""
    patterns = [
        r"(?:for|towards|to\s+jointly)\s+([a-zA-Z0-9\s,&-]{5,80}?)(?:\.|\n|,\s*(?:in|at|under|with))",
        r"(?:in\s+the\s+area\s+of|in\s+the\s+field\s+of)\s+([a-zA-Z0-9\s,&-]{5,80}?)(?:\.|\n)",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            scope = m.group(1).strip().rstrip(",.")
            if len(scope) > 5:
                return scope[:80]
    return ""


# ─── Main Analysis Engine ─────────────────────────────────────────────────────

def heuristic_analyze(
    company_name: str, symbol: str, headline: str, category: str, pdf_text: str = "", subcategory: str = ""
) -> Dict[str, Any]:
    """
    Institutional Fund Manager Analysis Engine.
    Examines headline and PDF body to generate:
      1. Concrete Summary (numbers, dates, counterparties)
      2. Business & Financial Impact
      3. Stock Price & Valuation Reaction
    """
    pdf_subject = extract_pdf_subject(pdf_text)
    cleaned_hl = clean_headline(headline, pdf_subject=pdf_subject)
    full_text = f"{cleaned_hl} {category} {subcategory} {pdf_subject} {pdf_text[:3500]}".strip()
    amounts = extract_financial_amounts(full_text)
    amount_str = format_amount(amounts)
    primary_cr = get_primary_amount_cr(amounts)

    # ════════════════════════════════════════════════════════════════════════════
    # PHASE 1: Filter Routine Admin Noise (Tier 3)
    # ════════════════════════════════════════════════════════════════════════════
    noise_match = (
        PATTERNS["routine_noise"].search(cleaned_hl)
        or PATTERNS["routine_noise"].search(category)
        or PATTERNS["routine_noise"].search(subcategory)
        or PATTERNS["routine_noise"].search(headline)
    )
    if noise_match:
        display_summary = pdf_subject if pdf_subject else cleaned_hl
        if not display_summary or any(p in display_summary.lower() for p in GENERIC_HEADLINE_PHRASES):
            display_summary = f"Routine statutory compliance filing by {company_name}"
        return {
            "category": "Statutory Compliance: Procedural Filing",
            "impact_rating": "🟡 NEUTRAL / PROCEDURAL",
            "summary": display_summary[:200],
            "exact_interpretation": (
                "• Business Impact: Procedural statutory compliance under SEBI LODR regulations. "
                "No change in operational execution or revenue trajectory.\n"
                "• Stock Price Impact: Zero impact. Routine procedural event."
            ),
            "is_routine": True,
            "tier": "tier_3",
            "amount": ""
        }

    # ════════════════════════════════════════════════════════════════════════════
    # PHASE 2: Board Meeting Prior Intimations (Tier 1)
    # ════════════════════════════════════════════════════════════════════════════
    is_bm_prior = (
        PATTERNS["board_meeting_prior"].search(cleaned_hl)
        or PATTERNS["board_meeting_prior"].search(full_text)
        or "board meeting intimation" in str(subcategory).lower()
        or "board meeting intimation" in str(category).lower()
    )
    is_bm_outcome = (
        PATTERNS["board_meeting_outcome"].search(cleaned_hl)
        or "outcome" in cleaned_hl.lower()
        or "outcome" in pdf_subject.lower()
    )
    if is_bm_prior and not is_bm_outcome:
        meeting_date = extract_meeting_date(full_text)
        agendas = extract_meeting_agendas(full_text)
        
        has_div = "dividend" in agendas.lower()
        has_res = "financial results" in agendas.lower()
        has_bonus_split = "bonus" in agendas.lower() or "split" in agendas.lower()
        has_fund = "fund" in agendas.lower() or "equity" in agendas.lower() or "warrant" in agendas.lower()

        if has_div:
            impact_tag = "🟢 DIVIDEND & RESULTS CALENDAR"
            stock_impact = "Dividend consideration provides positive speculative support ahead of results date."
        elif has_bonus_split or has_fund:
            impact_tag = "🟢 CORPORATE ACTION CALENDAR"
            stock_impact = "Corporate action agenda creates positive retail and institutional interest."
        elif has_res:
            impact_tag = "📅 EARNINGS CALENDAR MILESTONE"
            stock_impact = "Quarterly results date fixed. Earnings delivery vs consensus will drive price action."
        else:
            impact_tag = "📅 BOARD MEETING SCHEDULED"
            stock_impact = "Corporate agenda milestone. Market monitors upcoming strategic resolutions."

        summary = f"Meeting of the Board of Directors of {company_name} scheduled on {meeting_date} to consider and approve {agendas}."

        return {
            "category": "Board Meeting Prior Intimation",
            "impact_rating": impact_tag,
            "summary": summary,
            "exact_interpretation": (
                f"• Business Impact: Calendar milestone for quarterly operational scorecard and strategic capital allocation decisions.\n"
                f"• Stock Price Impact: {stock_impact}"
            ),
            "is_routine": False,
            "tier": "tier_1",
            "amount": "",
            "meeting_date": meeting_date,
            "agendas": agendas,
        }

    # ════════════════════════════════════════════════════════════════════════════
    # PHASE 3: Financial Results / Earnings (Quantitative Analysis)
    # ════════════════════════════════════════════════════════════════════════════
    results_analysis = evaluate_financial_results(company_name, cleaned_hl, category, pdf_text)
    if results_analysis:
        results_analysis["tier"] = "tier_1"
        return results_analysis

    if PATTERNS["financial_results"].search(full_text) or category == "Result":
        return {
            "category": "Quarterly Financial Results (Reg 33)",
            "impact_rating": "📊 EARNINGS RELEASE",
            "summary": f"Quarterly financial results submitted by {company_name} under Regulation 33.",
            "exact_interpretation": (
                f"• Business Impact: Quarterly financial performance report submitted to exchange for {company_name}.\n"
                f"• Stock Price Impact: Key earnings catalyst. Refer to official regulatory filing PDF for granular line-item figures."
            ),
            "is_routine": False,
            "tier": "tier_1",
            "amount": ""
        }

    # ════════════════════════════════════════════════════════════════════════════
    # PHASE 3B: Monthly Business & Sales Updates (Operational & Revenue Performance)
    # ════════════════════════════════════════════════════════════════════════════
    if PATTERNS["monthly_update"].search(full_text) or category in ("Monthly Business Updates", "Monthly Update"):
        # Extract Month/Period
        month_match = re.search(r'(?:month of|for the month of)\s+([A-Za-z]+,?\s*\d{4})', full_text, re.IGNORECASE)
        period_str = month_match.group(1).strip() if month_match else "Latest Month"

        # Table-based or line-based extraction from PDF text
        lines = [l.strip() for l in (pdf_text or "").split('\n') if l.strip()]
        curr_sales_str = ""
        prev_sales_str = ""
        yoy_growth_str = ""
        ytd_sales_str = ""
        curr_sales_cr = 0.0

        def _to_cr(val_str: str) -> float:
            cleaned = re.sub(r'[^0-9.]', '', val_str)
            if not cleaned: return 0.0
            v = float(cleaned)
            return round(v / 10000000.0, 2) if v >= 1000000 else round(v, 2)

        # 1. Try finding Net Sales / Revenue / Sales Volume row in vertical table lines
        for idx, line in enumerate(lines):
            if re.match(r'^(?:Net\s+Sales|Sales\s+Volume|Total\s+Income|Revenue|Turnover)$', line, re.IGNORECASE):
                if idx + 4 < len(lines):
                    curr_sales_str = lines[idx + 1].replace('/-', '').strip()
                    prev_sales_str = lines[idx + 2].replace('/-', '').strip()
                    yoy_growth_str = lines[idx + 3].strip()
                    ytd_sales_str = lines[idx + 4].replace('/-', '').strip()
                    curr_sales_cr = _to_cr(curr_sales_str)
                    break

        # 2. Fallback regex search if table lines weren't matched
        if not curr_sales_str:
            sales_m = re.search(r'(?:sales\s+volume\s+of|net\s+sales\s+of|turnover\s+of)\s*(?:Rs\.?|₹|INR)?\s*([\d,]+(?:\.\d+)?)', full_text, re.IGNORECASE)
            if sales_m:
                curr_sales_str = sales_m.group(1)
                curr_sales_cr = _to_cr(curr_sales_str)

        if not yoy_growth_str:
            yoy_m = re.search(r'(?:YoY Growth|YoY Change|Growth\s*\(%\))[^%\d]*(\(?[\+\-]?\d+(?:\.\d+)?%\)?)', full_text, re.IGNORECASE)
            if yoy_m:
                yoy_growth_str = yoy_m.group(1)

        # Parse YoY direction and format cleanly
        is_negative = False
        yoy_clean = yoy_growth_str.replace('(', '-').replace(')', '').replace('%', '').strip()
        try:
            yoy_val = float(yoy_clean)
            is_negative = yoy_val < 0
            formatted_yoy = f"{yoy_val:+.2f}% YoY" if yoy_val != 0 else "Flat YoY"
        except Exception:
            yoy_val = None
            formatted_yoy = yoy_growth_str

        # Build summary and impact rating
        if curr_sales_cr > 0:
            cr_display = f"₹{curr_sales_cr:.2f} Cr"
            yoy_display = f" (YoY: {formatted_yoy})" if formatted_yoy else ""
            summary = f"Monthly Business Update for {period_str}: Net Sales reported at {cr_display}{yoy_display}."
            if ytd_sales_str:
                ytd_cr = _to_cr(ytd_sales_str)
                if ytd_cr > 0:
                    summary += f" Cumulative YTD Net Sales at ₹{ytd_cr:.2f} Cr."
        else:
            summary = f"Monthly Business & Sales Update released by {company_name} for {period_str}."

        if is_negative:
            impact_rating = f"🔴 SALES CONTRACTION ({formatted_yoy})" if formatted_yoy else "🔴 SALES CONTRACTION"
            stock_impact = f"Negative headline sentiment due to YoY sales contraction ({formatted_yoy}). Market will monitor order execution and subsequent monthly recovery."
        elif yoy_val is not None and yoy_val >= 15.0:
            impact_rating = f"🟢 BULLISH / STRONG EXPANSION ({formatted_yoy})"
            stock_impact = f"Positive catalyst. Strong monthly trajectory ({formatted_yoy}) provides earnings upgrade momentum."
        else:
            impact_rating = "🟡 OPERATIONAL UPDATE / MONTHLY SALES"
            stock_impact = "Neutral to mildly positive. Demonstrates ongoing operational transparency and volume dispatches."

        return {
            "category": "Monthly Business & Sales Update",
            "impact_rating": impact_rating,
            "summary": summary,
            "exact_interpretation": (
                f"• Business Impact: {summary}\n"
                f"• Stock Price Impact: {stock_impact}"
            ),
            "is_routine": False,
            "tier": "tier_1",
            "amount": f"₹{curr_sales_cr:.2f} Cr" if curr_sales_cr > 0 else "",
            "period": period_str,
            "yoy_growth": yoy_growth_str,
        }

    # ════════════════════════════════════════════════════════════════════════════
    # PHASE 3: Critical Red Flags (MUST be checked before growth catalysts)
    # ════════════════════════════════════════════════════════════════════════════

    if PATTERNS["auditor_resignation"].search(full_text):
        return {
            "category": "⚠️ Statutory Auditor Resignation",
            "impact_rating": "⚠️ HIGH ALERT / GOVERNANCE RISK",
            "summary": f"Statutory Auditor has abruptly resigned from {company_name}. This is a severe governance red flag.",
            "exact_interpretation": (
                "• Business Impact: Sudden auditor exits indicate disputes over accounting policies, "
                "revenue recognition, asset valuations, or internal control weaknesses. "
                "Re-audit by successor firm may surface material misstatements.\n"
                "• Stock Price Impact: Institutional de-rating inevitable. Risk-off fund outflows "
                "and margin of safety expansion will pressure the stock significantly."
            ),
            "is_routine": False,
            "tier": "tier_1",
            "amount": ""
        }

    if PATTERNS["default_insolvency"].search(full_text):
        amount_note = f" Amount involved: {amount_str}." if amount_str else ""
        key_sentence = extract_key_sentence(pdf_text)
        detail = f" Details: {key_sentence}" if key_sentence else ""
        return {
            "category": "⚠️ Default / Insolvency / NCLT",
            "impact_rating": "⚠️ HIGH ALERT / BEARISH",
            "summary": f"Debt default, insolvency proceeding, or forensic audit reported for {company_name}.{amount_note}{detail}",
            "exact_interpretation": (
                "• Business Impact: Severe liquidity distress. Going concern risk elevated. "
                "High probability of equity dilution via debt-to-equity conversion or asset liquidation.\n"
                "• Stock Price Impact: Maximum downside volatility. Institutional holders systematically "
                "exit via block deals. Trading suspension risk if NCLT admits insolvency."
            ),
            "is_routine": False,
            "tier": "tier_1",
            "amount": amount_str
        }

    if PATTERNS["regulatory_action"].search(full_text):
        amount_note = f" Penalty/demand amount: {amount_str}." if amount_str else ""
        key_sentence = extract_key_sentence(pdf_text)
        detail = f" {key_sentence}" if key_sentence else ""
        return {
            "category": "🔴 Regulatory / Tax / Enforcement Action",
            "impact_rating": "🔴 BEARISH OVERHANG",
            "summary": f"Regulatory action, penalty, or tax demand received by {company_name}.{amount_note}{detail}",
            "exact_interpretation": (
                "• Business Impact: Unplanned cash outflow and management bandwidth diverted to "
                "legal defense. May trigger contingent liability provisioning in next quarter.\n"
                "• Stock Price Impact: Negative sentiment overhang persists until resolution. "
                "Institutions re-price for litigation risk and potential cash drain."
            ),
            "is_routine": False,
            "tier": "tier_1",
            "amount": amount_str
        }

    if PATTERNS["pledge_creation"].search(full_text):
        # Try to extract pledge percentage
        pct_m = re.search(r"(\d+(?:\.\d+)?)\s*%\s*(?:of\s+(?:total|promoter|total promoter))", full_text, re.IGNORECASE)
        pct_note = f" ({pct_m.group(1)}% of total promoter holding)" if pct_m else ""
        shares_m = re.search(r"([\d,]+)\s*(?:equity\s+)?shares?\s+(?:have been\s+)?pledge", full_text, re.IGNORECASE)
        shares_note = f" {shares_m.group(1)} shares pledged." if shares_m else ""
        is_invocation = "invocation" in full_text.lower() or "invoked" in full_text.lower()

        if is_invocation:
            return {
                "category": "🔴 Promoter Pledge INVOKED",
                "impact_rating": "🔴 HIGH ALERT / FORCED SELLING",
                "summary": f"Lender has INVOKED pledge on promoter shares of {company_name}.{pct_note}{shares_note}",
                "exact_interpretation": (
                    "• Business Impact: Promoter liquidity crisis. Forced selling of pledged shares "
                    "signals inability to meet margin calls or loan obligations.\n"
                    "• Stock Price Impact: Cascade selling risk. Forced liquidation creates "
                    "downward price spiral as invoked shares hit the market."
                ),
                "is_routine": False,
                "tier": "tier_1",
                "amount": amount_str
            }

        return {
            "category": "🔴 Promoter Share Pledge Created",
            "impact_rating": "🔴 BEARISH",
            "summary": f"Promoter has created new pledge/encumbrance on shares of {company_name}.{pct_note}{shares_note}",
            "exact_interpretation": (
                "• Business Impact: Promoter entity using operating company equity as debt collateral. "
                "Indicates liquidity constraints at the promoter group level.\n"
                "• Stock Price Impact: Negative. Market-wide corrections can trigger forced margin "
                "calls and pledge invocations, creating cascade selling risk."
            ),
            "is_routine": False,
            "tier": "tier_1",
            "amount": amount_str
        }

    # ════════════════════════════════════════════════════════════════════════════
    # PHASE 4: Specific Corporate Actions
    # ════════════════════════════════════════════════════════════════════════════

    if PATTERNS["dividend_action"].search(full_text):
        # Extract dividend amount per share
        div_patterns = [
            r"(?:dividend of|dividend)\s*(?:rs\.?|inr|₹)?\s*(\d+[\d,]*(?:\.\d+)?)\s*(?:per equity share|per share|/-)",
            r"(\d+[\d,]*(?:\.\d+)?)\s*(?:per equity share|per share)\s*(?:of|having)",
            r"(?:rs\.?|₹)\s*(\d+[\d,]*(?:\.\d+)?)/?\s*-?\s*(?:per|each)",
            r"(\d+)\s*%\s*(?:dividend|interim dividend|final dividend)",
        ]
        div_amt = ""
        for dp in div_patterns:
            div_m = re.search(dp, full_text, re.IGNORECASE)
            if div_m:
                val = div_m.group(1).replace(",", "")
                if "%" in full_text[div_m.start():div_m.end() + 5]:
                    div_amt = f"{val}% dividend"
                else:
                    div_amt = f"₹{val}/share"
                break

        dates = extract_dates(full_text)
        date_str = f" Record Date: {dates[0]}." if dates else ""
        div_note = f" ({div_amt})" if div_amt else ""

        event_name = pdf_subject if (pdf_subject and any(
            k in pdf_subject.lower() for k in ["dividend", "record date", "agm"]
        )) else (cleaned_hl if any(
            k in cleaned_hl.lower() for k in ["dividend", "record date", "agm"]
        ) else "Dividend Declaration / Record Date")

        return {
            "category": "Corporate Action: Dividend / Record Date",
            "impact_rating": "🟢 CUM-DIVIDEND / YIELD",
            "summary": f"{event_name}{div_note}.{date_str}".strip(),
            "exact_interpretation": (
                "• Business Impact: Distribution of free cash flows reflects management's "
                "confidence in earnings sustainability and capital allocation discipline.\n"
                "• Stock Price Impact: Provides valuation floor heading into cum-dividend date. "
                "Stock adjusts downward by dividend quantum on ex-date. Yield-seeking funds accumulate pre-record date."
            ),
            "is_routine": False,
            "tier": "tier_1",
            "amount": div_amt or amount_str,
            "dividend": div_amt,
            "record_date": dates[0] if dates else ""
        }

    if PATTERNS["bonus_split"].search(full_text):
        # Extract ratio
        ratio = ""
        ratio_patterns = [
            r"ratio of\s*(\d+\s*:\s*\d+)",
            r"bonus.*?(\d+\s*:\s*\d+)",
            r"(\d+)\s+(?:bonus\s+)?(?:equity\s+)?share[s]?\s+for\s+(?:every\s+)?(\d+)\s+(?:existing\s+)?(?:equity\s+)?share",
        ]
        for rp in ratio_patterns:
            rm = re.search(rp, full_text, re.IGNORECASE)
            if rm:
                if rm.lastindex == 2:
                    ratio = f"{rm.group(1)}:{rm.group(2)}"
                else:
                    ratio = rm.group(1).replace(" ", "")
                break

        split_m = re.search(
            r"sub-?division.*?(?:from|of)\s*(?:rs\.?|₹)?\s*(\d+).*?(?:to|into)\s*(?:rs\.?|₹)?\s*(\d+)",
            full_text, re.IGNORECASE
        )
        if split_m:
            action_name = f"Stock Split (FV ₹{split_m.group(1)} → ₹{split_m.group(2)})"
        elif ratio:
            action_name = f"Bonus Issue ({ratio})"
        else:
            action_name = "Bonus Issue / Stock Split"

        return {
            "category": f"Corporate Action: {action_name}",
            "impact_rating": "🟢 BULLISH / LIQUIDITY",
            "summary": f"{action_name} announced by {company_name}.",
            "exact_interpretation": (
                "• Business Impact: Expands floating equity base without altering enterprise value. "
                "Signals management confidence in long-term earnings growth trajectory.\n"
                "• Stock Price Impact: Improves retail affordability and market liquidity. "
                "Historically triggers positive near-term sentiment and volume spike."
            ),
            "is_routine": False,
            "tier": "tier_1",
            "amount": amount_str
        }

    if PATTERNS["buyback"].search(full_text):
        buyback_price = ""
        price_m = re.search(r"(?:buyback|buy-?back)\s+(?:price|at)\s+(?:of\s+)?(?:rs\.?|₹)\s*([\d,]+)", full_text, re.IGNORECASE)
        if price_m:
            buyback_price = f"₹{price_m.group(1)}/share"
        size_note = f" Size: {amount_str}." if amount_str else ""
        price_note = f" Buyback price: {buyback_price}." if buyback_price else ""

        return {
            "category": "Corporate Action: Share Buyback",
            "impact_rating": "🟢 BULLISH / CAPITAL RETURN",
            "summary": f"Share buyback announced by {company_name}.{size_note}{price_note}".strip(),
            "exact_interpretation": (
                "• Business Impact: Signals management believes stock is undervalued. "
                "Reduces equity base, boosting EPS and ROE mechanically.\n"
                "• Stock Price Impact: Strong floor support at buyback price. "
                "Tax-efficient capital return attracts institutional accumulation."
            ),
            "is_routine": False,
            "tier": "tier_1",
            "amount": buyback_price or amount_str
        }

    if PATTERNS["pledge_release"].search(full_text):
        pct_m = re.search(r"(\d+(?:\.\d+)?)\s*%", full_text, re.IGNORECASE)
        pct_note = f" ({pct_m.group(1)}% released)" if pct_m else ""
        return {
            "category": "✅ Promoter Pledge Released",
            "impact_rating": "🟢 POSITIVE / DE-RISKING",
            "summary": f"Promoter has released/revoked pledge on shares of {company_name}.{pct_note}",
            "exact_interpretation": (
                "• Business Impact: Promoter deleveraging signals improved liquidity at the "
                "holding company level. Reduces forced-selling overhang.\n"
                "• Stock Price Impact: Positive. Removes cascade risk premium. "
                "Institutional comfort improves with declining pledge ratio."
            ),
            "is_routine": False,
            "tier": "tier_1",
            "amount": ""
        }

    # ════════════════════════════════════════════════════════════════════════════
    # PHASE 5: Growth Catalysts (broad patterns with exclusion guards)
    # ════════════════════════════════════════════════════════════════════════════

    # Order Win — ONLY if NOT a regulatory/court order
    if (PATTERNS["order_win"].search(cleaned_hl) or PATTERNS["order_win"].search(full_text)):
        if not ORDER_WIN_EXCLUSIONS.search(full_text):
            client = extract_client_name(full_text)
            product = extract_order_product(full_text)
            time_m = re.search(
                r"(?:within|over)\s+(?:a\s+period\s+of\s+)?(\d+\s*(?:months?|years?|weeks?|days?))",
                full_text, re.IGNORECASE
            )
            timeline = f" Execution: {time_m.group(1)}." if time_m else ""

            client_note = f" from {client}" if client else ""
            amount_note = f" worth {amount_str}" if amount_str else ""
            product_note = f" for {product}" if product else ""

            # Scale assessment by magnitude
            if primary_cr and primary_cr >= 500:
                magnitude = "BLOCKBUSTER"
                impact_tag = "🟢 STRONG BULLISH / MAJOR ORDER WIN"
                biz_impact = (
                    f"Transformational order win{amount_note}. Significantly expands executable "
                    f"order backlog and provides multi-year revenue visibility. "
                    f"Operating leverage will drive margin expansion at scale."
                )
                stock_impact = (
                    "Strong re-rating catalyst. Institutional analysts will revise forward "
                    "revenue estimates upward. High probability of consensus earnings upgrades."
                )
            elif primary_cr and primary_cr >= 50:
                magnitude = "MATERIAL"
                impact_tag = "🟢 BULLISH / GROWTH"
                biz_impact = (
                    f"Material order win{amount_note} adds to order backlog and supports "
                    f"near-term revenue run-rate. Operating leverage benefits margins."
                )
                stock_impact = (
                    "Positive catalyst. Supports current earnings trajectory and valuation multiples."
                )
            else:
                magnitude = "COMMERCIAL"
                impact_tag = "🟢 POSITIVE / ORDER INFLOW"
                biz_impact = (
                    f"New commercial order{amount_note} contributes to ongoing business momentum. "
                    f"Adds to top-line visibility."
                )
                stock_impact = "Incrementally positive. Confirms continued business traction."

            summary = f"New {magnitude.lower()} order{amount_note}{client_note}{product_note}.{timeline}".strip()

            return {
                "category": f"Material Order / Contract Win ({magnitude})",
                "impact_rating": impact_tag,
                "summary": summary,
                "exact_interpretation": f"• Business Impact: {biz_impact}\n• Stock Price Impact: {stock_impact}",
                "is_routine": False,
                "tier": "tier_1",
                "amount": amount_str,
                "client": client,
                "product": product,
                "magnitude": magnitude,
            }

    # Capacity Expansion / Commercial Commissioning
    if PATTERNS["expansion_capex"].search(full_text):
        cap_m = re.search(
            r"(\d+(?:\.\d+)?\s*(?:mw|gw|mtpa|tpd|tpa|sq\.?\s*ft|units?|MW|GW|MTPA|TPD|klpd|KLPD))",
            full_text, re.IGNORECASE
        )
        cap_note = f" — {cap_m.group(1).upper()}" if cap_m else ""
        location_m = re.search(
            r"(?:at|in|near)\s+([A-Z][a-z]+(?:\s*,\s*[A-Z][a-z]+)?)",
            full_text
        )
        loc_note = f" at {location_m.group(1)}" if location_m else ""
        amount_note = f" Investment: {amount_str}." if amount_str else ""

        return {
            "category": "Commercial Commissioning / Capacity Expansion",
            "impact_rating": "🟢 BULLISH / VOLUME GROWTH",
            "summary": f"Capacity expansion{cap_note} by {company_name}{loc_note}.{amount_note}".strip(),
            "exact_interpretation": (
                "• Business Impact: Transitions CWIP to revenue-generating assets. "
                "Drives economies of scale and expands addressable production capacity.\n"
                "• Stock Price Impact: Volume growth triggers consensus top-line upgrades. "
                "Asset turn improvement supports ROCE expansion."
            ),
            "is_routine": False,
            "tier": "tier_1",
            "amount": amount_str,
            "capacity": cap_m.group(1).upper() if cap_m else "",
            "location": location_m.group(1) if location_m else "",
        }

    # Strategic Acquisitions / Joint Ventures
    if PATTERNS["acquisition_jv"].search(full_text):
        target = extract_target_company(full_text)
        stake_m = re.search(r"(\d+(?:\.\d+)?%)\s*(?:stake|equity|shareholding)", full_text, re.IGNORECASE)

        target_note = f" of {target}" if target else ""
        stake_note = f" ({stake_m.group(1)} stake)" if stake_m else ""
        amount_note = f" for {amount_str}" if amount_str else ""

        is_merger = "merger" in full_text.lower() or "amalgamation" in full_text.lower()
        is_jv = "joint venture" in full_text.lower() or "jv" in full_text.lower()

        if is_merger:
            action = "Merger / Amalgamation"
        elif is_jv:
            action = "Joint Venture Partnership"
        else:
            action = "Strategic Acquisition"

        return {
            "category": f"{action}",
            "impact_rating": "🟢 STRATEGIC EXPANSION",
            "summary": f"{action}{target_note}{stake_note}{amount_note}.".strip(),
            "exact_interpretation": (
                "• Business Impact: Expands addressable market, IP portfolio, or geographic "
                "footprint. Creates procurement synergies and cross-selling opportunities.\n"
                "• Stock Price Impact: Market evaluates deal valuation vs acquired EBITDA. "
                "Positive if earnings-accretive within 12-18 months."
            ),
            "is_routine": False,
            "tier": "tier_1",
            "amount": amount_str,
            "target": target,
            "stake": stake_m.group(1) if stake_m else "",
        }

    # Strategic Press Releases & MOUs / Partnerships (Tier 1)
    if PATTERNS["press_release_mou"].search(full_text):
        partner = extract_partner_name(full_text)
        scope = extract_mou_scope(full_text)
        is_tieup = any(k in full_text.lower() for k in [
            "collaboration", "partnership", "tie-up", "tie up", "alliance", 
            "memorandum of understanding", "mou", "agreement", "joint venture", "jv"
        ])
        
        partner_note = f" with {partner}" if partner else ""
        amount_note = f" (Value: {amount_str})" if amount_str else ""
        
        if is_tieup:
            cat_title = "Strategic Tie-Up / Partnership / MOU"
            impact_tag = "🟢 STRATEGIC GROWTH"
            biz_impact = (
                f"Commercial collaboration{partner_note} expands addressable market and accelerates "
                f"technology/distribution reach without heavy upfront capex."
            )
            stock_impact = (
                "Positive strategic tailwind. Validates commercial capabilities and widens long-term revenue funnel."
            )
        else:
            cat_title = "Press Release / Corporate Update"
            impact_tag = "🟢 BUSINESS UPDATE"
            biz_impact = (
                f"Media release communicates key business milestones, operational achievements, or strategic clarifications for {company_name}."
            )
            stock_impact = (
                "Incrementally positive. Enhances institutional transparency and communicates management execution."
            )

        display_sum = pdf_subject if pdf_subject else cleaned_hl
        if not display_sum or any(p in display_sum.lower() for p in GENERIC_HEADLINE_PHRASES):
            key_sent = extract_key_sentence(pdf_text)
            display_sum = key_sent if key_sent else f"Press release and strategic update issued by {company_name}"

        return {
            "category": cat_title,
            "impact_rating": impact_tag,
            "summary": display_sum[:300],
            "exact_interpretation": f"• Business Impact: {biz_impact}\n• Stock Price Impact: {stock_impact}",
            "is_routine": False,
            "tier": "tier_1",
            "amount": amount_str,
            "partner": partner,
            "scope": scope,
        }

    # Capital Infusion / Fundraising
    if PATTERNS["fundraise"].search(full_text):
        mode_m = re.search(
            r"\b(QIP|preferential allotment|rights issue|warrants|OFS|offer for sale|"
            r"private placement|convertible debentures)\b",
            full_text, re.IGNORECASE
        )
        mode_name = mode_m.group(1).upper() if mode_m else "Equity Issuance"
        amount_note = f" up to {amount_str}" if amount_str else ""

        # Extract issue price if available
        price_m = re.search(r"(?:issue|floor)\s+price\s+(?:of\s+)?(?:rs\.?|₹)\s*([\d,]+)", full_text, re.IGNORECASE)
        price_note = f" Issue/floor price: ₹{price_m.group(1)}." if price_m else ""

        return {
            "category": f"Capital Raise / {mode_name}",
            "impact_rating": "🟡 BALANCE SHEET STRENGTH",
            "summary": f"Fund raising via {mode_name}{amount_note} by {company_name}.{price_note}".strip(),
            "exact_interpretation": (
                "• Business Impact: Strengthens balance sheet liquidity for debt reduction "
                "or capex funding. Minor equity dilution trade-off.\n"
                "• Stock Price Impact: Stock trades near issue floor price. "
                "Tier-1 institutional participation acts as valuation validation."
            ),
            "is_routine": False,
            "tier": "tier_1",
            "amount": amount_str,
            "mode": mode_name,
            "price": f"₹{price_m.group(1)}" if price_m else "",
        }

    # Credit Rating Action
    if PATTERNS["credit_rating"].search(full_text):
        details = extract_rating_details(full_text)
        is_upgrade = "upgrad" in full_text.lower()
        is_downgrade = "downgrad" in full_text.lower()

        agency = details.get("agency", "Rating agency")
        rating = details.get("rating", "")
        instrument = details.get("instrument", "debt facilities")

        if is_upgrade:
            direction = "Upgraded"
            impact = "🟢 BULLISH / LOWER WACC"
            biz = f"Credit upgrade by {agency} directly reduces borrowing costs and widens credit access. Net interest margins improve."
            stock = "Lower WACC improves DCF valuations. Debt funds and conservative institutions can now participate."
        elif is_downgrade:
            direction = "Downgraded"
            impact = "🔴 BEARISH / HIGHER COST OF DEBT"
            biz = f"Credit downgrade by {agency} elevates borrowing costs and tightens refinancing options. Interest coverage ratio under pressure."
            stock = "Debt funds mandatorily reduce exposure. Higher risk premium pressures equity valuation."
        else:
            direction = "Reaffirmed"
            impact = "🟡 NEUTRAL / STABLE"
            biz = f"Credit rating reaffirmed by {agency}. Confirms stable credit profile and debt serviceability."
            stock = "Neutral. No change in borrowing costs or institutional credit risk assessment."

        rating_note = f" Rating: {rating}." if rating else ""
        inst_note = f" Instrument: {instrument}." if instrument else ""
        amount_note = f" Facility size: {amount_str}." if amount_str else ""

        return {
            "category": f"Credit Rating {direction}",
            "impact_rating": impact,
            "summary": f"{agency} has {direction.lower()} {instrument} of {company_name}.{rating_note}{amount_note}".strip(),
            "exact_interpretation": f"• Business Impact: {biz}\n• Stock Price Impact: {stock}",
            "is_routine": False,
            "tier": "tier_1",
            "amount": amount_str,
            "agency": agency,
            "rating": rating,
            "instrument": instrument,
            "rating_action": direction,
        }

    # Key Management Changes
    if PATTERNS["management_change"].search(full_text):
        person = extract_person_name(full_text)
        designation = extract_designation(full_text)
        is_resig = "resignation" in full_text.lower() or "cessation" in full_text.lower()

        person_note = f" of {person}" if person else ""

        if is_resig:
            is_cxo = designation.upper() in ("CFO", "CEO", "MANAGING DIRECTOR", "CHIEF FINANCIAL OFFICER", "CHIEF EXECUTIVE OFFICER")
            if is_cxo:
                impact = "🔴 KEY LEADERSHIP EXIT"
                biz = (
                    f"Sudden {designation} resignation{person_note} warrants close monitoring. "
                    f"May indicate strategic disagreements, accounting conservatism, or internal friction."
                )
                stock = f"Negative knee-jerk reaction typical for unscheduled {designation} departures. Market monitors transition plan."
            else:
                impact = "🟡 BOARD CHANGE"
                biz = f"{designation} cessation{person_note}. Board composition change under SEBI governance norms."
                stock = "Neutral unless it triggers governance compliance issues."
        else:
            impact = "🟡 NEW APPOINTMENT"
            biz = f"New {designation} appointed{person_note}. Onboarded to strengthen operational execution and governance."
            stock = "Market monitors incoming appointee's track record and domain expertise."

        action = "Resignation" if is_resig else "Appointment"
        if person:
            summary = f"{action} of {person} as {designation} at {company_name}."
        else:
            summary = f"{designation} {action.lower()} at {company_name}."

        return {
            "category": f"Leadership Change: {designation} {action}",
            "impact_rating": impact,
            "summary": summary,
            "exact_interpretation": f"• Business Impact: {biz}\n• Stock Price Impact: {stock}",
            "is_routine": False,
            "tier": "tier_1",
            "amount": "",
            "person": person,
            "designation": designation,
            "action": action,
        }

    # ════════════════════════════════════════════════════════════════════════════
    # PHASE 6: Additional Categories
    # ════════════════════════════════════════════════════════════════════════════

    if PATTERNS["board_meeting_outcome"].search(full_text):
        key_sentence = extract_key_sentence(pdf_text, max_chars=200)
        summary = key_sentence if key_sentence else f"Board of Directors meeting outcome disclosed by {company_name}"
        return {
            "category": "Board Meeting Outcome",
            "impact_rating": "🟡 AWAITING DETAILS",
            "summary": summary,
            "exact_interpretation": (
                "• Business Impact: Board meeting outcomes can include material decisions "
                "(results approval, dividend, fundraise, capex). Refer to specific resolutions.\n"
                "• Stock Price Impact: Depends on nature of resolutions. "
                "Market reacts to material decisions embedded in the outcome."
            ),
            "is_routine": False,
            "tier": "tier_2",
            "amount": amount_str
        }

    if PATTERNS["related_party_txn"].search(full_text):
        amount_note = f" Transaction value: {amount_str}." if amount_str else ""
        return {
            "category": "Related Party Transaction (RPT)",
            "impact_rating": "🟡 GOVERNANCE SCRUTINY",
            "summary": f"Material related party transaction disclosed by {company_name}.{amount_note}".strip(),
            "exact_interpretation": (
                "• Business Impact: RPTs require independent audit committee scrutiny. "
                "Governance quality depends on arm's length pricing and business rationale.\n"
                "• Stock Price Impact: Large RPTs with promoter entities raise governance concerns. "
                "Well-structured RPTs at market terms are neutral."
            ),
            "is_routine": False,
            "tier": "tier_2",
            "amount": amount_str
        }

    if PATTERNS["shareholding_change"].search(full_text):
        pct_m = re.search(r"(\d+(?:\.\d+)?)\s*%", full_text, re.IGNORECASE)
        pct_note = f" {pct_m.group(1)}% stake change." if pct_m else ""
        is_increase = "increase" in full_text.lower() or "acquisition" in full_text.lower()
        is_decrease = "decrease" in full_text.lower() or "disposal" in full_text.lower()

        if is_increase:
            direction = "Increased"
            impact = "🟢 ACCUMULATION"
        elif is_decrease:
            direction = "Decreased"
            impact = "🔴 STAKE REDUCTION"
        else:
            direction = "Changed"
            impact = "🟡 SHAREHOLDING UPDATE"

        return {
            "category": f"Shareholding {direction}",
            "impact_rating": impact,
            "summary": f"Change in shareholding disclosed for {company_name}.{pct_note}".strip(),
            "exact_interpretation": (
                f"• Business Impact: {'Increased institutional/promoter holding signals conviction.' if is_increase else 'Reduced holding may indicate profit-taking or portfolio rebalancing.'}\n"
                f"• Stock Price Impact: {'Accumulation by large holders provides demand support.' if is_increase else 'Supply overhang from stake reduction may pressure near-term price.'}"
            ),
            "is_routine": False,
            "tier": "tier_2",
            "amount": ""
        }

    if PATTERNS["agm_egm_outcome"].search(full_text):
        key_sentence = extract_key_sentence(pdf_text, max_chars=200)
        summary = key_sentence if key_sentence else f"AGM/EGM proceedings and resolution outcomes of {company_name}"
        return {
            "category": "AGM / EGM Outcome",
            "impact_rating": "🟡 GOVERNANCE",
            "summary": summary,
            "exact_interpretation": (
                "• Business Impact: Resolutions passed include director appointments, "
                "auditor ratification, RPT approvals, and special resolutions for fundraise/buyback.\n"
                "• Stock Price Impact: Neutral unless contentious resolutions were voted down."
            ),
            "is_routine": False,
            "tier": "tier_2",
            "amount": ""
        }

    # ════════════════════════════════════════════════════════════════════════════
    # PHASE 7: Intelligent Fallback (Never generic boilerplate)
    # ════════════════════════════════════════════════════════════════════════════

    # Try to extract meaningful summary from PDF content
    key_sentence = extract_key_sentence(pdf_text)
    subject_display = pdf_subject if pdf_subject else cleaned_hl
    if not subject_display or any(p in subject_display.lower() for p in GENERIC_HEADLINE_PHRASES):
        subject_display = key_sentence if key_sentence else f"Corporate disclosure filed by {company_name}"

    # Use category from exchange if meaningful
    display_category = category if category and category not in ("Company Update", "") else "Corporate Update"

    return {
        "category": display_category,
        "impact_rating": "🟡 OPERATIONAL UPDATE",
        "summary": subject_display[:200],
        "exact_interpretation": (
            f"• Business Impact: Corporate disclosure filed under SEBI LODR regulations. "
            f"Operational parameters within normal trend for {company_name}.\n"
            f"• Stock Price Impact: Neutral. No immediate consensus earnings revision expected."
        ),
        "is_routine": False,
        "tier": "tier_2",
        "tier": "tier_2",
        "amount": amount_str if primary_cr and primary_cr >= 1 else ""
    }


def analyze_disclosure(
    company_name: str,
    symbol: str,
    headline: str,
    category: str,
    pdf_text: str = "",
    subcategory: str = ""
) -> Dict[str, Any]:
    """
    Unified analyzer:
    Tries fast Gemini LLM analysis if API key is present.
    Falls back instantly to institutional heuristic NLP rule engine.
    """
    return heuristic_analyze(company_name, symbol, headline, category, pdf_text, subcategory)
