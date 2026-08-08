import React, { useState, useEffect } from "react";
import { 
  ArrowRight, 
  Info, 
  HelpCircle, 
  RefreshCw, 
  Database,
  ArrowUpRight,
  TrendingUp,
  Sliders,
  DollarSign
} from "lucide-react";

export default function GlobalSavingsFlow() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const fetchSankey = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/flows/sankey");
      const resData = await response.json();
      setData(resData);
    } catch (e) {
      console.error("Failed to fetch Sankey flow data", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSankey();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-green"></div>
      </div>
    );
  }

  // Exact coordinates matching the layer design: Layer 0 to Layer 4
  const nodePositions: { [key: string]: { x: number, y: number, name: string, layer: number, desc: string } } = {
    // Layer 0: Surplus Generators (Surplus)
    "China_Trade": { x: 50, y: 50, name: "China Trade Surplus", layer: 0, desc: "Recycled export windfalls driven by domestic manufacturing dominance." },
    "Japan_Savings": { x: 50, y: 125, name: "Japan Carry & Savings", layer: 0, desc: "Retail margin deposits and cheap JPY wholesale funding searching for global yield." },
    "GCC_Oil": { x: 50, y: 200, name: "Gulf/GCC Oil Windfalls", layer: 0, desc: "Petrodollars created during fossil commodity supply constraints." },
    "Norway_Oil": { x: 50, y: 275, name: "Norway Oil Revenues", layer: 0, desc: "Government resource taxes funneled straight into structural sovereign wealth." },
    "India_Domestic": { x: 50, y: 350, name: "India Mutual Savings", layer: 0, desc: "Retail SIP equity savings channeling ₹19.8k Cr monthly into domestic equities." },
    
    // Layer 1: Reserve Accumulation / SWFs (Reserve)
    "PBOC_FX": { x: 230, y: 50, name: "PBoC FX Reserves", layer: 1, desc: "State currency interventions resulting in a $3.2T sovereign asset chest." },
    "BOJ_FX": { x: 230, y: 125, name: "BoJ FX & JPY Carry", layer: 1, desc: "Bank of Japan asset balance sheet backing commercial FX carry-trade channels." },
    "GCC_SWF": { x: 230, y: 200, name: "GCC SWFs (ADIA/PIF)", layer: 1, desc: "Strategic sovereign funds buying global tech equities and infrastructure concessions." },
    "Norway_SWF": { x: 230, y: 275, name: "Norway GPFG SWF", layer: 1, desc: "The world's largest sovereign equity owner holding 1.5% of all listed companies." },
    "India_Mutual": { x: 230, y: 350, name: "Indian DII Funds", layer: 1, desc: "Domestic Institutional Investors absorbing foreign sell-offs and holding prices." },

    // Layer 2: Allocation Channels (Channel)
    "UST_Purchase": { x: 410, y: 80, name: "US Treasuries Channel", layer: 2, desc: "Global sovereign buyers underwriting US dollar reserve denominated debt." },
    "Global_Equity_Alloc": { x: 410, y: 160, name: "Global Equities Channel", layer: 2, desc: "Public listings equity syndicates routing capital to growth centers." },
    "Gold_Bullion": { x: 410, y: 230, name: "Gold Bullion buying", layer: 2, desc: "De-dollarization efforts shifting sovereign reserves into physical safe assets." },
    "India_Equity_Alloc": { x: 410, y: 300, name: "Indian Equities Channel", layer: 2, desc: "Secondary exchange flows backing Nifty index growth." },
    "FDI_EM_Bonds": { x: 410, y: 360, name: "EM Assets Channel", layer: 2, desc: "Emerging market sovereign credit and cross-border developmental FDI." },

    // Layer 3: Final Destination Assets (Asset)
    "US_Bonds": { x: 590, y: 80, name: "US Gov Bonds", layer: 3, desc: "US Federal debt instruments tracking risk-free rate parameters." },
    "US_Tech_Stocks": { x: 590, y: 160, name: "US Tech (Nasdaq)", layer: 3, desc: "Megacap technology shares acting as primary liquidity stores." },
    "Gold_Reserves": { x: 590, y: 230, name: "Physical Gold", layer: 3, desc: "Sovereign vault gold acting as credit hedge backing currency bases." },
    "India_Index": { x: 590, y: 300, name: "Nifty 50 Index", layer: 3, desc: "Top 50 Indian blue-chip corporates." },
    "EM_Bonds_Assets": { x: 590, y: 360, name: "EM Sovereign Debt", layer: 3, desc: "Developing country sovereign paper and infrastructure indices." },

    // Layer 4: Market Impact (Impact)
    "USD_Funding_Ease": { x: 770, y: 80, name: "Supports US Deficits", layer: 4, desc: "Compresses risk premiums, facilitating federal treasury debt refinancing." },
    "US_Asset_Inflation": { x: 770, y: 160, name: "Tech Stock Multiples", layer: 4, desc: "Sustains high P/E multiples by providing a continuous source of marginal demand." },
    "Gold_Price_Floor": { x: 770, y: 230, name: "Bullion Price Floor", layer: 4, desc: "Establishes a strong structural price floor irrespective of macro real interest rates." },
    "India_valuation_cushion": { x: 770, y: 300, name: "Valuation Cushion", layer: 4, desc: "Buffers Indian equities from FPI pull-outs, keeping volatility below EM peers." },
    "EM_growth_support": { x: 770, y: 360, name: "EM Infrastructure", layer: 4, desc: "Funds logistics and infrastructure upgrades, expanding long-term output." }
  };

  const getLinkPath = (link: any) => {
    const fromNode = nodePositions[link.source];
    const toNode = nodePositions[link.target];
    if (!fromNode || !toNode) return "";

    const dx = toNode.x - fromNode.x;
    const cx1 = fromNode.x + dx * 0.45;
    const cy1 = fromNode.y;
    const cx2 = fromNode.x + dx * 0.55;
    const cy2 = toNode.y;

    return `M ${fromNode.x} ${fromNode.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${toNode.x} ${toNode.y}`;
  };

  const getLinkColor = (source: string) => {
    if (source.includes("China") || source.includes("PBOC") || source.includes("Gold")) return "#F59E0B"; // Amber
    if (source.includes("Japan") || source.includes("BOJ") || source.includes("UST")) return "#10B981"; // Green
    if (source.includes("GCC") || source.includes("Norway") || source.includes("Global_Equity")) return "#06B6D4"; // Cyan
    return "#8B5CF6"; // Purple for India / SIP
  };

  const isLinkActive = (link: any) => {
    if (!hoveredNode && !selectedNode) return true;
    const checkNode = hoveredNode || selectedNode;
    return link.source === checkNode || link.target === checkNode;
  };

  const getActiveNodeInfo = () => {
    const active = selectedNode || hoveredNode;
    return active ? nodePositions[active] : null;
  };

  const activeNode = getActiveNodeInfo();

  // Find linked flows for the selected/hovered node
  const activeFlows = data.links.filter((link: any) => {
    const checkNode = selectedNode || hoveredNode;
    return checkNode ? (link.source === checkNode || link.target === checkNode) : false;
  });

  const totalActiveValue = activeFlows.reduce((sum: number, link: any) => sum + link.value, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white tracking-tight flex items-center gap-2">
            <Sliders className="text-brand-purple w-6 h-6" />
            <span>Global Savings to Asset Flow (Sankey)</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Traces the multi-step recycling of global trade surplus capital into final asset classes and market impacts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-gray-900 border border-gray-800 rounded-lg flex items-center gap-2 text-xs font-mono text-gray-400">
            <Database className="w-3.5 h-3.5 text-brand-green" />
            <span>Sankey Node Resolution: Active</span>
          </div>
          <button 
            onClick={fetchSankey}
            className="p-2 rounded-lg bg-gray-900 border border-gray-800 text-gray-400 hover:text-white transition-colors duration-150"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sankey Board (9 cols) */}
        <div className="lg:col-span-9 bg-bg-card border border-gray-850 rounded-xl p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-purple/5 rounded-full blur-3xl pointer-events-none"></div>

          {/* Layer Headers */}
          <div className="grid grid-cols-5 text-center text-[10px] font-mono text-gray-500 font-semibold uppercase tracking-wider mb-4 border-b border-gray-900 pb-2">
            <div>1. Surplus Source</div>
            <div>2. Allocator Entity</div>
            <div>3. Channel</div>
            <div>4. Target Asset</div>
            <div>5. Realized Impact</div>
          </div>

          {/* Sankey SVG viewport */}
          <div className="relative border border-gray-900 rounded-xl bg-gray-950/20 p-2 flex items-center justify-center min-h-[420px]">
            <svg 
              className="w-full max-w-[850px] h-[400px] overflow-visible"
              viewBox="0 0 820 400"
            >
              <defs>
                <pattern id="sankey-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <rect width="30" height="30" fill="none" />
                  <circle cx="1" cy="1" r="1" fill="rgba(255, 255, 255, 0.015)" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#sankey-grid)" className="rounded-xl pointer-events-none" />

              {/* Connections (Links) */}
              <g>
                {data.links.map((link: any, idx: number) => {
                  const active = isLinkActive(link);
                  const color = getLinkColor(link.source);
                  const strokeWidth = Math.max(3, Math.min(32, link.value / 10));
                  
                  return (
                    <path
                      key={`link-${idx}`}
                      d={getLinkPath(link)}
                      fill="none"
                      stroke={color}
                      strokeWidth={strokeWidth}
                      strokeOpacity={active ? 0.35 : 0.03}
                      className="transition-all duration-300 hover:stroke-opacity-70 cursor-pointer"
                      onClick={() => {
                        setSelectedNode(link.source);
                      }}
                    />
                  );
                })}
              </g>

              {/* Nodes circles */}
              <g>
                {Object.entries(nodePositions).map(([id, node]: any) => {
                  const isSelected = selectedNode === id;
                  const isHovered = hoveredNode === id;
                  const active = isSelected || isHovered;
                  
                  return (
                    <g 
                      key={id}
                      transform={`translate(${node.x}, ${node.y})`}
                      className="cursor-pointer group"
                      onMouseEnter={() => setHoveredNode(id)}
                      onMouseLeave={() => setHoveredNode(null)}
                      onClick={() => setSelectedNode(isSelected ? null : id)}
                    >
                      {/* Aura */}
                      <circle 
                        r="14" 
                        fill="transparent" 
                        stroke={active ? getLinkColor(id) : "transparent"}
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                        className="animate-spin"
                        style={{ animationDuration: '8s' }}
                      />
                      {/* Main Circle */}
                      <circle
                        r="6"
                        fill="#0f1115"
                        stroke={active ? getLinkColor(id) : "#374151"}
                        strokeWidth={active ? 3 : 2}
                        className="group-hover:scale-125 transition-transform"
                      />
                      {/* Name Label */}
                      <text
                        y={-14}
                        textAnchor="middle"
                        className={`text-[8.5px] font-mono transition-colors duration-150 ${
                          active ? "fill-white font-bold" : "fill-gray-500 group-hover:fill-gray-300"
                        }`}
                      >
                        {node.name}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
        </div>

        {/* Explainability / Detail panel (3 cols) */}
        <div className="lg:col-span-3">
          {activeNode ? (
            <div className="bg-bg-card border border-gray-850 rounded-xl p-5 space-y-5 shadow-lg h-full flex flex-col justify-between">
              <div className="space-y-4">
                <div className="border-b border-gray-800/80 pb-3">
                  <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block">Selected segment</span>
                  <h3 className="text-md font-heading font-extrabold text-white mt-1">{activeNode.name}</h3>
                  <span className="text-[9px] font-mono bg-brand-purple/10 text-brand-purple px-2 py-0.5 rounded border border-brand-purple/20 inline-block mt-2 font-bold uppercase">
                    Layer {activeNode.layer + 1}
                  </span>
                </div>

                <div className="bg-gray-950/40 p-4 rounded-xl border border-gray-900 space-y-1">
                  <span className="text-[9px] font-mono text-gray-500 uppercase block">Functional Mandate</span>
                  <p className="text-xs text-gray-300 leading-relaxed font-sans">{activeNode.desc}</p>
                </div>

                {/* Flows list */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                    Linked Pipeline Capital ({activeFlows.length})
                  </h4>
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                    {activeFlows.map((flow: any, idx: number) => {
                      const isSource = flow.source === (selectedNode || hoveredNode);
                      const partnerId = isSource ? flow.target : flow.source;
                      const partnerName = nodePositions[partnerId]?.name || partnerId;
                      return (
                        <div key={idx} className="flex justify-between items-center text-xs bg-gray-950/20 p-2.5 rounded border border-gray-900/50">
                          <span className="text-gray-400 font-medium truncate max-w-[130px]">
                            {isSource ? "➜ " : "DF "} {partnerName}
                          </span>
                          <span className="font-mono font-bold text-brand-green">${flow.value}B</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-800/80">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-mono">Aggregated flow:</span>
                  <span className="font-mono font-bold text-white text-md">${totalActiveValue.toFixed(1)}B</span>
                </div>
                <button 
                  onClick={() => setSelectedNode(null)}
                  className="w-full mt-3 py-1.5 bg-gray-900 hover:bg-gray-850 border border-gray-800 hover:border-gray-700 text-gray-400 hover:text-white rounded-lg text-xs font-mono transition-colors"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-bg-card border border-gray-850 rounded-xl p-8 text-center h-full flex flex-col items-center justify-center text-gray-500 min-h-[350px]">
              <HelpCircle className="w-10 h-10 text-gray-700 mb-3" />
              <p className="text-xs">
                Select or hover over any Sankey node to inspect its specific capital export capacity, downstream allocation channels, and asset-price multipliers.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 4. Bottom Contextual Note */}
      <div className="bg-bg-card border border-gray-850 rounded-xl p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-brand-green/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-brand-blue flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-heading font-semibold text-white uppercase tracking-wider">Recycling Mechanics</h4>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Global surplus capital recycling represents the core mechanism behind asset price inflation. When trade exporter nations 
              accumulate foreign exchange reserves, statutory rules force them to purchase US sovereign debt (lowering global risk-free rates) 
              or reallocate excess cash buffers via sovereign wealth funds into tech growth sectors, direct equity indexes, or physical assets like Gold. 
              This Sankey chart visually traces this macro liquidity highway.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
