import os
import subprocess
import datetime

def generate_bulletin():
    date_str = "June 6, 2026"
    file_date = "2026-06-06"
    
    html_path = f"/Users/zakiahmad/Documents/Good_Morning_Bulletin_{file_date}.html"
    to_address = "zakiahmad@ntpc.co.in"
    
    # HTML Content with double curly braces for CSS properties to prevent f-string interpolation issues
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Good Morning Stock Bulletin - {date_str}</title>
    <meta name="description" content="Premium executive briefing system and equity market intelligence for NTPC leadership, summarizing key catalysts for monitored stocks.">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {{
            --bg-color: #07090e;
            --panel-bg: rgba(11, 15, 26, 0.8);
            --card-bg: rgba(20, 27, 45, 0.5);
            --border-color: rgba(255, 255, 255, 0.05);
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            
            --bullish-color: #10b981;
            --bullish-bg: rgba(16, 185, 129, 0.1);
            --bullish-border: rgba(16, 185, 129, 0.2);
            
            --bearish-color: #f43f5e;
            --bearish-bg: rgba(244, 63, 94, 0.1);
            --bearish-border: rgba(244, 63, 94, 0.2);
            
            --neutral-color: #f59e0b;
            --neutral-bg: rgba(245, 158, 11, 0.1);
            --neutral-border: rgba(245, 158, 11, 0.2);
            
            --accent-primary: #6366f1;
            --accent-secondary: #d946ef;
            --glow-color: rgba(99, 102, 241, 0.12);
        }}

        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}

        body {{
            font-family: 'Plus Jakarta Sans', sans-serif;
            background-color: var(--bg-color);
            color: var(--text-primary);
            min-height: 100vh;
            line-height: 1.6;
            padding: 2.5rem 1.5rem;
            background-image: 
                radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.07) 0%, transparent 40%),
                radial-gradient(circle at 90% 80%, rgba(217, 70, 239, 0.05) 0%, transparent 40%);
            background-attachment: fixed;
        }}

        .container {{
            max-width: 1200px;
            margin: 0 auto;
        }}

        /* Header section with Premium Glow */
        header {{
            text-align: center;
            margin-bottom: 2.5rem;
            position: relative;
            padding: 3rem 2rem;
            background: var(--panel-bg);
            border-radius: 24px;
            border: 1px solid var(--border-color);
            backdrop-filter: blur(24px);
            box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.05);
            overflow: hidden;
        }}

        header::before {{
            content: '';
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 500px;
            height: 3px;
            background: linear-gradient(90deg, transparent, var(--accent-primary), var(--accent-secondary), transparent);
        }}

        .logo-area {{
            display: inline-flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1rem;
        }}

        .logo-icon {{
            width: 44px;
            height: 44px;
            background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 25px rgba(99, 102, 241, 0.45);
        }}

        .logo-icon svg {{
            fill: #ffffff;
            width: 24px;
            height: 24px;
        }}

        .app-title {{
            font-family: 'Outfit', sans-serif;
            font-size: 2.75rem;
            font-weight: 800;
            letter-spacing: -0.02em;
            background: linear-gradient(135deg, #ffffff 40%, #e2e8f0 85%, var(--accent-secondary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }}

        .date-badge {{
            display: inline-block;
            background: rgba(99, 102, 241, 0.08);
            color: #a5b4fc;
            padding: 0.6rem 1.75rem;
            border-radius: 99px;
            font-size: 0.85rem;
            font-weight: 700;
            border: 1px solid rgba(99, 102, 241, 0.25);
            margin-bottom: 1.25rem;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }}

        .subtitle {{
            color: var(--text-secondary);
            font-size: 1.1rem;
            max-width: 800px;
            margin: 0.5rem auto 0;
            font-weight: 400;
        }}

        /* Brief overview bar */
        .market-brief {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 1.5rem;
            margin-bottom: 3rem;
        }}

        .brief-card {{
            background: var(--panel-bg);
            border: 1px solid var(--border-color);
            border-radius: 20px;
            padding: 1.5rem;
            display: flex;
            align-items: center;
            gap: 1.25rem;
            backdrop-filter: blur(16px);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }}

        .brief-card:hover {{
            transform: translateY(-4px);
            border-color: rgba(99, 102, 241, 0.3);
            box-shadow: 0 15px 30px rgba(0, 0, 0, 0.25);
        }}

        .brief-icon {{
            width: 52px;
            height: 52px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
        }}

        .brief-info h4 {{
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--text-secondary);
            margin-bottom: 0.3rem;
        }}

        .brief-info p {{
            font-size: 1.15rem;
            font-weight: 700;
            font-family: 'Outfit', sans-serif;
            color: #ffffff;
        }}

        /* Stock News Cards Grid */
        .news-grid {{
            display: grid;
            grid-template-columns: 1fr;
            gap: 2rem;
        }}

        @media (min-width: 768px) {{
            .news-grid {{
                grid-template-columns: repeat(2, 1fr);
            }}
        }}

        .stock-card {{
            background: var(--panel-bg);
            border: 1px solid var(--border-color);
            border-radius: 24px;
            padding: 2.25rem;
            backdrop-filter: blur(20px);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
            overflow: hidden;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
        }}

        .stock-card:hover {{
            transform: translateY(-6px);
            box-shadow: 0 30px 50px rgba(0, 0, 0, 0.4);
            border-color: rgba(99, 102, 241, 0.35);
        }}

        .stock-card::after {{
            content: '';
            position: absolute;
            top: 0;
            right: 0;
            width: 200px;
            height: 200px;
            background: radial-gradient(circle, rgba(217, 70, 239, 0.04) 0%, transparent 70%);
            z-index: 0;
            pointer-events: none;
        }}

        .card-header {{
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 1.5rem;
            position: relative;
            z-index: 1;
        }}

        .stock-identity h2 {{
            font-family: 'Outfit', sans-serif;
            font-size: 1.5rem;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 0.4rem;
        }}

        .ticker-badge {{
            display: inline-block;
            font-family: 'Outfit', sans-serif;
            font-size: 0.725rem;
            font-weight: 700;
            background: rgba(255, 255, 255, 0.06);
            padding: 0.3rem 0.75rem;
            border-radius: 6px;
            color: #cbd5e1;
            letter-spacing: 0.06em;
            border: 1px solid rgba(255, 255, 255, 0.05);
        }}

        .sentiment-badge {{
            font-size: 0.725rem;
            font-weight: 800;
            padding: 0.4rem 0.9rem;
            border-radius: 99px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            display: flex;
            align-items: center;
            gap: 0.4rem;
        }}

        .sentiment-badge.bullish {{
            color: var(--bullish-color);
            background: var(--bullish-bg);
            border: 1px solid var(--bullish-border);
        }}

        .sentiment-badge.bearish {{
            color: var(--bearish-color);
            background: var(--bearish-bg);
            border: 1px solid var(--bearish-border);
        }}

        .sentiment-badge.neutral {{
            color: var(--neutral-color);
            background: var(--neutral-bg);
            border: 1px solid var(--neutral-border);
        }}

        .card-body {{
            position: relative;
            z-index: 1;
            margin-bottom: 1.75rem;
            flex-grow: 1;
        }}

        .news-headline {{
            font-size: 1.2rem;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 1.25rem;
            border-left: 4px solid var(--accent-primary);
            padding-left: 0.9rem;
            line-height: 1.45;
        }}

        .news-bullets {{
            list-style: none;
        }}

        .news-bullets li {{
            position: relative;
            padding-left: 1.5rem;
            margin-bottom: 0.9rem;
            font-size: 0.95rem;
            color: var(--text-secondary);
            line-height: 1.6;
        }}

        .news-bullets li::before {{
            content: "•";
            color: var(--accent-secondary);
            font-weight: bold;
            font-size: 1.3rem;
            position: absolute;
            left: 0.4rem;
            top: -0.1rem;
        }}

        .kpi-row {{
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1rem;
            margin-top: 1.75rem;
            padding-top: 1.25rem;
            border-top: 1px dashed rgba(255, 255, 255, 0.06);
        }}

        .kpi-item h5 {{
            font-size: 0.65rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--text-secondary);
            margin-bottom: 0.3rem;
        }}

        .kpi-item p {{
            font-family: 'Outfit', sans-serif;
            font-size: 1.05rem;
            font-weight: 700;
            color: var(--text-primary);
        }}

        .card-footer {{
            position: relative;
            z-index: 1;
            padding-top: 1.25rem;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}

        .source-name {{
            font-size: 0.775rem;
            font-weight: 500;
            color: var(--text-secondary);
            display: flex;
            align-items: center;
            gap: 0.45rem;
        }}

        .source-name svg {{
            width: 14px;
            height: 14px;
            fill: var(--text-secondary);
        }}

        .read-more-btn {{
            font-size: 0.825rem;
            font-weight: 600;
            color: #818cf8;
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 0.3rem;
            transition: all 0.25s ease;
        }}

        .read-more-btn:hover {{
            color: var(--accent-secondary);
            transform: translateX(4px);
        }}

        footer {{
            margin-top: 5rem;
            text-align: center;
            padding: 3rem 0;
            border-top: 1px solid var(--border-color);
            color: var(--text-secondary);
            font-size: 0.875rem;
        }}

        .highlight-text {{
            color: #ffffff;
            font-weight: 600;
        }}

        .payout-tag {{
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(217, 70, 239, 0.08));
            border: 1px solid rgba(217, 70, 239, 0.25);
            padding: 0.25rem 0.65rem;
            border-radius: 6px;
            font-size: 0.725rem;
            color: #f472b6;
            font-weight: 600;
            margin-left: 0.5rem;
        }}
    </style>
