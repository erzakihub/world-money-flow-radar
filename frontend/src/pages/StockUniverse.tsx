import React, { useState, useEffect } from "react";
import { Search, Database, ArrowUpDown, ChevronRight } from "lucide-react";

interface StockUniverseProps {
  onSelectStock: (symbol: string) => void;
}

export default function StockUniverse({ onSelectStock }: StockUniverseProps) {
  const [stocks, setStocks] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState("market_cap");
  const [sortAsc, setSortAsc] = useState(false);

  const fetchStocks = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/stocks");
      const data = await response.json();
      setStocks(data);
    } catch (e) {
      console.error("Failed to fetch stocks in universe list", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStocks();
  }, []);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const filteredStocks = stocks.filter(s => 
    s.symbol.toLowerCase().includes(search.toLowerCase()) ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.sector.toLowerCase().includes(search.toLowerCase())
  );

  const sortedStocks = [...filteredStocks].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    if (typeof valA === "string") {
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortAsc ? valA - valB : valB - valA;
  });

  const getScoreBadgeColor = (val: number) => {
    if (val >= 70) return "bg-green-500/10 text-brand-green border-green-500/20";
    if (val <= 35) return "bg-red-500/10 text-brand-red border-red-500/20";
    return "bg-blue-500/10 text-brand-blue border-brand-blue/20";
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-brand-green/20 border-t-brand-green animate-spin" />
        <span className="text-xs font-mono text-gray-500">Querying NSE/BSE Universe registry...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#13151e] border border-gray-800/40 p-4 rounded-xl">
        <div>
          <h2 className="text-sm font-heading font-extrabold text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-brand-green" />
            <span>Sovereign Equity Stock Universe</span>
          </h2>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Active NSE and BSE listings showing Cap classifications and precalculated multi-factor ranking scores.
          </p>
        </div>

        {/* Search bar */}
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Search symbol, company or sector..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-950 border border-gray-800 focus:border-brand-blue text-xs text-gray-200 pl-8 pr-3 py-1.5 rounded-lg focus:outline-none transition-colors"
          />
          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-2" />
        </div>
      </div>

      {/* Main Table Grid */}
      <div className="bg-[#13151e] border border-gray-800/40 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-950/40 border-b border-gray-850 font-mono text-[9px] text-gray-400">
                <th className="p-3.5 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort("symbol")}>
                  Symbol <ArrowUpDown className="w-3 h-3 inline ml-0.5" />
                </th>
                <th className="p-3.5 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort("name")}>
                  Company Name <ArrowUpDown className="w-3 h-3 inline ml-0.5" />
                </th>
                <th className="p-3.5 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort("sector")}>
                  Sector <ArrowUpDown className="w-3 h-3 inline ml-0.5" />
                </th>
                <th className="p-3.5 cursor-pointer hover:text-white transition-colors text-right" onClick={() => handleSort("market_cap")}>
                  Cap (₹ Cr) <ArrowUpDown className="w-3 h-3 inline ml-0.5" />
                </th>
                <th className="p-3.5 cursor-pointer hover:text-white transition-colors text-center" onClick={() => handleSort("composite_score")}>
                  Composite <ArrowUpDown className="w-3 h-3 inline ml-0.5" />
                </th>
                <th className="p-3.5 text-center">Quality</th>
                <th className="p-3.5 text-center">Growth</th>
                <th className="p-3.5 text-center">Value</th>
                <th className="p-3.5 text-center">Momentum</th>
                <th className="p-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-900 font-sans text-gray-300">
              {sortedStocks.map((stock) => (
                <tr 
                  key={stock.symbol} 
                  className={`hover:bg-white/[0.01] transition-colors ${!stock.is_active ? "opacity-45" : ""}`}
                >
                  <td className="p-3.5 font-bold font-mono text-white flex items-center gap-1.5">
                    {stock.symbol}
                    {stock.is_sme && (
                      <span className="bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/20 px-1 py-0.2 rounded text-[7px] font-mono font-bold tracking-wider">SME</span>
                    )}
                  </td>
                  <td className="p-3.5 font-medium">{stock.name}</td>
                  <td className="p-3.5 font-medium text-gray-400">{stock.sector}</td>
                  <td className="p-3.5 font-mono text-right text-white">₹{stock.market_cap.toLocaleString()}</td>
                  <td className="p-3.5 text-center">
                    <span className={`px-2 py-0.5 rounded border text-[10px] font-bold font-mono ${getScoreBadgeColor(stock.composite_score)}`}>
                      {stock.composite_score.toFixed(0)}
                    </span>
                  </td>
                  <td className="p-3.5 text-center font-mono text-[10px] text-gray-300">{stock.quality_score.toFixed(0)}</td>
                  <td className="p-3.5 text-center font-mono text-[10px] text-gray-300">{stock.growth_score.toFixed(0)}</td>
                  <td className="p-3.5 text-center font-mono text-[10px] text-gray-300">{stock.value_score.toFixed(0)}</td>
                  <td className="p-3.5 text-center font-mono text-[10px] text-gray-300">{stock.momentum_score.toFixed(0)}</td>
                  <td className="p-3.5 text-center">
                    <button
                      onClick={() => onSelectStock(stock.symbol)}
                      className="px-2.5 py-1 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-200 rounded text-[10px] font-semibold flex items-center gap-1 mx-auto transition-colors cursor-pointer"
                    >
                      Research <ChevronRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
