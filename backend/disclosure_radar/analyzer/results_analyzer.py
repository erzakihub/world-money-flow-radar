"""
Quantitative Financial Results & Earnings Analyzer for NSE & BSE Filings.
Extracts financial tables and press release statements from regulatory PDFs.
Calculates:
  - Revenue & Net Profit (PAT) with YoY % and QoQ %
  - Gross Margin % with YoY (bps) & QoQ (bps) change
  - EBITDA Margin % with YoY (bps) & QoQ (bps) change
  - PAT (Net) Margin % with YoY (bps) & QoQ (bps) change
  - Institutional Fund Manager Impact Assessment (Business & Stock Price)
"""

import re
import logging
from typing import Dict, Any, Optional, Tuple, List

logger = logging.getLogger("disclosure_radar.results_analyzer")

RESULTS_KEYWORDS = re.compile(
    r"\b(financial results|quarterly results|audited results|unaudited results|"
    r"un-audited results|statement of profit and loss|outcome of board meeting.*?results|"
    r"q[1-4]\s*(?:fy)?\d{2,4}|quarter ended|half year ended|annual financial results)\b",
    re.IGNORECASE
)

def clean_num(val_str: Any) -> Optional[float]:
    """Parse number string into float safely."""
    if val_str is None:
        return None
    try:
        s = str(val_str).replace(",", "").strip()
        return float(s)
    except (ValueError, TypeError):
        return None

def calc_pct_change(curr: float, base: float) -> Optional[float]:
    """Calculate percentage growth."""
    if base and base != 0:
        if base < 0 and curr < 0:
            return ((abs(base) - abs(curr)) / abs(base)) * 100.0
        return ((curr - base) / abs(base)) * 100.0
    return None

def format_change(pct: Optional[float]) -> str:
    """Format percentage change with directional emoji."""
    if pct is None:
        return "N/A"
    emoji = "🟢" if pct > 0 else ("🔴" if pct < 0 else "🟡")
    return f"{pct:+.1f}% {emoji}"

def format_bps(bps: Optional[float]) -> str:
    """Format basis points change with directional emoji."""
    if bps is None:
        return "N/A"
    emoji = "🟢" if bps > 0 else ("🔴" if bps < 0 else "🟡")
    return f"{bps:+.0f} bps {emoji}"