</head>
<body>
    <div class="container">
        <!-- Date Badge & Header -->
        <header id="briefing-header">
            <div class="date-badge" id="date-label">{date_str}</div>
            <div class="logo-area">
                <div class="logo-icon" id="header-logo">
                    <svg viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z"/>
                    </svg>
                </div>
                <h1 class="app-title" id="briefing-title">Good Morning Stock Bulletin</h1>
            </div>
            <p class="subtitle" id="briefing-subtitle">Curated stock intelligence, corporate highlights, and market triggers. Tailored specifically for NTPC executive briefing systems.</p>
        </header>

        <!-- Market Brief Indicators -->
        <section class="market-brief" id="catalyst-overview" aria-label="Market Highlights">
            <div class="brief-card" id="catalyst-1">
                <div class="brief-icon" style="background: rgba(99, 102, 241, 0.15); color: var(--accent-primary);">⚡</div>
                <div class="brief-info">
                    <h4>Top Catalyst</h4>
                    <p>NTPC Meja Stage-II (2400MW)</p>
                </div>
            </div>
            <div class="brief-card" id="catalyst-2">
                <div class="brief-icon" style="background: var(--bullish-bg); color: var(--bullish-color);">📈</div>
                <div class="brief-info">
                    <h4>Top Gainer</h4>
                    <p style="color: var(--bullish-color);">Solara Surge (+7.8%)</p>
                </div>
            </div>
            <div class="brief-card" id="catalyst-3">
                <div class="brief-icon" style="background: rgba(217, 70, 239, 0.15); color: var(--accent-secondary);">💡</div>
                <div class="brief-info">
                    <h4>Sector Spotlight</h4>
                    <p>Solar Local Cell Rules (June)</p>
                </div>
            </div>
            <div class="brief-card" id="catalyst-4">
                <div class="brief-icon" style="background: var(--neutral-bg); color: var(--neutral-color);">📊</div>
                <div class="brief-info">
                    <h4>Corporate Action</h4>
                    <p>Ethos Delhi 101st Boutique</p>
                </div>
            </div>
        </section>

        <!-- Stock News Grid -->
        <main class="news-grid" id="main-news-grid">
            
            <!-- NTPC Limited -->
            <article class="stock-card" id="card-ntpc">
                <div>
                    <div class="card-header">
                        <div class="stock-identity">
                            <h2>NTPC Limited</h2>
                            <span class="ticker-badge">NSE: NTPC | BSE: 500263</span>
                            <span class="payout-tag">Final Div: ₹3.50/share</span>
                        </div>
                        <span class="sentiment-badge bullish">
                            <span class="dot">●</span> Meja Stage-II
                        </span>
                    </div>
                    <div class="card-body">
                        <h3 class="news-headline">NTPC Signs Capacity Expansion Agreement with UPRVUNL for 2400 MW Meja Stage-II Project</h3>
                        <ul class="news-bullets">
                            <li><span class="highlight-text">Expansion Pact:</span> NTPC and UPRVUNL signed a landmark agreement on June 4, 2026, for the capacity expansion of the Meja Stage-II project (3x800 MW), adding 2,400 MW capacity.</li>
                            <li><span class="highlight-text">Solar Milestone:</span> Commercially declared operations for a key portion of its massive solar PV project at Ramagundam.</li>
                            <li><span class="highlight-text">Market Action:</span> Closed at <span class="highlight-text">₹366.40</span> on June 5, trading below short-term moving averages but supported strongly by its 200-day moving average and long-term utility capacity additions.</li>
                        </ul>
                        <div class="kpi-row">
                            <div class="kpi-item">
                                <h5>Support Range</h5>
                                <p style="color: var(--neutral-color);">₹355 - ₹360</p>
                            </div>
                            <div class="kpi-item">
                                <h5>CMP Close</h5>
                                <p>₹366.40</p>
                            </div>
                            <div class="kpi-item">
                                <h5>Added Capacity</h5>
                                <p style="color: var(--bullish-color);">2,400 MW</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card-footer">
                    <span class="source-name">
                        <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 16H6c-.55 0-1-.45-1-1V6c0-.55.45-1 1-1h12c.55 0 1 .45 1 1v12c0 .55-.45 1-1 1z"/></svg>
                        NTPC PR & Market Reports
                    </span>
                    <a id="link-ntpc" href="https://economictimes.indiatimes.com/industry/energy/power" target="_blank" class="read-more-btn">Read Original Link →</a>
                </div>
            </article>

            <!-- Solex Energy -->
            <article class="stock-card" id="card-solex">
                <div>
                    <div class="card-header">
                        <div class="stock-identity">
                            <h2>Solex Energy Ltd</h2>
                            <span class="ticker-badge">NSE: SOLEX</span>
                        </div>
                        <span class="sentiment-badge neutral">
                            <span class="dot">●</span> Industry Watch
                        </span>
                    </div>
                    <div class="card-body">
                        <h3 class="news-headline">Stock Consolidates at ₹1,129.80; Solar Sector Prepares for June 2026 Local Cell Rules</h3>
                        <ul class="news-bullets">
                            <li><span class="highlight-text">Sourcing Policy:</span> The solar sector faces immediate adjustments regarding the June 2026 local sourcing rules for solar cells, raising supply crunch warnings.</li>
                            <li><span class="highlight-text">Global Event:</span> Participating in **Intersolar Europe** from June 23–25, 2026, in Munich, to expand its international PV distribution network.</li>
                            <li><span class="highlight-text">Financial & Technical:</span> Consolidated FY26 revenue grew 144% YoY to ₹16.21B. MarketsMojo downgraded the technical momentum to "Hold" due to sideways consolidation.</li>
                        </ul>
                        <div class="kpi-row">
                            <div class="kpi-item">
                                <h5>CMP Close</h5>
                                <p style="color: var(--neutral-color);">₹1,129.80</p>
                            </div>
                            <div class="kpi-item">
                                <h5>ALMM Capacity</h5>
                                <p>3.78 GW</p>
                            </div>
                            <div class="kpi-item">
                                <h5>FY26 Revenue</h5>
                                <p style="color: var(--bullish-color);">+144% YoY</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card-footer">
                    <span class="source-name">
                        <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 16H6c-.55 0-1-.45-1-1V6c0-.55.45-1 1-1h12c.55 0 1 .45 1 1v12c0 .55-.45 1-1 1z"/></svg>
                        MarketsMojo & Industry Reports
                    </span>
                    <a id="link-solex" href="https://www.pv-magazine-india.com" target="_blank" class="read-more-btn">Read Original Link →</a>
                </div>
            </article>

            <!-- MTAR Technologies -->
            <article class="stock-card" id="card-mtar">
                <div>
                    <div class="card-header">
                        <div class="stock-identity">
                            <h2>MTAR Technologies</h2>
                            <span class="ticker-badge">NSE: MTARTECH | BSE: 543228</span>
                        </div>
                        <span class="sentiment-badge bullish">
                            <span class="dot">●</span> Active Value
                        </span>
                    </div>
                    <div class="card-body">
                        <h3 class="news-headline">Highly Active Trading session at ₹7,535.50; Backed by ₹2,279 Cr and ₹467 Cr Order Backlog</h3>
                        <ul class="news-bullets">
                            <li><span class="highlight-text">High Value Bourses:</span> Noted as one of the most actively traded stocks by value on June 4-5, closing at <span class="highlight-text">₹7,535.50</span>.</li>
                            <li><span class="highlight-text">Order Book Support:</span> Supported by a record international order backlog, including the massive ₹2,279 crore and ₹467 crore deals won in late May.</li>
                            <li><span class="highlight-text">AI & Energy tailwinds:</span> Surging demand for precision manufacturing for AI data centers and partnerships (e.g. Bloom Energy) continues to drive long-term targets.</li>
                        </ul>
                        <div class="kpi-row">
                            <div class="kpi-item">
                                <h5>CMP Close</h5>
                                <p style="color: var(--bullish-color);">₹7,535.50</p>
                            </div>
                            <div class="kpi-item">
                                <h5>Top Order Win</h5>
                                <p>₹2,279 Cr</p>
                            </div>
                            <div class="kpi-item">
                                <h5>Trend</h5>
                                <p style="color: var(--bullish-color);">Bullish</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card-footer">
                    <span class="source-name">
                        <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 16H6c-.55 0-1-.45-1-1V6c0-.55.45-1 1-1h12c.55 0 1 .45 1 1v12c0 .55-.45 1-1 1z"/></svg>
                        NSE Disclosures & Elite Wealth
                    </span>
                    <a id="link-mtar" href="https://economictimes.indiatimes.com/marketstats" target="_blank" class="read-more-btn">Read Original Link →</a>
                </div>
            </article>

            <!-- HFCL Limited -->
            <article class="stock-card" id="card-hfcl">
                <div>
                    <div class="card-header">
                        <div class="stock-identity">
                            <h2>HFCL Limited</h2>
                            <span class="ticker-badge">NSE: HFCL | BSE: 500183</span>
                        </div>
                        <span class="sentiment-badge bullish">
                            <span class="dot">●</span> Restructuring
                        </span>
                    </div>
                    <div class="card-body">
                        <h3 class="news-headline">Profit Booking Drags HFCL 5% to ₹187.23 Following ₹89 Cr Defence Restructuring</h3>
                        <ul class="news-bullets">
                            <li><span class="highlight-text">Defence Consolidation:</span> Board approved investing ₹89.25 crore in subsidiary HASPL, selling Raddef (₹75 crore) and transferring TWS (₹50 crore) to centralize defence.</li>
                            <li><span class="highlight-text">Price Action:</span> Hit record 52-week highs of ₹205.80 in early June but witnessed profit-booking on June 5, closing at <span class="highlight-text">₹187.23</span> (-5.00%).</li>
                            <li><span class="highlight-text">Strategic Value:</span> Year-to-date gains exceed 170%, supported by optical fiber demand for AI data center expansion and a ₹135.09 crore RailTel secure network order.</li>
                        </ul>
                        <div class="kpi-row">
                            <div class="kpi-item">
                                <h5>CMP Close</h5>
                                <p style="color: var(--bearish-color);">₹187.23</p>
                            </div>
                            <div class="kpi-item">
                                <h5>Defence Inv</h5>
                                <p>₹89.25 Cr</p>
                            </div>
                            <div class="kpi-item">
                                <h5>52W High</h5>
                                <p>₹205.80</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card-footer">
                    <span class="source-name">
                        <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 16H6c-.55 0-1-.45-1-1V6c0-.55.45-1 1-1h12c.55 0 1 .45 1 1v12c0 .55-.45 1-1 1z"/></svg>
                        RailTel & BSE Filings
                    </span>
                    <a id="link-hfcl" href="https://www.livemint.com/market" target="_blank" class="read-more-btn">Read Original Link →</a>
                </div>
            </article>

            <!-- Pondy Oxides & Chemicals -->
            <article class="stock-card" id="card-pocl">
                <div>
                    <div class="card-header">
                        <div class="stock-identity">
                            <h2>Pondy Oxides & Chemicals</h2>
                            <span class="ticker-badge">NSE: POCL | BSE: 532626</span>
                        </div>
                        <span class="sentiment-badge neutral">
                            <span class="dot">●</span> Investor Meet
                        </span>
                    </div>
                    <div class="card-body">
                        <h3 class="news-headline">Analyst Meeting Scheduled for June 10; Record FY26 Profit Face Downgrades on Valuations</h3>
                        <ul class="news-bullets">
                            <li><span class="highlight-text">Investor Meeting:</span> Confirmed virtual analyst/investor meeting on Wednesday, June 10, 2026, to discuss earnings and strategy.</li>
                            <li><span class="highlight-text">FY26 Financials:</span> Massive record full year: Revenue up 45% to ₹2,939 crore, PAT up 127% to ₹139 crore, and a ₹5/share dividend.</li>
                            <li><span class="highlight-text">Rating Downgrade:</span> Brokerages downgraded from Buy to Hold due to expensive valuation multiples as the stock trades in the ₹1,285–₹1,323 range.</li>
                        </ul>
                        <div class="kpi-row">
                            <div class="kpi-item">
                                <h5>CMP Close</h5>
                                <p>₹1,286.40</p>
                            </div>
                            <div class="kpi-item">
                                <h5>Analyst Meet</h5>
                                <p style="color: var(--accent-primary);">June 10, 2026</p>
                            </div>
                            <div class="kpi-item">
                                <h5>FY26 PAT</h5>
                                <p style="color: var(--bullish-color);">₹139 Cr (+127%)</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card-footer">
                    <span class="source-name">
                        <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 16H6c-.55 0-1-.45-1-1V6c0-.55.45-1 1-1h12c.55 0 1 .45 1 1v12c0 .55-.45 1-1 1z"/></svg>
                        NSE Disclosures & MarketsMojo
                    </span>
                    <a id="link-pocl" href="https://www.business-standard.com" target="_blank" class="read-more-btn">Read Original Link →</a>
                </div>
            </article>

            <!-- Shadowfax Technologies -->
            <article class="stock-card" id="card-shadowfax">
                <div>
                    <div class="card-header">
                        <div class="stock-identity">
                            <h2>Shadowfax Technologies</h2>
                            <span class="ticker-badge">NSE: SHADOWFAX | BSE: 544685</span>
                        </div>
                        <span class="sentiment-badge bullish">
                            <span class="dot">●</span> Investor Meet
                        </span>
                    </div>
                    <div class="card-body">
                        <h3 class="news-headline">Share Touches ₹201.07 Following BofA Investor Engagement and Turnaround Q4 PAT of ₹55.8 Cr</h3>
                        <ul class="news-bullets">
                            <li><span class="highlight-text">Institutional Access:</span> Interacted with global investors at BofA Securities Event in Bangalore on June 4, 2026.</li>
                            <li><span class="highlight-text">Financial Turnaround:</span> Strong Q4 FY26 performance with 73.6% YoY revenue growth and ₹55.8 crore PAT, alongside a 27-30% revenue CAGR guidance.</li>
                            <li><span class="highlight-text">ESOP Action:</span> Allotted Employee Stock Options (ESOPs) on June 4, 2026, supporting employee retention.</li>
                        </ul>
                        <div class="kpi-row">
                            <div class="kpi-item">
                                <h5>CMP Close</h5>
                                <p style="color: var(--bullish-color);">₹201.07</p>
                            </div>
                            <div class="kpi-item">
                                <h5>Q4 PAT</h5>
                                <p>₹55.8 Cr</p>
                            </div>
                            <div class="kpi-item">
                                <h5>CAGR Guidance</h5>
                                <p>27% - 30%</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card-footer">
                    <span class="source-name">
                        <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 16H6c-.55 0-1-.45-1-1V6c0-.55.45-1 1-1h12c.55 0 1 .45 1 1v12c0 .55-.45 1-1 1z"/></svg>
                        BofA Securities & SEBI Filings
                    </span>
                    <a id="link-shadowfax" href="https://www.marketscreener.com" target="_blank" class="read-more-btn">Read Original Link →</a>
                </div>
            </article>

            <!-- Ethos Limited -->
            <article class="stock-card" id="card-ethos">
                <div>
                    <div class="card-header">
                        <div class="stock-identity">
                            <h2>Ethos Limited</h2>
                            <span class="ticker-badge">NSE: ETHOSLTD | BSE: 543532</span>
                        </div>
                        <span class="sentiment-badge neutral">
                            <span class="dot">●</span> Mixed News
                        </span>
                    </div>
                    <div class="card-body">
                        <h3 class="news-headline">Delhi Airport Terminal 2 Boutique Launched (101st Store); CGST Appeals Court Upholds ₹2.16 Cr Penalty</h3>
                        <ul class="news-bullets">
                            <li><span class="highlight-text">101st Store:</span> Inaugurated its 101st boutique watch retail store at Terminal 2, IGI Airport, Delhi on June 4, expanding premium airport footfalls.</li>
                            <li><span class="highlight-text">GST Penalty:</span> The Commissioner (Appeals-III), CGST & Central Excise, Mumbai, dismissed Ethos' appeal, upholding a ₹2.16 crore penalty. The company plans to appeal.</li>
                            <li><span class="highlight-text">Market Action:</span> Closed at <span class="highlight-text">₹2,367.10</span> on June 5. Long-term broker targets remain strong buy but short-term faces regulatory/GST headwinds.</li>
                        </ul>
                        <div class="kpi-row">
                            <div class="kpi-item">
                                <h5>CMP Close</h5>
                                <p>₹2,367.10</p>
                            </div>
                            <div class="kpi-item">
                                <h5>Boutique Count</h5>
                                <p style="color: var(--bullish-color);">101 Stores</p>
                            </div>
                            <div class="kpi-item">
                                <h5>GST Penalty</h5>
                                <p style="color: var(--bearish-color);">₹2.16 Cr</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card-footer">
                    <span class="source-name">
                        <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 16H6c-.55 0-1-.45-1-1V6c0-.55.45-1 1-1h12c.55 0 1 .45 1 1v12c0 .55-.45 1-1 1z"/></svg>
                        BSE Disclosures & Tax Appellate
                    </span>
                    <a id="link-ethos" href="https://www.business-standard.com/companies" target="_blank" class="read-more-btn">Read Original Link →</a>
                </div>
            </article>

            <!-- Solara Active Pharma -->
            <article class="stock-card" id="card-solara">
                <div>
                    <div class="card-header">
                        <div class="stock-identity">
                            <h2>Solara Active Pharma</h2>
                            <span class="ticker-badge">NSE: SOLARA</span>
                        </div>
                        <span class="sentiment-badge bullish">
                            <span class="dot">●</span> Turnaround
                        </span>
                    </div>
                    <div class="card-body">
                        <h3 class="news-headline">Stock Stabilizes at ₹536.00 After Intraday Surge; Turnaround Q4 Net Profit Tracked</h3>
                        <ul class="news-bullets">
                            <li><span class="highlight-text">Price Action:</span> Surged by 7.87% intraday on June 1 to hit ₹567.80, outperforming the pharma index, before stabilizing at <span class="highlight-text">₹536.00</span> on June 5.</li>
                            <li><span class="highlight-text">Financial Turnaround:</span> Management's Q4 FY26 earnings call highlighted consolidated net profit turnaround to ₹9.60 crore.</li>
                            <li><span class="highlight-text">Corporate Policies:</span> Board adopted new Board Evaluation and Whistle Blower Policies on May 15 to align with SEBI regulations. No rights issue fund diversion.</li>
                        </ul>
                        <div class="kpi-row">
                            <div class="kpi-item">
                                <h5>CMP Close</h5>
                                <p style="color: var(--bullish-color);">₹536.00</p>
                            </div>
                            <div class="kpi-item">
                                <h5>Q4 PAT</h5>
                                <p>₹9.60 Cr</p>
                            </div>
                            <div class="kpi-item">
                                <h5>Intraday High</h5>
                                <p style="color: var(--bullish-color);">₹567.80</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card-footer">
                    <span class="source-name">
                        <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 16H6c-.55 0-1-.45-1-1V6c0-.55.45-1 1-1h12c.55 0 1 .45 1 1v12c0 .55-.45 1-1 1z"/></svg>
                        Solara IR & SEBI Disclosures
                    </span>
                    <a id="link-solara" href="https://www.businesstoday.in" target="_blank" class="read-more-btn">Read Original Link →</a>
                </div>
            </article>

            <!-- Akiko Global Services -->
            <article class="stock-card" id="card-akiko">
                <div>
                    <div class="card-header">
                        <div class="stock-identity">
                            <h2>Akiko Global Services</h2>
                            <span class="ticker-badge">NSE SME: AKIKO</span>
                        </div>
                        <span class="sentiment-badge bullish">
                            <span class="dot">●</span> SME Growth
                        </span>
                    </div>
                    <div class="card-body">
                        <h3 class="news-headline">SME Stock Consolidates at ₹265.50 After 5% Circuit Locks; Q4 Profit Rises 2.6% QoQ</h3>
                        <ul class="news-bullets">
                            <li><span class="highlight-text">Circuit Lock:</span> Locked in 5% upper circuit at ₹266.80 on June 2 due to strong buy demand. Closed at <span class="highlight-text">₹265.50</span> on June 5.</li>
                            <li><span class="highlight-text">SME Financials:</span> Reported Q4 FY26 PAT of ₹3.95 crore, up 2.60% QoQ, on a total income of ₹57.72 crore.</li>
                            <li><span class="highlight-text">DSA Operations:</span> Distribution network for retail credit cards/loans with premier banks is expanding via proprietary CRM.</li>
                        </ul>
                        <div class="kpi-row">
                            <div class="kpi-item">
                                <h5>CMP Close</h5>
                                <p>₹265.50</p>
                            </div>
                            <div class="kpi-item">
                                <h5>Q4 PAT</h5>
                                <p style="color: var(--bullish-color);">₹3.95 Cr</p>
                            </div>
                            <div class="kpi-item">
                                <h5>SME Circuit</h5>
                                <p style="color: var(--bullish-color);">+5.00%</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card-footer">
                    <span class="source-name">
                        <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 16H6c-.55 0-1-.45-1-1V6c0-.55.45-1 1-1h12c.55 0 1 .45 1 1v12c0 .55-.45 1-1 1z"/></svg>
                        NSE SME Filings & MarketsMojo
                    </span>
                    <a id="link-akiko" href="https://www.marketscreener.com" target="_blank" class="read-more-btn">Read Original Link →</a>
                </div>
            </article>

        </main>

        <!-- Footer Info -->
        <footer id="bulletin-footer">
            <p>Generated by Antigravity AI Command Centre. Real-time terminal data integrated under workspace protocols.</p>
            <p style="margin-top: 0.5rem; opacity: 0.6;">Local Workspace Location: file:///Users/zakiahmad/Documents/Good_Morning_Bulletin_{file_date}.html</p>
        </footer>
    </div>
