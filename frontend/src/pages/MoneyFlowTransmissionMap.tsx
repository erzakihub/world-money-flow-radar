import React, { useState, useEffect } from "react";
import { 
  Network, 
  Sparkles, 
  HelpCircle,
  Database,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Info,
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import DataQualityBadge from "../components/DataQualityBadge";

export default function MoneyFlowTransmissionMap() {
  const [mapData, setMapData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeChain, setActiveChain] = useState<string>("Fed");

  const fetchMapData = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/transmission-map");
      const data = await response.json();
      setMapData(data);
    } catch (e) {
      console.error("Failed to fetch transmission map data", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMapData();
  }, []);

  if (loading || !mapData) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-green"></div>
      </div>
    );
  }

  // Filter nodes based on selected chain to render coordinate positions
  const chains = [
    { id: "Fed", name: "Fed Easing & Real Yields", prefix: "n1_" },
    { id: "RBI", name: "RBI Liquidity & Domestic SIP", prefix: "n2_" },
    { id: "PBOC", name: "PBoC Credit & Copper Demand", prefix: "n3_" },
    { id: "BOJ", name: "BoJ Rate & Carry Trade Unwind", prefix: "n4_" },
    { id: "US_Debt", name: "US Debt & Bear Steepening", prefix: "n5_" }
  ];

  const getChainDetails = () => {
    switch (activeChain) {
      case "Fed":
        return {
          title: "Fed Liquidity Transmission Path",
          desc: "Calculates the flow velocity of central bank liquidity additions. Fed Net Liquidity expansion reduces the USD funding cost, lowering the real yield gravity and increasing the present value discount factor for long-duration cash flows.",
          velocity: "High (1-3 weeks transmission lag)",
          impacted: "Nasdaq 100, S&P 500, Cryptocurrencies, Gold",
          confidence: "88%"
        };
      case "RBI":
        return {
          title: "RBI Liquidity & Domestic SIP Channel",
          desc: "Tracks domestic systemic banking liquidity additions. RBI open market operations and reserve injections support commercial bank lending spreads, fueling mutual fund SIP structural asset cushions.",
          velocity: "Medium (4-8 weeks transmission lag)",
          impacted: "Nifty 50, Indian Sovereign Bonds, Capex sectors",
          confidence: "85%"
        };
      case "PBOC":
        return {
          title: "PBoC Total Credit Impulse Channel",
          desc: "Calculates total social credit additions inside China. Monetary reserve requirement ratio (RRR) cuts increase commercial bank lending capacity, transmitting directly to global factory inputs and base metals.",
          velocity: "Slow (8-12 weeks transmission lag)",
          impacted: "Copper, Industrial commodities, Emerging Market Cyclicals",
          confidence: "82%"
        };
      case "BOJ":
        return {
          title: "BoJ Hiking & Carry Trade Unwind Path",
          desc: "Senses forced liquidation thresholds. Hikes in JGB yields narrow JPY funding spreads, triggering short covering on low-yield borrowings and broad risk-asset deleveraging.",
          velocity: "Immediate (1-3 days transmission lag)",
          impacted: "USD/JPY, High Yield spreads, US Tech stocks",
          confidence: "92%"
        };
      case "US_Debt":
      default:
        return {
          title: "US Treasury Deficit Supply Path",
          desc: "Monitors supply-side fiscal duration stress. Expansion in sovereign debt issuance pushes the term premium upward (bear steepener). This forces nominal 10Y rates higher, compressing P/E ratios.",
          velocity: "Medium (2-4 weeks transmission lag)",
          impacted: "Long duration growth stocks, Real estate REITs, Gold",
          confidence: "78%"
        };
    }
  };

  const activeChainNodes = mapData.nodes.filter((n: any) => {
    const chainPrefix = chains.find(c => c.id === activeChain)?.prefix;
    return chainPrefix && n.id.startsWith(chainPrefix);
  });

  const activeChainEdges = mapData.edges.filter((e: any) => {
    const chainPrefix = chains.find(c => c.id === activeChain)?.prefix;
    return chainPrefix && e.source.startsWith(chainPrefix) && e.target.startsWith(chainPrefix);
  });

  // Assign coordinate positions for the 4 nodes in a horizontal causality chain
  // Level 1: Policy (x: 50, y: 150)
  // Level 2: Channel (x: 200, y: 150)
  // Level 3: Intermediate (x: 350, y: 150)
  // Level 4: Asset target (x: 500, y: 150)
  const getCoordinates = (level: number) => {
    switch (level) {
      case 1: return { x: 50, y: 130 };
      case 2: return { x: 190, y: 130 };
      case 3: return { x: 330, y: 130 };
      case 4: default: return { x: 470, y: 130 };
    }
  };

  const details = getChainDetails();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white tracking-tight flex items-center gap-2">
            <Network className="text-brand-green w-6 h-6 animate-pulse" />
            <span>Money Flow Transmission Map</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Visualize how macro-policy events translate through discount rates and liquidity channels into physical asset pricing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DataQualityBadge status="Green" />
        </div>
      </div>

      {/* Selectors Bar */}
      <div className="bg-bg-card border border-gray-850 rounded-xl p-4 flex flex-wrap gap-2.5 shadow-md">
        {chains.map(c => (
          <button
            key={c.id}
            onClick={() => setActiveChain(c.id)}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all ${
              activeChain === c.id 
                ? "bg-brand-green text-black shadow-md shadow-brand-green/10" 
                : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:bg-gray-850"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Diagram & Explanation Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Node Diagram (8 cols) */}
        <div className="lg:col-span-8 bg-bg-card border border-gray-850 rounded-xl p-6 flex flex-col justify-between min-h-[360px] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-green/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wider">Causality Transmission Diagram</h3>
            <span className="text-[10px] font-mono text-gray-400 bg-gray-900 border border-gray-850 px-2 py-0.5 rounded">
              Directional flow: policy trigger to asset target
            </span>
          </div>

          {/* SVG Diagram Canvas */}
          <div className="flex-1 border border-gray-900 bg-gray-955/20 rounded-xl flex items-center justify-center p-4">
            <svg 
              className="w-full max-w-[550px] h-[260px] overflow-visible"
              viewBox="0 0 520 260"
            >
              <defs>
                <marker id="map-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10B981" />
                </marker>
                <pattern id="grid-map" width="20" height="20" patternUnits="userSpaceOnUse">
                  <rect width="20" height="20" fill="none" />
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255, 255, 255, 0.015)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid-map)" className="rounded-xl pointer-events-none" />

              {/* Draw animated edges */}
              {activeChainEdges.map((edge: any, index: number) => {
                const sourceNode = activeChainNodes.find((n: any) => n.id === edge.source);
                const targetNode = activeChainNodes.find((n: any) => n.id === edge.target);
                if (!sourceNode || !targetNode) return null;

                const start = getCoordinates(sourceNode.level);
                const end = getCoordinates(targetNode.level);
                
                // Draw curve connection
                const midX = (start.x + end.x) / 2;
                const pathD = `M ${start.x} ${start.y} Q ${midX} ${start.y - 15} ${end.x} ${end.y}`;

                return (
                  <g key={`edge-${index}`}>
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#10B981"
                      strokeWidth={1.8}
                      strokeOpacity={0.4}
                      markerEnd="url(#map-arrow)"
                    />
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeDasharray="5 15"
                      className="animate-flow-dash pointer-events-none"
                    />
                  </g>
                );
              })}

              {/* Draw Nodes */}
              {activeChainNodes.map((node: any) => {
                const pos = getCoordinates(node.level);
                const isPositive = node.direction === "up";
                const isSource = node.level === 1;
                const isTarget = node.level === 4;

                return (
                  <g key={node.id} transform={`translate(${pos.x}, ${pos.y})`}>
                    {/* Ring indicator */}
                    <circle
                      r={isSource || isTarget ? "14" : "11"}
                      fill="#111827"
                      stroke={isTarget ? (isPositive ? "#10B981" : "#EF4444") : "#00b0ff"}
                      strokeWidth="2"
                    />
                    
                    {/* Direction Arrow */}
                    {isPositive ? (
                      <path d="M -3 3 L 3 -3 M 3 -3 L -1 -3 M 3 -3 L 3 1" fill="none" stroke={isTarget ? "#10B981" : "#00b0ff"} strokeWidth="1.5" strokeLinecap="round" />
                    ) : (
                      <path d="M -3 -3 L 3 3 M 3 3 L -1 3 M 3 3 L 3 -1" fill="none" stroke={isTarget ? "#EF4444" : "#00b0ff"} strokeWidth="1.5" strokeLinecap="round" />
                    )}

                    {/* Node value flag */}
                    <rect
                      x="-55"
                      y="-48"
                      width="110"
                      height="24"
                      rx="4"
                      fill="#1f2937"
                      stroke="#374151"
                      strokeWidth="1"
                    />
                    
                    {/* Value text */}
                    <text
                      y="-32"
                      textAnchor="middle"
                      className="text-[8px] font-mono fill-brand-green font-bold"
                    >
                      {node.value}
                    </text>

                    {/* Category Label */}
                    <text
                      y="-56"
                      textAnchor="middle"
                      className="text-[7.5px] font-mono fill-gray-500 uppercase tracking-wider"
                    >
                      {node.category}
                    </text>

                    {/* Title Label */}
                    <text
                      y="32"
                      textAnchor="middle"
                      className="text-[9px] font-semibold fill-gray-300 font-sans"
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Explainability details (4 cols) */}
        <div className="lg:col-span-4 bg-bg-card border border-gray-850 rounded-xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-3.5">
            <div className="border-b border-gray-800/80 pb-3">
              <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">Causality Audit</span>
              <h3 className="text-md font-heading font-extrabold text-white mt-0.5">{details.title}</h3>
            </div>
            
            <p className="text-xs text-gray-400 leading-relaxed font-sans">
              {details.desc}
            </p>
          </div>

          <div className="bg-gray-955/40 p-4 rounded-xl border border-gray-900 text-xs space-y-2.5 font-mono">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-[10px]">Transmission lag:</span>
              <span className="text-white font-bold">{details.velocity}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-[10px]">Causality Confidence:</span>
              <span className="text-brand-green font-bold">{details.confidence}</span>
            </div>
            <div className="border-t border-gray-900 pt-2.5 mt-1 font-sans">
              <span className="text-[8px] font-mono text-brand-blue uppercase block mb-1">Target Assets Impacted</span>
              <p className="text-gray-300 leading-normal text-xs">{details.impacted}</p>
            </div>
          </div>

          <div className="text-[10px] font-mono text-gray-500 flex items-center gap-1.5 border-t border-gray-900 pt-3">
            <Info className="w-3.5 h-3.5 text-brand-blue" />
            <span>Map models auto-update hourly</span>
          </div>
        </div>

      </div>
    </div>
  );
}