def parse_tabular_results(pdf_text: str) -> Optional[Dict[str, Any]]:
    """
    Parse Regulation 33 Statement of Profit & Loss table.
    Looks for standard rows:
      - Revenue from operations / Total Income
      - Cost of materials consumed / Raw materials
      - Total Expenses
      - Profit before tax (PBT)
      - Net Profit / Profit after tax (PAT)
    Extracts columns: [Current Quarter, Preceding Quarter (QoQ), Year-ago Quarter (YoY)]
    """
    if not pdf_text:
        return None

    lines = pdf_text.splitlines()
    data = {}

    for line in lines:
        l_lower = line.lower().strip()
        tokens = re.findall(r"[-+]?[\d,]+\.\d{2}", line)
        nums = [clean_num(t) for t in tokens if clean_num(t) is not None]

        # 1. Revenue / Total Income
        if ("revenue from operations" in l_lower or "total income" in l_lower or "turnover" in l_lower) and len(nums) >= 3:
            if "total income" in l_lower and "revenue" in data:
                pass
            else:
                data["revenue"] = nums[:3]

        # 2. Raw Material / Cost of Materials Consumed
        if any(term in l_lower for term in ["cost of materials consumed", "raw materials", "cost of goods sold", "cogs"]) and len(nums) >= 3:
            if "materials" not in data:
                data["materials"] = nums[:3]

        # 3. Total Expenses
        if ("total expenses" in l_lower or "expenses" in l_lower) and len(nums) >= 3:
            if "expenses" not in data and "other expenses" not in l_lower:
                data["expenses"] = nums[:3]

        # 4. Net Profit / PAT
        if any(term in l_lower for term in ["net profit", "profit after tax", "profit for the period", "pat"]) and len(nums) >= 3:
            if "pat" not in data and "before tax" not in l_lower:
                data["pat"] = nums[:3]

        # 5. EPS Extraction
        if any(term in l_lower for term in ["earnings per share", "basic eps", "diluted eps"]) and len(nums) >= 1:
            if "eps" not in data:
                data["eps"] = nums[:3]
                
        # 6. Exceptional Items
        if any(term in l_lower for term in ["exceptional items", "extraordinary items"]) and "before" not in l_lower and "after" not in l_lower and len(nums) >= 1:
            if "exceptional" not in data:
                data["exceptional"] = nums[:3]

    if "revenue" in data and "pat" in data:
        r_curr, r_qoq, r_yoy = data["revenue"]
        p_curr, p_qoq, p_yoy = data["pat"]

        if r_curr > 0:
            rev_yoy = calc_pct_change(r_curr, r_yoy)
            rev_qoq = calc_pct_change(r_curr, r_qoq)
            pat_yoy = calc_pct_change(p_curr, p_yoy)
            pat_qoq = calc_pct_change(p_curr, p_qoq)

            # PAT Margin
            pat_margin_curr = (p_curr / r_curr) * 100.0
            pat_margin_qoq = (p_qoq / r_qoq) * 100.0 if r_qoq else None
            pat_margin_yoy = (p_yoy / r_yoy) * 100.0 if r_yoy else None

            pat_margin_yoy_bps = (pat_margin_curr - pat_margin_yoy) * 100.0 if pat_margin_yoy is not None else None
            pat_margin_qoq_bps = (pat_margin_curr - pat_margin_qoq) * 100.0 if pat_margin_qoq is not None else None

            # Gross Margin
            gross_margin_curr = None
            gross_margin_yoy_bps = None
            gross_margin_qoq_bps = None
            if "materials" in data:
                m_curr, m_qoq, m_yoy = data["materials"]
                if r_curr > m_curr:
                    gross_margin_curr = ((r_curr - m_curr) / r_curr) * 100.0
                    if r_yoy and r_yoy > m_yoy:
                        gross_margin_yoy = ((r_yoy - m_yoy) / r_yoy) * 100.0
                        gross_margin_yoy_bps = (gross_margin_curr - gross_margin_yoy) * 100.0
                    if r_qoq and r_qoq > m_qoq:
                        gross_margin_qoq = ((r_qoq - m_qoq) / r_qoq) * 100.0
                        gross_margin_qoq_bps = (gross_margin_curr - gross_margin_qoq) * 100.0

            # EBITDA Margin
            ebitda_margin_curr = None
            ebitda_margin_yoy_bps = None
            ebitda_margin_qoq_bps = None
            if "expenses" in data:
                e_curr, e_qoq, e_yoy = data["expenses"]
                ebitda_curr = r_curr - e_curr
                ebitda_yoy = r_yoy - e_yoy if r_yoy else None
                ebitda_qoq = r_qoq - e_qoq if r_qoq else None
                if r_curr > 0:
                    ebitda_margin_curr = (ebitda_curr / r_curr) * 100.0
                    if r_yoy and ebitda_yoy is not None:
                        ebitda_margin_yoy = (ebitda_yoy / r_yoy) * 100.0
                        ebitda_margin_yoy_bps = (ebitda_margin_curr - ebitda_margin_yoy) * 100.0
                    if r_qoq and ebitda_qoq is not None:
                        ebitda_margin_qoq = (ebitda_qoq / r_qoq) * 100.0
                        ebitda_margin_qoq_bps = (ebitda_margin_curr - ebitda_margin_qoq) * 100.0

            is_loss = (p_curr < 0)
            
            eps_basic = None
            if "eps" in data and len(data["eps"]) >= 1:
                eps_basic = data["eps"][0]
                
            exceptional_items = None
            if "exceptional" in data and len(data["exceptional"]) >= 1:
                exc_val = data["exceptional"][0]
                if exc_val != 0:
                    exceptional_items = exc_val

            return {
                "source": "table",
                "rev_curr": r_curr,
                "rev_yoy": rev_yoy,
                "rev_qoq": rev_qoq,
                "pat_curr": p_curr,
                "pat_yoy": pat_yoy,
                "pat_qoq": pat_qoq,
                "gross_margin_curr": gross_margin_curr,
                "gross_margin_yoy_bps": gross_margin_yoy_bps,
                "gross_margin_qoq_bps": gross_margin_qoq_bps,
                "ebitda_margin_curr": ebitda_margin_curr,
                "ebitda_margin_yoy_bps": ebitda_margin_yoy_bps,
                "ebitda_margin_qoq_bps": ebitda_margin_qoq_bps,
                "pat_margin_curr": pat_margin_curr,
                "pat_margin_yoy_bps": pat_margin_yoy_bps,
                "pat_margin_qoq_bps": pat_margin_qoq_bps,
                "is_loss": is_loss,
                "eps_basic": eps_basic,
                "exceptional_items": exceptional_items,
            }

    return None