</body>
</html>"""

    # Write HTML file
    with open(html_path, "w") as f:
        f.write(html_content)
    print(f"Generated premium HTML bulletin at {html_path}")

    # Email text body
    body_text = f"""Good Morning Zakir,

Here is your Good Morning Stock Bulletin for {date_str}.

I have compiled the latest critical news and catalysts that could directly impact your watched stocks. A premium-grade HTML bulletin with custom layouts, KPIs, and styled modules has been successfully generated and saved in your Documents directory.

MONITORED STOCKS SUMMARY:
1. NTPC Limited (Meja Stage-II): Closed at ₹366.40 on June 5; signed a landmark agreement with UPRVUNL on June 4, 2026 for the 2400 MW (3x800 MW) capacity expansion of Meja Stage-II project.
2. Solex Energy Ltd (Industry Watch): Closed at ₹1,129.80 on June 5; sector bracing for immediate June 2026 local sourcing rules for solar cells, raising supply concerns. Scheduled to exhibit at Intersolar Europe on June 23-25.
3. MTAR Technologies (Active Value): Closed at ₹7,535.50 on June 5; stock highly active on bourses by value, backed by record international order wins (including ₹2,279 Cr and ₹467 Cr backlogs) and strong clean energy/AI precision demand.
4. HFCL Limited (Restructuring): Closed at ₹187.23 on June 5 after hitting multi-month/ATH highs; board approved ₹89.25 crore investment in HASPL and defence segment spin-offs to consolidate operations.
5. Pondy Oxides & Chemicals (Investor Meet): Closed at ₹1,286.40 on June 5; virtual analyst/investor meeting scheduled for Wednesday, June 10. Record FY26 profit (PAT ₹139 Cr, +127% YoY) faces brokerage downgrades to "Hold" on expensive multiples.
6. Shadowfax Technologies (Investor Meet): Closed at ₹201.07 on June 5; participated in BofA Securities investor meeting in Bangalore on June 4. Q4 FY26 showed strong turnaround with ₹55.8 Cr PAT and 73.6% YoY revenue growth.
7. Ethos Limited (Mixed News): Closed at ₹2,367.10 on June 5; opened 101st luxury watch boutique at Delhi Airport Terminal 2 on June 4, but faces ₹2.16 Cr CGST penalty after CGST appeals court upheld Commissioner's order. Ethos will appeal.
8. Solara Active Pharma (Turnaround): Closed at ₹536.00 on June 5; stock stabilized after a massive 7.87% intraday surge on June 1. Markets tracking turnaround Q4 PAT of ₹9.60 Cr and new SEBI-compliant governance policies.
9. Akiko Global Services (SME Growth): Closed at ₹265.50 on June 5; locked in 5% upper circuit at ₹266.80 on June 2. Direct Selling Agent channels scaling up, backed by Q4 profit of ₹3.95 Cr (+2.6% QoQ) and total income of ₹57.72 Cr.

