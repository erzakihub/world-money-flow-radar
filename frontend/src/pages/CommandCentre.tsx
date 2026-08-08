import React, { useState, useEffect } from "react";
import { 
  Globe, 
  Database, 
  ArrowRight, 
  ArrowUpRight, 
  Sparkles, 
  Zap, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  HelpCircle,
  AlertTriangle
} from "lucide-react";
import MoneyFlowSignCard from "../components/MoneyFlowSignCard";
import SignalExplanationDrawer from "../components/SignalExplanationDrawer";
import BullRunSignalBadge from "../components/BullRunSignalBadge";
import LiquidityDrainBadge from "../components/LiquidityDrainBadge";
import DataQualityBadge from "../components/DataQualityBadge";

export default function CommandCentre() {
  const [signs, setSigns] = useState<any[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [bullPockets, setBullPockets] = useState<any[]>([]);
  const [liquidityDrains, setLiquidityDrains] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [selectedSign, setSelectedSign] = useState<any>(null);
  const [selectedFlow, setSelectedFlow] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [signsRes, dbRes, assetsRes, drainRes] = await Promise.all([
        fetch("/api/money-flow-signs").then(r => r.json()),
        fetch("/api/dashboard/command-centre").then(r => r.json()),
        fetch("/api/flow-pulse/assets").then(r => r.json()),
        fetch("/api/liquidity-drain/global").then(r => r.json())
      ]);
      
      setSigns(signsRes || []);
      setDashboardData(dbRes || {});
      setBullPockets((assetsRes || []).slice(0, 10));
      setLiquidityDrains((drainRes.draining_assets || []).slice(0, 10));
    } catch (e) {
      console.error("Failed to fetch Command Centre data", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading || !dashboardData) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-green"></div>
      </div>
    );
  }

  const { flow_map = { arrows: [] }, flow_tape = [] } = dashboardData;

  // Map schematic coordinates for capital flow map
  const nodes = {
    "Norway / SWF": { x: 70, y: 70, name: "Norway SWF", type: "origin", country: "NOR" },
    "China": { x: 90, y: 150, name: "PBoC / China", type: "origin", country: "CHN" },
    "Gulf / GCC": { x: 80, y: 230, name: "Gulf SWF (GCC)", type: "origin", country: "GCC" },
    "Japan": { x: 100, y: 310, name: "BoJ / JPN Carry", type: "origin", country: "JPN" },
    "Domestic India": { x: 260, y: 330, name: "Domestic India (SIP)", type: "origin", country: "IND" },
    "US Treasuries": { x: 500, y: 80, name: "US Treasuries", type: "destination" },
    "US Equities": { x: 510, y: 160, name: "US Equities (Tech)", type: "destination" },
    "Europe Assets": { x: 380, y: 90, name: "Europe Assets", type: "destination" },
    "Gold": { x: 490, y: 240, name: "Gold Reserves", type: "destination" },
    "India Equities": { x: 390, y: 270, name: "India Equities (Nifty)", type: "destination" }
  };

  const arrowsCoordinates = flow_map.arrows.map((arr: any) => {
    const fromNode = nodes[arr.source as keyof typeof nodes];
    const toNode = nodes[arr.target as keyof typeof nodes];
    if (!fromNode || !toNode) return null;

    const dx = toNode.x - fromNode.x;
    const dy = toNode.y - fromNode.y;
    const cx = fromNode.x + dx * 0.5;
    const cy = fromNode.y + dy * 0.2 - 20;

    return {
      ...arr,
      d: `M ${fromNode.x} ${fromNode.y} Q ${cx} ${cy} ${toNode.x} ${toNode.y}`,
      from: fromNode,
      to: toNode
    };
  }).filter(Boolean);

  const getSeverityBadge = (severity: string) => {
    if (severity.toLowerCase() === "critical") {
      return "bg-brand-red/10 text-brand-red border-brand-red/20";
    }
    if (severity.toLowerCase() === "warning") {
      return "bg-brand-yellow/10 text-brand-yellow border-brand-yellow/20";
    }
    return "bg-brand-blue/10 text-brand-blue border-brand-blue/20";
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-800/60 pb-4 gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white tracking-tight flex items-center gap-2">
            <Globe className="text-brand-green w-6 h-6 animate-spin-slow" />
            <span>World Money Flow Radar</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Institutional-grade capital deployment radar, surplus recycling channels, and bull/outflow signals.
          </p>
        </div>
        
        <div className="flex items-center gap-3 self-stretch md:self-auto justify-between">
          <div className="flex items-center gap-2">
            <DataQualityBadge status="Green" />
            <span className="text-[10px] font-mono text-gray-500 bg-gray-900 border border-gray-850 px-2 py-0.5 rounded">
              Demo data – not live.
            </span>
          </div>
          <span className="text-[10px] text-gray-500 font-mono">
            Sync: {dashboardData.timestamp}
          </span>
        </div>
      </div>

      {/* Top: Today's Money Flow Signs (8 Cards) */}
      <div>
        <div className="text-[10px] font-mono font-bold text-gray-600 uppercase tracking-widest mb-3">
          Today's Money Flow Signs
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {signs.map((sign) => (
            <MoneyFlowSignCard
              key={sign.id}
              id={sign.id}
              title={sign.title}
              value={sign.value}
              score={sign.score}
              direction={sign.direction}
              color={sign.color}
              explanation={sign.explanation}
              onSelect={() => setSelectedSign(sign)}
            />
          ))}
        </div>
      </div>

      {/* Middle: Map & Event Tape Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* World Flow Schematic Map (left 8 cols) */}
        <div className="lg:col-span-8 bg-bg-card border border-gray-850 rounded-xl p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-green/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-md font-heading font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-green" />
                <span>Global Capital Surplus Routing Map</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Schematic routing of sovereign wealth funds, carrying spreads, and domestic savings. Click arcs to audit.
              </p>
            </div>
            
            <div className="text-[10px] text-gray-400 font-mono bg-gray-900 border border-gray-800 px-2 py-0.5 rounded flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-ping"></span>
              <span>Yen Carry Trade borrow differential: active</span>
            </div>
          </div>

          {/* SVG Map Container */}
          <div className="flex-1 min-h-[350px] relative border border-gray-800/40 rounded-xl bg-gray-950/20 p-2 flex items-center justify-center">
            <svg 
              className="w-full max-w-[650px] h-[350px] overflow-visible" 
              viewBox="0 0 600 370"
            >
              <defs>
                <pattern id="grid-cc" width="20" height="20" patternUnits="userSpaceOnUse">
                  <rect width="20" height="20" fill="none" />
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255, 255, 255, 0.02)" strokeWidth="1" />
                </pattern>
                <marker id="arrow-cc" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10B981" />
                </marker>
                <marker id="arrow-amber-cc" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#F59E0B" />
                </marker>
                <marker id="arrow-cyan-cc" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#06B6D4" />
                </marker>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid-cc)" className="rounded-xl pointer-events-none" />

              {/* Connections */}
              {arrowsCoordinates.map((arrow: any) => {
                const isSelected = selectedFlow?.id === arrow.id;
                const strokeColor = arrow.color === "green" ? "#10B981" : arrow.color === "amber" ? "#F59E0B" : "#06B6D4";
                const markerId = arrow.color === "green" ? "url(#arrow-cc)" : arrow.color === "amber" ? "url(#arrow-amber-cc)" : "url(#arrow-cyan-cc)";
                return (
                  <g key={arrow.id} className="cursor-pointer group" onClick={() => setSelectedFlow(arrow)}>
                    <path d={arrow.d} fill="none" stroke="transparent" strokeWidth="12" />
                    <path
                      d={arrow.d}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={isSelected ? 4.5 : 2}
                      strokeOpacity={isSelected ? 0.9 : 0.35}
                      className="group-hover:stroke-opacity-80 transition-all duration-200"
                      markerEnd={markerId}
                    />
                    {arrow.animated && (
                      <path
                        d={arrow.d}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray="6 30"
                        className="animate-flow-dash pointer-events-none"
                      />
                    )}
                  </g>
                );
              })}

              {/* Nodes */}
              {Object.entries(nodes).map(([name, node]: any) => {
                const isSelected = selectedFlow?.from?.name === node.name || selectedFlow?.to?.name === node.name;
                const isOrigin = node.type === "origin";
                return (
                  <g key={name} transform={`translate(${node.x}, ${node.y})`} className="select-none pointer-events-none">
                    {isSelected && (
                      <circle 
                        r="20" 
                        fill="none" 
                        stroke={isOrigin ? "#10B981" : "#06B6D4"} 
                        strokeWidth="1.5" 
                        className="animate-ping opacity-35" 
                      />
                    )}
                    <circle
                      r="7"
                      fill={isOrigin ? "#111827" : "#1f2937"}
                      stroke={isOrigin ? "#10B981" : "#06B6D4"}
                      strokeWidth="2.5"
                    />
                    <text
                      y={isOrigin ? -12 : 16}
                      textAnchor="middle"
                      className="text-[9px] font-mono fill-gray-400 font-semibold"
                    >
                      {node.country ? `[${node.country}] ` : ""}{node.name}
                    </text>
                  </g>
                );
              })}
            </svg>

            {selectedFlow && (
              <div className="absolute bottom-4 left-4 right-4 bg-gray-900/95 border border-gray-800 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 backdrop-blur-md shadow-2xl animate-slide-up">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-green/10 text-brand-green border border-brand-green/20 font-bold uppercase">
                      Flow: {selectedFlow.value}
                    </span>
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      {selectedFlow.source} <ArrowRight className="w-3.5 h-3.5 text-gray-500" /> {selectedFlow.target}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-normal">{selectedFlow.desc}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button 
                    onClick={() => setSelectedFlow(null)}
                    className="px-2.5 py-1 text-[10px] font-mono text-gray-500 hover:text-white hover:bg-gray-800 rounded"
                  >
                    Clear
                  </button>
                  <div className="px-2.5 py-1 text-[10px] font-mono bg-brand-blue/15 text-brand-blue rounded border border-brand-blue/20 flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" />
                    <span>Real-time Proxy</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Macro Event Tape (right 4 cols) */}
        <div className="lg:col-span-4 bg-bg-card border border-gray-855 rounded-xl p-6 flex flex-col h-[495px]">
          <h3 className="text-md font-heading font-semibold text-white flex items-center gap-2 mb-1">
            <Zap className="text-brand-yellow w-4.5 h-4.5" />
            <span>Macro Flow Bulletin Tape</span>
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            z-score momentum signals and central bank anomalies.
          </p>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 font-sans">
            {flow_tape.map((evt: any) => {
              const isSelected = selectedEvent?.id === evt.id;
              return (
                <div 
                  key={evt.id}
                  onClick={() => setSelectedEvent(isSelected ? null : evt)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected ? "bg-gray-900 border-gray-700" : "bg-gray-950/40 border-gray-900 hover:border-gray-850"
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded border uppercase font-semibold ${getSeverityBadge(evt.severity)}`}>
                      {evt.category}
                    </span>
                    <span className="text-[9px] font-mono text-gray-500 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {evt.date}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-gray-200">{evt.title}</h4>
                  <p className="text-[11px] text-gray-400 mt-1">{evt.explanation}</p>
                  
                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-gray-800 space-y-2 text-[10px]">
                      <div className="bg-brand-green/5 border border-brand-green/10 rounded p-2 text-brand-green">
                        <span className="font-bold block uppercase text-[8px] mb-0.5">Why It Matters</span>
                        {evt.why_it_matters}
                      </div>
                      <div className="flex justify-between text-gray-500 font-mono">
                        <span>Success Rate:</span>
                        <span className="text-gray-300 font-semibold">{evt.historical_success}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom: Top 10 Bull Pockets & Top 10 Drains */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 Bull Pockets */}
        <div className="bg-bg-card border border-gray-850 rounded-xl p-6 shadow-md">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-heading font-bold text-white uppercase tracking-wider">Top 10 Bull Pockets</h3>
              <p className="text-[11px] text-gray-500 mt-0.5">Assets receiving capital allocations and showing price strength.</p>
            </div>
            <span className="text-[10px] font-mono text-brand-green font-bold">ASCENDING FLOW</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead>
                <tr className="border-b border-gray-850 text-gray-500 text-[10px] uppercase font-mono">
                  <th className="py-2.5">Asset Class</th>
                  <th className="py-2.5 text-center">Score</th>
                  <th className="py-2.5 text-right">Flow Signal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-900">
                {bullPockets.map((a, idx) => (
                  <tr key={a.id} className="hover:bg-gray-900/45 transition-colors">
                    <td className="py-3 font-semibold text-gray-200">
                      <span className="font-mono text-gray-500 mr-2">#{idx+1}</span>
                      {a.name}
                    </td>
                    <td className="py-3 text-center font-mono font-bold text-white">
                      {a.score.toFixed(1)}
                    </td>
                    <td className="py-3 text-right">
                      <BullRunSignalBadge signal={a.signal} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top 10 Liquidity Drains */}
        <div className="bg-bg-card border border-gray-850 rounded-xl p-6 shadow-md">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-heading font-bold text-white uppercase tracking-wider">Top 10 Liquidity Drains</h3>
              <p className="text-[11px] text-gray-500 mt-0.5">Assets facing active capital outflows and duration headwinds.</p>
            </div>
            <span className="text-[10px] font-mono text-brand-red font-bold">DESCENDING FLOW</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead>
                <tr className="border-b border-gray-850 text-gray-500 text-[10px] uppercase font-mono">
                  <th className="py-2.5">Asset Class</th>
                  <th className="py-2.5 text-center">Score</th>
                  <th className="py-2.5 text-right">Drain Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-900">
                {liquidityDrains.map((a, idx) => (
                  <tr key={a.id} className="hover:bg-gray-900/45 transition-colors">
                    <td className="py-3 font-semibold text-gray-250">
                      <span className="font-mono text-gray-500 mr-2">#{idx+1}</span>
                      {a.name}
                    </td>
                    <td className="py-3 text-center font-mono font-bold text-white">
                      {a.score.toFixed(1)}
                    </td>
                    <td className="py-3 text-right">
                      <LiquidityDrainBadge label={a.label} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Signal Explanation Drawer */}
      <SignalExplanationDrawer 
        isOpen={selectedSign !== null}
        onClose={() => setSelectedSign(null)}
        data={selectedSign}
      />
    </div>
  );
}