def extract_money_figures(text: str) -> List[Tuple[float, str]]:
    """Extract currency values like Rs. 4,698 Cr or 500 Crore from text."""
    matches = re.findall(
        r"(?:(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d+)?)\s*(cr(?:ore)?s?|lakh?s?|bn|mn)?|([\d,]+(?:\.\d+)?)\s*(cr(?:ore)?s?|lakh?s?|bn|mn))",
        text, re.IGNORECASE
    )
    results = []
    for g in matches:
        num = g[0] or g[2]
        unit = g[1] or g[3]
        if num:
            val = clean_num(num)
            if val and val > 0:
                results.append((val, f" {unit.capitalize()}" if unit else " Cr"))
    return results

def parse_press_release_results(text: str) -> Optional[Dict[str, Any]]:
    """
    Extract stated figures from investor press releases or management summaries.
    Handles explicit statements like:
      - 'Revenue grew 21% YoY to Rs. 4,698 Cr'
      - 'Gross margin expanded by 60 bps YoY to 28.4%'
      - 'EBITDA margin stood at 13.2% (+50 bps YoY, -30 bps QoQ)'
      - 'PAT surged 28% YoY to Rs. 402 Cr'
    """
    sentences = [s.strip() for s in text.splitlines() if s.strip()]
    parsed = {}

    for s in sentences:
        s_lower = s.lower()
        money = extract_money_figures(s)

        # 1. Revenue / Top-line
        if any(k in s_lower for k in ["revenue", "turnover", "total income"]) and "margin" not in s_lower:
            if money and "revenue_val" not in parsed:
                parsed["revenue_val"], parsed["revenue_unit"] = money[0]
            is_down = any(w in s_lower for w in ["fell", "down", "declin", "drop", "contract", "lower by", "-"])
            yoy_m = re.search(r"([\d.]+)%\s*(?:yoy|y-o-y)|(?:up|grew|increased|rose|jumped|surged|growth of|fell|declined|dropped|down)\s*(?:by)?\s*([\d.]+)%", s, re.IGNORECASE)
            if yoy_m and "revenue_yoy" not in parsed:
                val = clean_num(yoy_m.group(1) or yoy_m.group(2))
                if val is not None:
                    parsed["revenue_yoy"] = -abs(val) if is_down else abs(val)
            qoq_m = re.search(r"([\d.]+)%\s*(?:qoq|q-o-q)", s, re.IGNORECASE)
            if qoq_m and "revenue_qoq" not in parsed:
                val = clean_num(qoq_m.group(1))
                if val is not None:
                    parsed["revenue_qoq"] = -abs(val) if is_down else abs(val)

        # 2. Gross Margin
        if "gross margin" in s_lower or "gross profit margin" in s_lower:
            gm_m = re.search(r"([\d.]+)%", s)
            if gm_m and "gross_margin" not in parsed:
                parsed["gross_margin"] = clean_num(gm_m.group(1))
            bps_m = re.search(r"(\d+)\s*(?:bps|basis points)", s, re.IGNORECASE)
            if bps_m and "gross_bps_yoy" not in parsed:
                is_contract = any(w in s_lower for w in ["contract", "down", "declin", "fell", "-"])
                b_val = clean_num(bps_m.group(1))
                if b_val:
                    parsed["gross_bps_yoy"] = -abs(b_val) if is_contract else abs(b_val)

        # 3. Operating Profit / EBITDA
        if "ebitda" in s_lower or "operating profit" in s_lower:
            margin_m = re.search(r"margin.*?([\d.]+)%|([\d.]+)%\s*margin", s, re.IGNORECASE)
            bps_m = re.search(r"(\d+)\s*(?:bps|basis points)", s, re.IGNORECASE)
            if margin_m and "ebitda_margin" not in parsed:
                val = margin_m.group(1) or margin_m.group(2)
                parsed["ebitda_margin"] = clean_num(val)
            if bps_m and "ebitda_bps_yoy" not in parsed:
                is_contract = any(w in s_lower for w in ["contract", "down", "declin", "fell", "-"])
                b_val = clean_num(bps_m.group(1))
                if b_val:
                    parsed["ebitda_bps_yoy"] = -abs(b_val) if is_contract else abs(b_val)

        # 4. Net Profit / PAT
        if any(k in s_lower for k in ["pat", "net profit", "profit after tax"]) and "margin" not in s_lower:
            if money and "pat_val" not in parsed:
                parsed["pat_val"], parsed["pat_unit"] = money[0]
            is_down = any(w in s_lower for w in ["fell", "down", "declin", "drop", "contract", "lower by", "-"])
            yoy_m = re.search(r"([\d.]+)%\s*(?:yoy|y-o-y)|(?:up|grew|increased|rose|jumped|surged|growth of|fell|declined|dropped|down)\s*(?:by)?\s*([\d.]+)%", s, re.IGNORECASE)
            if yoy_m and "pat_yoy" not in parsed:
                val = clean_num(yoy_m.group(1) or yoy_m.group(2))
                if val is not None:
                    parsed["pat_yoy"] = -abs(val) if is_down else abs(val)
            qoq_m = re.search(r"([\d.]+)%\s*(?:qoq|q-o-q)", s, re.IGNORECASE)
            if qoq_m and "pat_qoq" not in parsed:
                val = clean_num(qoq_m.group(1))
                if val is not None:
                    parsed["pat_qoq"] = -abs(val) if is_down else abs(val)

        # 5. PAT Margin
        if ("pat margin" in s_lower or "net profit margin" in s_lower) or ("margin" in s_lower and "pat" in s_lower and "ebitda" not in s_lower and "gross" not in s_lower):
            pm_m = re.search(r"([\d.]+)%", s)
            if pm_m and "pat_margin" not in parsed:
                parsed["pat_margin"] = clean_num(pm_m.group(1))

    return parsed if (parsed.get("revenue_val") or parsed.get("pat_val") or parsed.get("ebitda_margin") or parsed.get("gross_margin")) else None

