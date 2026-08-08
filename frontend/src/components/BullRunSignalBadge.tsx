import React from "react";
import { 
  ChevronsUp, 
  ChevronUp, 
  Circle, 
  Minus, 
  ChevronDown, 
  ChevronsDown, 
  Shield, 
  AlertTriangle 
} from "lucide-react";

interface SignalBadgeProps {
  signal?: string;
}

export default function BullRunSignalBadge({ signal }: SignalBadgeProps) {
  const safeSignal = signal || "Neutral";

  const getBadgeStyle = () => {
    const s = safeSignal.toLowerCase();
    if (s.includes("strong bull") || s.includes("confirmed bull")) {
      return {
        bg: "bg-brand-green/10",
        text: "text-brand-green border-brand-green/20",
        icon: <ChevronsUp className="w-3.5 h-3.5" />,
        label: safeSignal
      };
    } else if (s.includes("early bull")) {
      return {
        bg: "bg-brand-green/5",
        text: "text-emerald-400 border-emerald-400/20",
        icon: <ChevronUp className="w-3.5 h-3.5" />,
        label: safeSignal
      };
    } else if (s.includes("extended")) {
      return {
        bg: "bg-brand-yellow/10",
        text: "text-brand-yellow border-brand-yellow/20",
        icon: <ChevronUp className="w-3.5 h-3.5" />,
        label: safeSignal
      };
    } else if (s.includes("watchlist") || s.includes("accumulation")) {
      return {
        bg: "bg-brand-yellow/10",
        text: "text-brand-yellow border-brand-yellow/20",
        icon: <Circle className="w-2.5 h-2.5 fill-current" />,
        label: safeSignal
      };
    } else if (s.includes("defensive")) {
      return {
        bg: "bg-brand-blue/10",
        text: "text-brand-blue border-brand-blue/20",
        icon: <Shield className="w-3.5 h-3.5" />,
        label: safeSignal
      };
    } else if (s.includes("exhaustion") || s.includes("distribution")) {
      return {
        bg: "bg-orange-500/10",
        text: "text-orange-400 border-orange-400/20",
        icon: <AlertTriangle className="w-3.5 h-3.5" />,
        label: safeSignal
      };
    } else if (s.includes("breakdown") || s.includes("deleveraging") || s.includes("carry unwind") || s.includes("stress") || s.includes("avoid")) {
      return {
        bg: "bg-brand-red/15",
        text: "text-brand-red border-brand-red/25",
        icon: <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />,
        label: safeSignal
      };
    } else if (s.includes("reducing") || s.includes("outflow")) {
      return {
        bg: "bg-orange-500/10",
        text: "text-orange-400 border-orange-400/20",
        icon: <ChevronDown className="w-3.5 h-3.5" />,
        label: safeSignal
      };
    } else {
      return {
        bg: "bg-gray-800/40",
        text: "text-gray-400 border-gray-700/30",
        icon: <Minus className="w-3.5 h-3.5" />,
        label: safeSignal
      };
    }
  };

  const { bg, text, icon, label } = getBadgeStyle();

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${bg} ${text}`}>
      {icon}
      <span>{label}</span>
    </span>
  );
}
