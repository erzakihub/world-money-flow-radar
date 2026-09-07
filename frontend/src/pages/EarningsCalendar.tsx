import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Filter, 
  Sparkles, 
  Building2, 
  DollarSign, 
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from "lucide-react";

interface CalendarEvent {
  id: number;
  stock_id?: number;
  symbol: string;
  company_name: string;
  sector: string;
  board_meeting_date: string;
  quarter_period: string;
  purpose: string;
  status: string;
  consensus_eps_est?: number;
  consensus_sales_est?: number;
  actual_eps?: number;
  actual_sales?: number;
  prior_pat_yoy_pct?: number;
  surprise_pct?: number;
  price_reaction_pct?: number;
}

interface StatsData {
  today_count: number;
  this_week_count: number;
  next_30_days_count: number;
  avg_surprise_beat_pct: number;
  top_beats: Array<{
    symbol: string;
    company_name: string;
    surprise_pct: number;
    price_reaction_pct: number;
  }>;
}

export default function EarningsCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [windowFilter, setWindowFilter] = useState("this_week");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eventsRes, statsRes] = await Promise.all([
        fetch(`/api/earnings/calendar?window=${windowFilter}&sector=${sectorFilter}`),
        fetch("/api/earnings/stats")
      ]);
      const eventsData = await eventsRes.json();
      const statsData = await statsRes.json();
      setEvents(eventsData);
      setStats(statsData);
    } catch (err) {
      console.error("Error fetching earnings calendar:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [windowFilter, sectorFilter]);

  const filteredEvents = events.filter(e => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return e.symbol.toLowerCase().includes(q) || e.company_name.toLowerCase().includes(q);
  });

  const sectors = [
    "All",
    "Banking & Financial Services",
    "Information Technology",
    "Oil, Gas & Energy",
    "Consumer Discretionary",
    "Healthcare & Pharma",
    "Capital Goods & Manufacturing",
    "Metals & Mining",
    "Telecom & Media"
  ];

  return (
    <div className="space-y-6 animate-fade-in p-2 md:p-4 text-left">
      {/* Top Banner Header */}
      <div className="bg-[#0e121e] border border-gray-800/60 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-heading font-black text-white tracking-wide flex items-center gap-2">
                UPCOMING EARNINGS & RESULT DECLARATION RADAR
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  LIVE CALENDAR
                </span>
              </h1>
              <p className="text-[11px] text-gray-400 mt-0.5 font-sans">
                Automated tracking of upcoming Board Meetings, Quarterly Results, Consensus EPS vs Beat/Miss Scorecards.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="px-3.5 py-1.5 bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-300 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#0e121e] border border-gray-800/60 p-4 rounded-xl shadow-md">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-mono uppercase tracking-wider">Today's Declarations</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-white">
              {stats?.today_count ?? 0}
            </span>
            <span className="text-[10px] font-mono text-emerald-400">Board Meetings</span>
          </div>
        </div>

        <div className="bg-[#0e121e] border border-gray-800/60 p-4 rounded-xl shadow-md">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-mono uppercase tracking-wider">Declaring This Week</span>
            <Calendar className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-white">
              {stats?.this_week_count ?? 0}
            </span>
            <span className="text-[10px] font-mono text-sky-400">Companies</span>
          </div>
        </div>

        <div className="bg-[#0e121e] border border-gray-800/60 p-4 rounded-xl shadow-md">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-mono uppercase tracking-wider">Next 30 Days Pipeline</span>
            <Building2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-white">
              {stats?.next_30_days_count ?? 0}
            </span>
            <span className="text-[10px] font-mono text-amber-400">Scheduled Filings</span>
          </div>
        </div>

        <div className="bg-[#0e121e] border border-gray-800/60 p-4 rounded-xl shadow-md">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-mono uppercase tracking-wider">Avg Earnings Surprise</span>
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-emerald-400">
              +{stats?.avg_surprise_beat_pct ?? 4.2}%
            </span>
            <span className="text-[10px] font-mono text-gray-400">Net Beat vs Est</span>
          </div>
        </div>
      </div>

      {/* Top Beats Ticker Card */}
      {stats?.top_beats && stats.top_beats.length > 0 && (
        <div className="bg-[#090b12] border border-emerald-500/20 rounded-xl p-3.5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider pr-3 border-r border-gray-800">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Top Q1 Beats:</span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {stats.top_beats.map(b => (
              <div key={b.symbol} className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs font-mono">
                <span className="font-bold text-white">{b.symbol}</span>
                <span className="text-emerald-400 font-bold">+{b.surprise_pct}%</span>
                <span className="text-gray-400 text-[10px]">({b.price_reaction_pct > 0 ? '+' : ''}{b.price_reaction_pct}% rx)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-[#0e121e] border border-gray-800/60 p-4 rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-md">
        {/* Time Window Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#090b12] p-1 rounded-xl border border-gray-800/50">
          {[
            { id: "this_week", label: "This Week" },
            { id: "today", label: "Declared Today" },
            { id: "next_30_days", label: "Next 30 Days" },
            { id: "recent_declared", label: "Recent Results (Beat/Miss)" },
            { id: "upcoming", label: "All Upcoming" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setWindowFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                windowFilter === tab.id
                  ? "bg-emerald-500 text-black shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Sector Filters */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ticker..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-[#090b12] border border-gray-800 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#090b12] border border-gray-800 rounded-lg text-xs text-gray-300 font-mono focus:outline-none focus:border-emerald-500"
          >
            {sectors.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-[#0e121e] border border-gray-800/60 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-gray-800/80 bg-[#090b12] text-gray-400 text-[10px] uppercase tracking-wider">
                <th className="py-3 px-4">Company / Symbol</th>
                <th className="py-3 px-3">Sector</th>
                <th className="py-3 px-3">Board Meeting Date</th>
                <th className="py-3 px-3">Period</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Consensus EPS</th>
                <th className="py-3 px-3 text-right">Actual EPS</th>
                <th className="py-3 px-3 text-right">Surprise (%)</th>
                <th className="py-3 px-4 text-right">Price Reaction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-900/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
                    Loading upcoming earnings calendar...
                  </td>
                </tr>
              ) : filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-500 font-mono">
                    No declaration events found for the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredEvents.map(e => {
                  const isBeat = e.surprise_pct !== null && e.surprise_pct !== undefined && e.surprise_pct > 0;
                  const isMiss = e.surprise_pct !== null && e.surprise_pct !== undefined && e.surprise_pct < 0;

                  return (
                    <tr key={e.id} className="hover:bg-gray-850/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{e.symbol}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 block truncate max-w-[200px]">
                          {e.company_name}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-gray-300 text-[11px]">
                        {e.sector}
                      </td>

                      <td className="py-3 px-3 font-semibold text-white">
                        {e.board_meeting_date}
                      </td>

                      <td className="py-3 px-3 text-gray-400">
                        <span className="px-2 py-0.5 bg-gray-900 border border-gray-800 rounded text-[10px] font-bold text-sky-400">
                          {e.quarter_period}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          e.status === "Declared Today"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse"
                            : e.status === "Upcoming"
                            ? "bg-sky-500/10 text-sky-400 border border-sky-500/30"
                            : "bg-gray-800 text-gray-300"
                        }`}>
                          {e.status}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right text-gray-300">
                        {e.consensus_eps_est ? `₹${e.consensus_eps_est.toFixed(2)}` : "—"}
                      </td>

                      <td className="py-3 px-3 text-right font-bold text-white">
                        {e.actual_eps ? `₹${e.actual_eps.toFixed(2)}` : "—"}
                      </td>

                      <td className="py-3 px-3 text-right font-bold">
                        {e.surprise_pct !== null && e.surprise_pct !== undefined ? (
                          <span className={`inline-flex items-center gap-0.5 ${
                            isBeat ? "text-emerald-400" : isMiss ? "text-rose-400" : "text-gray-400"
                          }`}>
                            {isBeat && <ArrowUpRight className="w-3 h-3" />}
                            {isMiss && <ArrowDownRight className="w-3 h-3" />}
                            {e.surprise_pct > 0 ? "+" : ""}{e.surprise_pct.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-bold">
                        {e.price_reaction_pct !== null && e.price_reaction_pct !== undefined ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] ${
                            e.price_reaction_pct >= 0 
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" 
                              : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                          }`}>
                            {e.price_reaction_pct > 0 ? "+" : ""}{e.price_reaction_pct.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