def evaluate_financial_results(company_name: str, headline: str, category: str, pdf_text: str) -> Optional[Dict[str, Any]]:
    """
    Complete analysis of financial results.
    Returns:
      - formatted summary with YoY, QoQ, Gross / EBITDA / PAT margin profiles & bps changes
      - exact quantitative fund manager interpretation (Business & Stock Price impact)
      - impact rating (🟢 BEAT / 🔴 MISS / 🟡 IN-LINE)
    """
    full_text = f"{headline} {category} {pdf_text}".strip()

    if not RESULTS_KEYWORDS.search(full_text):
        return None

    tab = parse_tabular_results(pdf_text)
    pr = parse_press_release_results(full_text)

    if not tab and not pr:
        return None

    summary_lines = ["<b>📊 FINANCIAL PERFORMANCE BREAKDOWN:</b>"]
    key_metrics = []

    # 1. Revenue
    if tab and tab.get("rev_curr"):
        r_val = f"₹{tab['rev_curr']:,.1f} Cr"
        yoy_str = format_change(tab.get('rev_yoy'))
        qoq_str = format_change(tab.get('rev_qoq'))
        summary_lines.append(f"• <b>Revenue:</b> {r_val}")
        summary_lines.append(f"  ↳ YoY: <b>{yoy_str}</b> | QoQ: <b>{qoq_str}</b>")
        key_metrics.append(r_val)
    elif pr and pr.get("revenue_val"):
        r_val = f"₹{pr['revenue_val']:,.1f}{pr.get('revenue_unit', ' Cr')}"
        yoy_str = format_change(pr.get('revenue_yoy')) if pr.get('revenue_yoy') is not None else "Reported"
        qoq_str = format_change(pr.get('revenue_qoq')) if pr.get('revenue_qoq') is not None else None
        qoq_part = f" | QoQ: <b>{qoq_str}</b>" if qoq_str else ""
        summary_lines.append(f"• <b>Revenue:</b> {r_val}")
        summary_lines.append(f"  ↳ YoY: <b>{yoy_str}</b>{qoq_part}")
        key_metrics.append(r_val)

    # 2. Net Profit (PAT)
    if tab and tab.get("pat_curr") is not None:
        p_val = f"₹{tab['pat_curr']:,.1f} Cr"
        yoy_str = format_change(tab.get('pat_yoy'))
        qoq_str = format_change(tab.get('pat_qoq'))
        summary_lines.append(f"• <b>Net Profit (PAT):</b> {p_val}")
        summary_lines.append(f"  ↳ YoY: <b>{yoy_str}</b> | QoQ: <b>{qoq_str}</b>")
    elif pr and pr.get("pat_val") is not None:
        p_val = f"₹{pr['pat_val']:,.1f}{pr.get('pat_unit', ' Cr')}"
        yoy_str = format_change(pr.get('pat_yoy')) if pr.get('pat_yoy') is not None else "Reported"
        qoq_str = format_change(pr.get('pat_qoq')) if pr.get('pat_qoq') is not None else None
        qoq_part = f" | QoQ: <b>{qoq_str}</b>" if qoq_str else ""
        summary_lines.append(f"• <b>Net Profit (PAT):</b> {p_val}")
        summary_lines.append(f"  ↳ YoY: <b>{yoy_str}</b>{qoq_part}")

    # 3. Gross Margin (YoY & QoQ)
    if tab and tab.get("gross_margin_curr") is not None:
        gm_str = f"<b>{tab['gross_margin_curr']:.1f}%</b>"
        yoy_bps = format_bps(tab.get('gross_margin_yoy_bps'))
        qoq_bps = format_bps(tab.get('gross_margin_qoq_bps'))
        summary_lines.append(f"• <b>Gross Margin:</b> {gm_str}")
        summary_lines.append(f"  ↳ YoY: <b>{yoy_bps}</b> | QoQ: <b>{qoq_bps}</b>")
    elif pr and pr.get("gross_margin") is not None:
        gm_str = f"<b>{pr['gross_margin']:.1f}%</b>"
        yoy_bps = format_bps(pr.get('gross_bps_yoy')) if pr.get('gross_bps_yoy') is not None else ""
        yoy_part = f" (YoY: <b>{yoy_bps}</b>)" if yoy_bps else ""
        summary_lines.append(f"• <b>Gross Margin:</b> {gm_str}{yoy_part}")

    # 4. Operating Margin (EBITDA) (YoY & QoQ)
    if tab and tab.get("ebitda_margin_curr") is not None:
        eb_str = f"<b>{tab['ebitda_margin_curr']:.1f}%</b>"
        yoy_bps = format_bps(tab.get('ebitda_margin_yoy_bps'))
        qoq_bps = format_bps(tab.get('ebitda_margin_qoq_bps'))
        summary_lines.append(f"• <b>EBITDA Margin:</b> {eb_str}")
        summary_lines.append(f"  ↳ YoY: <b>{yoy_bps}</b> | QoQ: <b>{qoq_bps}</b>")
    elif pr and pr.get("ebitda_margin") is not None:
        eb_str = f"<b>{pr['ebitda_margin']:.1f}%</b>"
        yoy_bps = format_bps(pr.get('ebitda_bps_yoy')) if pr.get('ebitda_bps_yoy') is not None else ""
        yoy_part = f" (YoY: <b>{yoy_bps}</b>)" if yoy_bps else ""
        summary_lines.append(f"• <b>EBITDA Margin:</b> {eb_str}{yoy_part}")

    # 5. Net Margin (PAT Margin) (YoY & QoQ)
    if tab and tab.get("pat_margin_curr") is not None:
        pm_str = f"<b>{tab['pat_margin_curr']:.1f}%</b>"
        yoy_bps = format_bps(tab.get('pat_margin_yoy_bps'))
        qoq_bps = format_bps(tab.get('pat_margin_qoq_bps'))
        summary_lines.append(f"• <b>PAT Margin:</b> {pm_str}")
        summary_lines.append(f"  ↳ YoY: <b>{yoy_bps}</b> | QoQ: <b>{qoq_bps}</b>")
    elif pr and pr.get("pat_margin") is not None:
        pm_str = f"<b>{pr['pat_margin']:.1f}%</b>"
        summary_lines.append(f"• <b>PAT Margin:</b> {pm_str}")

    if tab and tab.get("is_loss"):
        summary_lines.append("• <b>⚠️ Company reported NET LOSS this quarter</b>")

    if tab and tab.get("eps_basic") is not None:
        summary_lines.append(f"• <b>EPS (Basic):</b> ₹{tab['eps_basic']:,.2f}")

    if tab and tab.get("exceptional_items") is not None:
        summary_lines.append(f"• <b>⚠️ Exceptional Items:</b> ₹{tab['exceptional_items']:,.2f} Cr (distorts reported PAT)")

    summary_text = "\n".join(summary_lines)

    # ── Impact Evaluation ──
    pat_growth = None
    rev_growth = None
    margin_chg = None

    if tab:
        pat_growth = tab.get("pat_yoy")
        rev_growth = tab.get("rev_yoy")
        margin_chg = tab.get("pat_margin_yoy_bps")
    elif pr:
        pat_growth = pr.get("pat_yoy")
        rev_growth = pr.get("revenue_yoy")
        margin_chg = pr.get("ebitda_bps_yoy")

    if (pat_growth is not None and pat_growth > 20.0) or (rev_growth is not None and rev_growth > 20.0 and (margin_chg is None or margin_chg >= 0)):
        impact = "🟢 STRONG BEAT / BULLISH"
        interp = (
            f"• Business Impact: Robust top-line and bottom-line expansion YoY demonstrates solid market share gains. "
            f"Gross and operating margin resilience indicates pricing power and healthy operating leverage.\n"
            f"• Stock Price Impact: Strong beat vs consensus earnings estimates. High probability of upward EPS revisions "
            f"and institutional accumulation, supporting multiple expansion."
        )
    elif (pat_growth is not None and pat_growth > 0) and (rev_growth is not None and rev_growth > 0):
        impact = "🟢 SOLID EARNINGS / BULLISH"
        interp = (
            f"• Business Impact: Steady operational execution for {company_name}. Revenue and profit lines expanded YoY with positive free cash conversion.\n"
            f"• Stock Price Impact: In-line to positive; supports current valuation multiples and earnings floor."
        )
    elif (pat_growth is not None and pat_growth < -15.0) or (margin_chg is not None and margin_chg < -150):
        impact = "🔴 EARNINGS MISS / BEARISH"
        interp = (
            f"• Business Impact: Profitability contracted sharply YoY, driven by gross margin compression or elevated operating overheads.\n"
            f"• Stock Price Impact: High risk of brokerage earnings downgrades and multiple de-rating; near-term selling pressure expected."
        )
    else:
        impact = "🟡 IN-LINE / NEUTRAL"
        interp = (
            f"• Business Impact: Balanced quarterly performance for {company_name}. Operational metrics trended within normal historical range.\n"
            f"• Stock Price Impact: Neutral; market awaits forward order inflow and management guidance in the earnings conference call."
        )

    return {
        "category": "Quarterly Financial Results (QoQ & YoY)",
        "impact_rating": impact,
        "summary": summary_text,
        "exact_interpretation": interp,
        "amount": key_metrics[0] if key_metrics else "",
        "is_routine": False,
        "tier": "tier_1"
    }