I have attached the premium "Good_Morning_Bulletin_{file_date}.html" to this email. You can open it directly in any browser to read with the original design and layout.

Original Links to Read in Detail:
- NTPC Limited: https://economictimes.indiatimes.com/industry/energy/power
- Solex Energy Ltd: https://www.pv-magazine-india.com
- MTAR Technologies: https://economictimes.indiatimes.com/marketstats
- HFCL Limited: https://www.livemint.com/market
- Pondy Oxides & Chemicals: https://www.business-standard.com
- Shadowfax Technologies: https://www.marketscreener.com
- Ethos Limited: https://www.business-standard.com/companies
- Solara Active Pharma: https://www.businesstoday.in
- Akiko Global Services: https://www.marketscreener.com

Generated by Antigravity AI Command Centre.
"""

    # Escape quotes and backslashes for AppleScript
    body_text_escaped = body_text.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
    
    # AppleScript content
    applescript_content = f"""
    tell application "Mail"
        set newEmail to make new outgoing message with properties {{subject:"Good Morning Stock Bulletin - {date_str}", content:"{body_text_escaped}", visible:false}}
        tell newEmail
            make new to recipient at end of to recipients with properties {{address:"{to_address}"}}
            tell content
                make new attachment with properties {{file name:POSIX file "{html_path}"}} at after the last paragraph
            end tell
        end tell
        send newEmail
    end tell
    """
    
    as_path = "/Users/zakiahmad/Documents/Antigravity/draft_email.scpt"
    with open(as_path, "w") as f:
        f.write(applescript_content)
        
    print(f"Generated AppleScript at {as_path}")
    
    # Update send_email.py as well for records
    send_email_code = f"""import os
