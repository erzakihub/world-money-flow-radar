import React, { useState, useEffect } from "react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from "recharts";
import { Sliders, RefreshCw, Save, Repeat, Globe } from "lucide-react";

interface LiquidityMapProps {
  onWeightChange: (weights: any) => void;
}

export default function LiquidityMap({ onWeightChange }: LiquidityMapProps) {
  const [weights, setWeights] = useState<any>({
    WALCL: 0.20,
    M2SL: 0.15,
    DXY: -0.10,
    DFII10: -0.10,
    BAMLH0A0HYM2: -0.05,
    VIX: -0.05,
    USDT_SUPPLY: 0.05,
    YEN_CARRY_INDEX: 0.20,
    GLOBAL_SURPLUS_FLOW: 0.10
  });
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchLiquidityData = async (activeWeights = weights) => {
    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/api/liquidity-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activeWeights)
      });
      const resData = await response.json();
      setData(resData);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLiquidityData();
  }, []);

  const handleSliderChange = (key: string, val: number) => {
    const updated = { ...weights, [key]: val };
    setWeights(updated);
  };

  const handleApplyWeights = () => {
    fetchLiquidityData(weights);
    onWeightChange(weights);
  };

  const handleReset = () => {
    const defaultWeights = {
      WALCL: 0.20,
      M2SL: 0.15,
      DXY: -0.10,
      DFII10: -0.10,
      BAMLH0A0HYM2: -0.05,
      VIX: -0.05,
      USDT_SUPPLY: 0.05,
      YEN_CARRY_INDEX: 0.20,
      GLOBAL_SURPLUS_FLOW: 0.10
    };
    setWeights(defaultWeights);
    fetchLiquidityData(defaultWeights);
    onWeightChange(defaultWeights);
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-green"></div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-800 p-3 rounded-lg shadow-xl font-mono text-xs text-left">
          <p className="text-gray-400 font-semibold">{p.date}</p>
          <p className="text-white mt-1">Score: <strong className={p.score >= 0 ? "text-brand-green" : "text-brand-red"}>{p.score}</strong></p>
          <p className="text-gray-400 mt-0.5">Regime: <strong className="text-brand-blue">{p.regime}</strong></p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white">Global Liquidity Map</h2>
          <p className="text-sm text-gray-500">Track macro-financial indexes, liquidity composite indices, and constituent assets.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs transition duration-150 font-mono"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
          <button 
            onClick={handleApplyWeights}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-green hover:bg-brand-green/90 text-gray-950 font-semibold rounded text-xs transition duration-150 font-mono"
          >
            <Save className="w-3.5 h-3.5" />
            Apply Weights
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Area */}
        <div className="bg-bg-card border border-gray-800 rounded-xl p-6 lg:col-span-2 space-y-4 shadow-md">
          <h3 className="text-md font-heading font-semibold text-white">Composite Liquidity Index Trend</h3>
          <div className="h-[320px]">
            {data?.history && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#29b6f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#29b6f6" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2e303a" vertical={false} />
                  <XAxis dataKey="date" stroke="#6b7280" tickLine={false} tickFormatter={(tick) => tick.slice(5)} style={{ fontSize: 10, fontFamily: 'monospace' }} />
                  <YAxis domain={[-100, 100]} stroke="#6b7280" tickLine={false} style={{ fontSize: 10, fontFamily: 'monospace' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="score" stroke="#29b6f6" strokeWidth={2} fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          {/* Regime matrix overlay */}
          <div className="grid grid-cols-5 gap-2 border-t border-gray-800/80 pt-4 text-center text-[10px] font-mono text-gray-400">
            <div className="p-1.5 rounded bg-brand-red/10 border border-brand-red/20 text-brand-red font-semibold">&lt; -60 Stress</div>
            <div className="p-1.5 rounded bg-brand-yellow/10 border border-brand-yellow/20 text-brand-yellow font-semibold">-60 to -20 Tightening</div>
            <div className="p-1.5 rounded bg-gray-800/50 border border-gray-700/50 text-gray-400">-20 to +20 Neutral</div>
            <div className="p-1.5 rounded bg-brand-blue/10 border border-brand-blue/20 text-brand-blue font-semibold">+20 to +60 Improving</div>
            <div className="p-1.5 rounded bg-brand-green/10 border border-brand-green/20 text-brand-green font-semibold">&gt; +60 Expansion</div>
          </div>
        </div>

        {/* Weights Sliders Sidebar */}
        <div className="bg-bg-card border border-gray-800 rounded-xl p-6 space-y-4 shadow-md">
          <h3 className="text-md font-heading font-semibold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-brand-green" />
            <span>Customize Weights Model</span>
          </h3>
          <p className="text-xs text-gray-500 leading-relaxed">Modify relative weightings to build specialized macro models (e.g. Yen Carry heavy, Reserves focus).</p>
          
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
            {Object.keys(weights).map((key) => {
              let label = key;
              if (key === "WALCL") label = "Fed Balance Sheet";
              else if (key === "M2SL") label = "M2 Supply";
              else if (key === "DFII10") label = "Real Yields";
              else if (key === "BAMLH0A0HYM2") label = "Credit Spreads";
              else if (key === "YEN_CARRY_INDEX") label = "Yen Carry Index";
              else if (key === "GLOBAL_SURPLUS_FLOW") label = "Surplus Reserves";
              
              return (
                <div key={key} className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-gray-300 font-mono">
                    <span>{label}</span>
                    <span className="font-semibold">{weights[key] > 0 ? "+" : ""}{weights[key].toFixed(2)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="-0.5" 
                    max="0.5" 
                    step="0.05"
                    value={weights[key]} 
                    onChange={(e) => handleSliderChange(key, parseFloat(e.target.value))}
                    className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-brand-green"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Component Contributions Table */}
      <div className="bg-bg-card border border-gray-800 rounded-xl p-6 shadow-md">
        <h3 className="text-md font-heading font-semibold text-white mb-4">Constituent Contribution Matrix</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-gray-800 text-gray-500 uppercase">
              <tr>
                <th className="py-2.5">Indicator</th>
                <th>Name</th>
                <th>Current Value</th>
                <th>Configured Weight</th>
                <th>Recent Contribution</th>
                <th className="text-right">Momentum Direction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/80 text-gray-300">
              {data?.components && data.components.map((comp: any) => (
                <tr key={comp.symbol} className="hover:bg-gray-900/30">
                  <td className="py-3 font-semibold text-white">{comp.symbol}</td>
                  <td className="text-gray-400">{comp.name}</td>
                  <td>{comp.value} <span className="text-[10px] text-gray-500">{comp.unit}</span></td>
                  <td>{comp.weight > 0 ? "+" : ""}{comp.weight.toFixed(2)}</td>
                  <td className={comp.contribution >= 0 ? "text-brand-green" : "text-brand-red"}>
                    {comp.contribution >= 0 ? "+" : ""}{comp.contribution}
                  </td>
                  <td className={`text-right font-semibold ${
                    comp.status === "Improving" ? "text-brand-green" : comp.status === "Worsening" ? "text-brand-red" : "text-gray-500"
                  }`}>
                    {comp.status}
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
