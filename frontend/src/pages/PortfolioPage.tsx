import React, { useState, useEffect } from "react";
import { Briefcase, Plus, Save, Activity, ShieldCheck, AlertCircle, Info, RefreshCw, BarChart } from "lucide-react";

interface PortfolioPageProps {
  onSelectStock: (symbol: string) => void;
}

export default function PortfolioPage({ onSelectStock }: PortfolioPageProps) {
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [selectedPort, setSelectedPort] = useState<any>(null);
  const [riskData, setRiskData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [riskLoading, setRiskLoading] = useState(false);

  // Form states for creating a new portfolio
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("Flagship Conservative Compounder");
  const [desc, setDesc] = useState("Balanced allocation across defensive IT, FMCG, and heavyweights.");
  const [cash, setCash] = useState(10000000);
  const [holdingsInput, setHoldingsInput] = useState<any[]>([
    { symbol: "TCS", shares: 1200, average_buy_price: 3800 },
    { symbol: "RELIANCE", shares: 1800, average_buy_price: 2400 },
    { symbol: "HDFCBANK", shares: 3500, average_buy_price: 1550 }
  ]);

  const fetchPortfolios = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/portfolios");
      const data = await res.json();
      setPortfolios(data);
      if (data.length > 0) {
        setSelectedPort(data[0]);
      }
    } catch (e) {
      console.error("Failed to load portfolios list", e);
    }
    setLoading(false);
  };

  const fetchRiskData = async (id: number) => {
    setRiskLoading(true);
    setRiskData(null);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/portfolios/${id}/risk`, {
        method: "POST"
      });
      const data = await res.json();
      setRiskData(data);
    } catch (e) {
      console.error("Failed to fetch portfolio risk analytics", e);
    }
    setRiskLoading(false);
  };

  useEffect(() => {
    fetchPortfolios();
  }, []);

  useEffect(() => {
    if (selectedPort) {
      fetchRiskData(selectedPort.id);
    }
  }, [selectedPort]);

  const handleAddHoldingRow = () => {
    setHoldingsInput([...holdingsInput, { symbol: "INFY", shares: 1000, average_buy_price: 1400 }]);
  };

  const handleRemoveHoldingRow = (idx: number) => {
    const updated = [...holdingsInput];
    updated.splice(idx, 1);
    setHoldingsInput(updated);
  };

  const handleHoldingChange = (idx: number, key: string, value: any) => {
    const updated = [...holdingsInput];
    updated[idx][key] = value;
    setHoldingsInput(updated);
  };

  const handleSavePortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: desc,
          cash_balance: cash,
          holdings: holdingsInput
        })
      });
      const data = await res.json();
      if (data.status === "Success") {
        setShowCreate(false);
        fetchPortfolios();
      }
    } catch (e) {
      console.error("Failed to save custom portfolio", e);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-[#13151e] border border-gray-800/40 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-sm font-heading font-extrabold text-white flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-brand-green" />
            <span>Portfolio Simulator & Value-At-Risk Analytics</span>
          </h2>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Construct custom allocations, monitor weight balance, and audit volatility correlation risk using parametric VaR checks.
          </p>
        </div>

        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-3 py-1.5 bg-gradient-to-r from-brand-blue to-brand-blue/80 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-md"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{showCreate ? "View Active Portfolios" : "Assemble Custom Portfolio"}</span>
        </button>
      </div>

      {showCreate ? (
        /* Create portfolio form */
        <form onSubmit={handleSavePortfolio} className="bg-[#13151e] border border-gray-800/40 rounded-xl p-5 space-y-4 animate-fade-in">
          <h3 className="text-xs font-bold text-white border-b border-gray-850 pb-2 flex items-center gap-1">
            <Briefcase className="w-3.5 h-3.5 text-brand-blue" /> Assemble Capital Allocation
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-3">
              <div>
                <label className="text-[9px] font-mono text-gray-500 block mb-1">Portfolio Title</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 focus:border-brand-blue text-xs text-gray-200 rounded p-2 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[9px] font-mono text-gray-500 block mb-1">Strategy Description</label>
                <input
                  type="text"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 focus:border-brand-blue text-xs text-gray-200 rounded p-2 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[9px] font-mono text-gray-500 block mb-1">Unallocated Cash (₹)</label>
              <input
                type="number"
                required
                value={cash}
                onChange={(e) => setCash(Number(e.target.value))}
                className="w-full bg-gray-950 border border-gray-800 focus:border-brand-blue text-xs text-gray-200 rounded p-2 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Holdings rows */}
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center border-b border-gray-850 pb-1.5">
              <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider font-bold">Positions Basket</span>
              <button
                type="button"
                onClick={handleAddHoldingRow}
                className="text-[9px] font-semibold text-brand-green hover:text-brand-green/80 flex items-center gap-0.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add Stock Row
              </button>
            </div>

            <div className="space-y-2">
              {holdingsInput.map((h, idx) => (
                <div key={idx} className="flex gap-2 items-center bg-gray-950/45 p-2 rounded-lg border border-gray-900">
                  <div className="flex-1">
                    <label className="text-[8px] font-mono text-gray-600 block mb-0.5">Symbol</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. TCS"
                      value={h.symbol}
                      onChange={(e) => handleHoldingChange(idx, "symbol", e.target.value.toUpperCase())}
                      className="w-full bg-gray-950 border border-gray-800 focus:border-brand-blue text-[10px] text-gray-200 rounded p-1.5 focus:outline-none font-mono"
                    />
                  </div>

                  <div className="w-24">
                    <label className="text-[8px] font-mono text-gray-600 block mb-0.5">Shares</label>
                    <input
                      type="number"
                      required
                      value={h.shares}
                      onChange={(e) => handleHoldingChange(idx, "shares", Number(e.target.value))}
                      className="w-full bg-gray-950 border border-gray-800 focus:border-brand-blue text-[10px] text-gray-200 rounded p-1.5 focus:outline-none text-center font-mono"
                    />
                  </div>

                  <div className="w-24">
                    <label className="text-[8px] font-mono text-gray-600 block mb-0.5">Avg Buy Price (₹)</label>
                    <input
                      type="number"
                      required
                      value={h.average_buy_price}
                      onChange={(e) => handleHoldingChange(idx, "average_buy_price", Number(e.target.value))}
                      className="w-full bg-gray-950 border border-gray-800 focus:border-brand-blue text-[10px] text-gray-200 rounded p-1.5 focus:outline-none text-center font-mono"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveHoldingRow(idx)}
                    disabled={holdingsInput.length === 1}
                    className="text-gray-500 hover:text-brand-red disabled:opacity-30 disabled:pointer-events-none cursor-pointer self-end p-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 rotate-45" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-gradient-to-r from-brand-green to-brand-green/80 hover:from-brand-green/90 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Create & Compute Risk Profiles</span>
          </button>
        </form>
      ) : (
        /* View portfolio status & risk */
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left sidebar: list portfolios */}
            <div className="lg:col-span-1 bg-[#13151e] border border-gray-800/40 rounded-xl p-4 space-y-3">
              <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest block border-b border-gray-850 pb-2">
                Available Portfolios
              </span>
              {portfolios.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-600 font-medium">No custom portfolios compiled.</div>
              ) : (
                <div className="space-y-2">
                  {portfolios.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPort(p)}
                      className={`w-full p-3 rounded-lg border text-left transition-all ${
                        selectedPort?.id === p.id 
                          ? "bg-brand-blue/10 border-brand-blue/35 text-white" 
                          : "bg-gray-950/20 border-gray-900 text-gray-400 hover:border-gray-850"
                      }`}
                    >
                      <span className="text-xs font-bold block truncate">{p.name}</span>
                      <span className="text-[8px] text-gray-500 block truncate mt-0.5">{p.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right contents: details table & risk dashboard */}
            {selectedPort && (
              <div className="lg:col-span-3 space-y-6 animate-fade-in">
                {/* Risk analytics cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {riskLoading ? (
                    <div className="col-span-3 py-6 text-center text-xs font-mono text-gray-600 flex items-center justify-center gap-1.5">
                      <RefreshCw className="w-4 h-4 text-brand-blue animate-spin" />
                      Calculating point-in-time covariance matrix risk profiles...
                    </div>
                  ) : riskData ? (
                    <>
                      {/* Volatility */}
                      <div className="bg-[#13151e] border border-gray-800/40 p-4 rounded-xl text-left">
                        <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block flex justify-between">
                          <span>Portfolio Volatility</span>
                          <Info className="w-3.5 h-3.5 text-gray-600" />
                        </span>
                        <span className="text-base font-bold font-mono text-white mt-1.5 block">
                          {riskData.portfolio_volatility}%
                        </span>
                        <span className="text-[8px] font-mono text-gray-600 mt-1 block">Annualized standard deviation</span>
                      </div>

                      {/* Value-At-Risk */}
                      <div className="bg-[#13151e] border border-gray-800/40 p-4 rounded-xl text-left">
                        <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block flex justify-between">
                          <span>Parametric VaR (95% Daily)</span>
                          <ShieldCheck className="w-3.5 h-3.5 text-brand-green" />
                        </span>
                        <span className="text-base font-bold font-mono text-brand-red mt-1.5 block">
                          {riskData.portfolio_var_95}%
                        </span>
                        <span className="text-[8px] font-mono text-gray-600 mt-1 block">Max loss threshold over 1-day</span>
                      </div>

                      {/* Max Drawdown */}
                      <div className="bg-[#13151e] border border-gray-800/40 p-4 rounded-xl text-left">
                        <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block flex justify-between">
                          <span>Historical Max Drawdown</span>
                          <AlertCircle className="w-3.5 h-3.5 text-brand-red" />
                        </span>
                        <span className="text-base font-bold font-mono text-white mt-1.5 block">
                          {riskData.portfolio_max_drawdown}%
                        </span>
                        <span className="text-[8px] font-mono text-gray-600 mt-1 block">Peak-to-trough contraction</span>
                      </div>
                    </>
                  ) : (
                    <div className="col-span-3 bg-red-500/5 border border-red-500/10 p-4 rounded-xl text-xs text-brand-red text-center font-medium">
                      Failed to compile portfolio risk metrics. Check if prices or stocks are missing.
                    </div>
                  )}
                </div>

                {/* Holdings summary table */}
                <div className="bg-[#13151e] border border-gray-800/40 rounded-xl p-5">
                  <h4 className="text-[10px] font-mono text-white uppercase tracking-widest font-bold border-b border-gray-850 pb-3 mb-4">
                    Active Capital Allocations & Positions
                  </h4>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-950/40 border-b border-gray-850 font-mono text-[9px] text-gray-500">
                          <th className="p-3">Symbol</th>
                          <th className="p-3 text-right">Shares</th>
                          <th className="p-3 text-right">Avg Price (₹)</th>
                          <th className="p-3 text-right">Sector Exposure</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-900 font-sans text-gray-300">
                        {selectedPort.holdings?.map((h: any, idx: number) => (
                          <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                            <td 
                              className="p-3 font-bold font-mono text-white cursor-pointer hover:text-brand-blue"
                              onClick={() => onSelectStock(h.symbol)}
                            >
                              {h.symbol}
                            </td>
                            <td className="p-3 font-mono text-right">{h.shares.toLocaleString()}</td>
                            <td className="p-3 font-mono text-right">₹{h.average_buy_price.toLocaleString()}</td>
                            <td className="p-3 text-right">
                              {riskData?.stock_volatilities?.find((sv: any) => sv.symbol === h.symbol)?.sector || "General"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Sector Concentration */}
                {riskData && riskData.sector_exposure && (
                  <div className="bg-[#13151e] border border-gray-800/40 rounded-xl p-5">
                    <h4 className="text-[10px] font-mono text-white uppercase tracking-widest font-bold border-b border-gray-850 pb-3 mb-4">
                      Sector Allocations Concentration limits
                    </h4>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {riskData.sector_exposure.map((s: any, idx: number) => (
                        <div key={idx} className="bg-gray-950/30 p-3 rounded-lg border border-gray-900">
                          <span className="text-[9px] font-bold text-gray-400 block">{s.sector}</span>
                          <span className="text-sm font-bold font-mono text-white mt-1 block">{s.percentage.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