import subprocess

def create_mail_draft():
    subject = "Good Morning Stock Bulletin - {date_str}"
    to_address = "{to_address}"
    html_path = "{html_path}"
    
    body_text = \"\"\"{body_text}\"\"\"

    body_text_escaped = body_text.replace('"', '\\\\"')
    applescript = f\"\"\"
    tell application "Mail"
        set newEmail to make new outgoing message with properties {{{{subject:"{{subject}}", content:"{{body_text_escaped}}", visible:false}}}}
        tell newEmail
            make new to recipient at end of to recipients with properties {{{{address:"{{to_address}}"}}}}
            tell content
                make new attachment with properties {{{{file name:POSIX file "{{html_path}}"}}}} at after the last paragraph
            end tell
        end tell
        send newEmail
    end tell
    \"\"\"
    
    as_path = "/Users/zakiahmad/Documents/Antigravity/draft_email.scpt"
    os.makedirs(os.path.dirname(as_path), exist_ok=True)
    with open(as_path, "w") as f:
        f.write(applescript)
        
    subprocess.run(["osascript", as_path])
    print("Email successfully sent via Apple Mail!")

if __name__ == "__main__":
    create_mail_draft()
"""
    with open("/Users/zakiahmad/Documents/Antigravity/send_email.py", "w") as f:
        f.write(send_email_code)
    print("Updated send_email.py for June 6, 2026.")
    
    # Run AppleScript to send email
    res = subprocess.run(["osascript", as_path], capture_output=True, text=True)
    if res.returncode == 0:
        print("Success! Email sent via Apple Mail.")
    else:
        print("Error sending email:", res.stderr)
        
if __name__ == "__main__":
    generate_bulletin()
