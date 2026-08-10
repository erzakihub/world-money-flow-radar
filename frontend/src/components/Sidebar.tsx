import React from "react";
import { 
  LayoutDashboard, 
  Globe, 
  Target, 
  Network, 
  AlertTriangle, 
  Shield, 
  ShieldAlert, 
  BarChart3, 
  Shuffle, 
  Database,
  TrendingUp,
  Zap,
  ArrowRightLeft,
  Ship,
  Landmark,
  Coins,
  Activity,
  Sliders,
  BookOpen,
  PieChart,
  Search,
  Grid
} from "lucide-react";

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  dataHealth?: number;
}

const MACRO_ITEMS = [
  { id: "command-centre", label: "Command Centre", icon: Globe, desc: "Global Liquidity & Flows" },
  { id: "global-flow-board", label: "Global Flow Board", icon: Zap, desc: "Macro Capital Pulse" },
  { id: "apex-predictor", label: "Apex Lead Predictor", icon: Target, desc: "World Lead Engine" },
  { id: "country-liquidity", label: "Country Liquidity", icon: Globe, desc: "15 Major Economies" },
  { id: "global-central-banks", label: "Central Bank Monitor", icon: Landmark, desc: "Balance Sheets & M2" },
  { id: "reserve-flows", label: "Reserve Flow Tracker", icon: Coins, desc: "Yen Carry & SWF" },
  { id: "trade-flow-map", label: "Trade Flow Map", icon: ArrowRightLeft, desc: "Cross-Border Matrix" },
  { id: "vessel-tracker", label: "Vessel Tracker", icon: Ship, desc: "Shipping Chokepoints" },
  { id: "asset-bull-radar", label: "Asset Bull Radar", icon: TrendingUp, desc: "Multi-Asset Radar" },
  { id: "liquidity-transmission", label: "Transmission Lab", icon: Network, desc: "Credit Channels" },
  { id: "smart-money-exit", label: "Smart Money Exit", icon: Shield, desc: "Insider & Capital Drain" },
  { id: "liquidity-drain", label: "Liquidity Drain Radar", icon: ShieldAlert, desc: "Deleveraging Risk" },
];

const QUANT_ITEMS = [
  { id: "dashboard", label: "Market Overview", icon: LayoutDashboard, desc: "NSE/BSE Breadth & Regime" },
  { id: "stock-universe", label: "Stock Universe", icon: Grid, desc: "1,500+ Listed Equities" },
  { id: "screener", label: "Quant Screener", icon: Search, desc: "Custom Query Rules" },
  { id: "strategy-builder", label: "Strategy Builder", icon: Sliders, desc: "Point-in-Time Backtester" },
  { id: "strategy-library", label: "Strategy Library", icon: BookOpen, desc: "IQM-30 & Preset Models" },
  { id: "backtest-results", label: "Backtest Results", icon: BarChart3, desc: "CAGR, Drawdown & Logs" },
  { id: "stock-research", label: "Stock Research", icon: Target, desc: "Tearsheets & Factor Scores" },
  { id: "portfolio", label: "Portfolio Risk", icon: PieChart, desc: "Risk Parity & VaR Analysis" },
  { id: "market-breadth", label: "Market Breadth", icon: Activity, desc: "200 DMA & Regime Cockpit" },
  { id: "data-admin", label: "Data Admin & Health", icon: Database, desc: "Pipeline Control Center" },
];

export default function Sidebar({ activePage, setActivePage, dataHealth }: SidebarProps) {
  return (
    <aside className="w-[260px] bg-[#0b0d14] border-r border-gray-800/60 flex flex-col justify-between h-screen sticky top-0 shrink-0 select-none">
      <div className="flex flex-col h-full overflow-hidden">
        {/* Brand Header */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-800/50 bg-[#0e1019]/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-teal-500/5 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <Globe className="text-emerald-400 w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-sm font-heading font-black text-white tracking-wider leading-tight flex items-center gap-1.5">
                WORLD MONEY FLOW
              </h1>
              <p className="text-[9px] text-emerald-400/80 font-mono font-bold tracking-widest uppercase mt-0.5">
                GLOBAL CAPITAL RADAR
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Navigation */}
        <div className="px-3 py-3 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          {/* Section 1: Global Money Flow Radar */}
          <div>
            <div className="px-2 pb-1.5 flex items-center justify-between">
              <span className="text-[9px] text-emerald-400 font-mono font-bold uppercase tracking-[0.14em]">
                World Money Flow Systems
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <div className="space-y-0.5">
              {MACRO_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActivePage(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-150 group cursor-pointer ${
                      isActive 
                        ? "bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent text-white border border-emerald-500/30 shadow-md shadow-emerald-500/5" 
                        : "text-gray-400 hover:bg-white/[0.03] hover:text-gray-200 border border-transparent"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                      isActive 
                        ? "bg-emerald-500/20 text-emerald-400" 
                        : "bg-transparent text-gray-500 group-hover:text-gray-300"
                    }`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className={`text-[12px] font-semibold block leading-tight truncate ${isActive ? "text-white" : ""}`}>
                        {item.label}
                      </span>
                      <span className="text-[9px] font-mono text-gray-500 block truncate mt-0.5">
                        {item.desc}
                      </span>
                    </div>
                    {isActive && (
                      <div className="w-1.5 h-4 bg-emerald-400 rounded-full shrink-0 shadow-sm shadow-emerald-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Indian Equity Quant Engine */}
          <div className="pt-2 border-t border-gray-800/40">
            <div className="px-2 pb-1.5">
              <span className="text-[9px] text-gray-500 font-mono font-bold uppercase tracking-[0.14em]">
                Equity Quant Modules
              </span>
            </div>
            <div className="space-y-0.5">
              {QUANT_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActivePage(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-150 group cursor-pointer ${
                      isActive 
                        ? "bg-white/[0.05] text-white border border-gray-700/60 shadow-sm" 
                        : "text-gray-500 hover:bg-white/[0.02] hover:text-gray-300 border border-transparent"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                      isActive 
                        ? "bg-indigo-500/20 text-indigo-400" 
                        : "bg-transparent text-gray-600 group-hover:text-gray-400"
                    }`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className={`text-[11px] font-medium block leading-tight truncate ${isActive ? "text-white" : ""}`}>
                        {item.label}
                      </span>
                      <span className="text-[8px] font-mono text-gray-600 block truncate mt-0.5">
                        {item.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Terminal Footer */}
        <div className="p-3 border-t border-gray-800/40 bg-[#0c0e16]/80 text-[9px] font-mono text-gray-500 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>GLOBAL MACRO FEED ACTIVE</span>
          </div>
          <span className="text-gray-600">v2.4 Pro</span>
        </div>
      </div>
    </aside>
  );
}
