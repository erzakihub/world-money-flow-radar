import React from "react";
import { 
  Landmark, 
  DollarSign, 
  TrendingUp, 
  Activity, 
  Globe, 
  RefreshCw, 
  Target, 
  ArrowUpRight, 
  ArrowDownRight,
  GitCommit,
  Coins
} from "lucide-react";

interface MoneyFlowSignCardProps {
  id: string;
  title: string;
  value: string;
  score: number;
  direction: "up" | "down";
  color: "green" | "yellow" | "red" | "orange" | "cyan" | "purple" | string;
  explanation: string;
  onSelect: () => void;
}

export default function MoneyFlowSignCard({
  id,
  title,
  value,
  score,
  direction,
  color,
  explanation,
  onSelect
}: MoneyFlowSignCardProps) {
  
  // Icon selector
  const getIcon = () => {
    switch (id) {
      case "global_liq":
        return <Landmark className="w-5 h-5 text-emerald-400" />;
      case "dollar_liq":
        return <DollarSign className="w-5 h-5 text-sky-400" />;
      case "credit_creation":
        return <Coins className="w-5 h-5 text-amber-400" />;
      case "yield_curve":
        return <GitCommit className="w-5 h-5 text-orange-400" />;
      case "real_yield":
        return <Activity className="w-5 h-5 text-rose-400" />;
      case "cross_border":
        return <Globe className="w-5 h-5 text-cyan-400" />;
      case "carry_trade":
        return <RefreshCw className="w-5 h-5 text-purple-400" />;
      case "top_pocket":
      default:
        return <Target className="w-5 h-5 text-yellow-400" />;
    }
  };

  const getBorderColor = () => {
    switch (color) {
      case "green": return "border-brand-green/20 hover:border-brand-green/40 shadow-brand-green/5";
      case "yellow": return "border-brand-yellow/20 hover:border-brand-yellow/40 shadow-brand-yellow/5";
      case "red": return "border-brand-red/20 hover:border-brand-red/40 shadow-brand-red/5";
      case "orange": return "border-orange-500/20 hover:border-orange-500/40 shadow-orange-500/5";
      case "cyan": return "border-cyan-500/20 hover:border-cyan-500/40 shadow-cyan-500/5";
      case "purple": return "border-purple-500/20 hover:border-purple-500/40 shadow-purple-500/5";
      default: return "border-gray-800 hover:border-gray-700";
    }
  };

  return (
    <div 
      onClick={onSelect}
      className={`bg-bg-card border rounded-xl p-4 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:-translate-y-0.5 shadow-lg ${getBorderColor()}`}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gray-900/60 rounded-lg border border-gray-850">
            {getIcon()}
          </div>
          <div>
            <h4 className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">{title}</h4>
            <span className="text-sm font-bold text-white tracking-tight mt-0.5 block">{value}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <span className="text-xs font-mono font-bold text-gray-400">
            {score.toFixed(0)}
          </span>
          {direction === "up" ? (
            <ArrowUpRight className="w-3.5 h-3.5 text-brand-green" />
          ) : (
            <ArrowDownRight className="w-3.5 h-3.5 text-brand-red" />
          )}
        </div>
      </div>

      <p className="text-[11px] text-gray-400 mt-3 font-sans leading-relaxed line-clamp-2">
        {explanation}
      </p>

      <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-gray-900 text-[9px] font-mono text-gray-500">
        <span>CLICK FOR AUDIT</span>
        <span className="hover:text-white transition-colors">DETAILS ➜</span>
      </div>
    </div>
  );
}
