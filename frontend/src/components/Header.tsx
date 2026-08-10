import React from "react";
import { RefreshCw, Clock, Settings, Wifi, Activity, Zap } from "lucide-react";
import { useCurrency, type CurrencyCode } from "../context/CurrencyContext";

interface HeaderProps {
  activePage: string;
  data?: any;
  onRefresh?: () => void;
  onWeightsUpdate?: () => void;
}

export default function Header({ 
  activePage, 
  data,
  onRefresh,
  onWeightsUpdate
}: HeaderProps) {
  const { currency, setCurrency } = useCurrency();
  
  const getPageTitle = (page: string) => {
    switch (page) {
      // Quant Platform
      case "dashboard":
        return "Indian Equity Market Overview & Regime";
      case "stock-universe":
        return "Sovereign Equity Stock Universe (1,500+)";
      case "screener":
        return "Multi-Factor Quant Rule Screener";
      case "strategy-builder":
        return "Point-in-Time Strategy Builder & Backtester";
      case "strategy-library":
        return "Institutional Quant Strategy Presets";
      case "backtest-results":
        return "Backtest Performance & Trade Logs";
      case "stock-research":
        return "Single Stock Research & Factor Tearsheet";
      case "portfolio":
        return "Portfolio Risk Parity & VaR Lab";
      case "market-breadth":
        return "Market Breadth & Regime Cockpit";
      case "data-admin":
        return "Data Pipeline Control & Feed Health";

      // Macro Views
      case "global-flow-board":
        return "Global Flow Pulse Board";
      case "country-liquidity":
        return "Country Liquidity Grid";
      case "country-economic-cockpit":
        return "Country Economic Cockpit";
      case "balance-of-payments":
        return "Balance of Payments & Sovereign Debt";
      case "global-central-banks":
        return "Global Central Bank Monitor";
      case "reserve-flows":
        return "Reserve & Carry Flow Tracker";
      case "trade-flow-map":
        return "Cross-Border Trade Flow Map";
      case "vessel-tracker":
        return "Maritime Vessel Tracker";
      case "asset-bull-radar":
        return "Asset Bull Run Radar";
      case "liquidity-transmission":
        return "Liquidity Transmission Lab";
      case "euphoria-monitor":
        return "Euphoria Distribution Monitor";
      case "smart-money-exit":
        return "Smart Money Exit Monitor";
      case "liquidity-drain":
        return "Liquidity Drain Radar";
      case "backtest-validation":
        return "Backtest Validation Lab";
      case "historical-similarity":
        return "Historical Similarity Engine";
      case "command-centre":
        return "World Money Flow Command Centre";
      default:
        return "World Money Flow Radar";
    }
  };

  const isQuantPage = [
    "dashboard", "stock-universe", "screener", "strategy-builder",
    "strategy-library", "backtest-results", "stock-research",
    "portfolio", "market-breadth", "data-admin"
  ].includes(activePage);

  return (
    <header className="bg-[#0b0d14]/90 backdrop-blur-md border-b border-gray-800/50 px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 shrink-0 select-none">
      <div className="flex items-center gap-4">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold tracking-wider uppercase ${
              isQuantPage ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
            }`}>
              {isQuantPage ? "NSE/BSE QUANT TERMINAL" : "GLOBAL MACRO RADAR"}
            </span>
            <span className="text-[10px] text-gray-500 font-mono">Live Session</span>
          </div>
          <h1 className="text-sm font-bold font-heading text-white flex items-center gap-2">
            <Activity className={`w-4 h-4 ${isQuantPage ? "text-emerald-400" : "text-indigo-400"} animate-pulse`} />
            {getPageTitle(activePage)}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Currency Switcher */}
        <div className="flex items-center gap-1.5 text-[10px] text-gray-300 font-mono bg-[#111420] border border-gray-800/60 px-2.5 py-1 rounded-lg">
          <span className="text-gray-500 uppercase text-[9px]">Base:</span>
          <select 
            value={currency} 
            onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
            className="bg-transparent text-emerald-400 font-bold focus:outline-none cursor-pointer text-xs"
          >
            <option value="INR" className="bg-[#111420] text-white">INR (₹)</option>
            <option value="USD" className="bg-[#111420] text-white">USD ($)</option>
            <option value="EUR" className="bg-[#111420] text-white">EUR (€)</option>
          </select>
        </div>

        {/* Sync Indicator */}
        <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400 bg-[#111420] border border-gray-800/60 px-3 py-1.5 rounded-lg shadow-sm">
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-gray-300 font-semibold">Live Engine Connected</span>
        </div>
      </div>
    </header>
  );
}
