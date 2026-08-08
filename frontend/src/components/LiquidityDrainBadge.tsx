import React from "react";
import { ChevronDown, ChevronsDown, AlertTriangle, ShieldAlert } from "lucide-react";

interface LiquidityDrainBadgeProps {
  label?: string;
}

export default function LiquidityDrainBadge({ label }: LiquidityDrainBadgeProps) {
  const safeLabel = label || "Mild Drain";

  const getStyle = () => {
    const l = safeLabel.toLowerCase();
    if (l.includes("deleveraging") || l.includes("euphoria")) {
      return {
        bg: "bg-purple-900/20",
        text: "text-purple-400 border-purple-500/20",
        icon: <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />,
        textLabel: safeLabel
      };
    } else if (l.includes("stress") || l.includes("high") || l.includes("severe")) {
      return {
        bg: "bg-brand-red/15",
        text: "text-brand-red border-brand-red/20",
        icon: <AlertTriangle className="w-3.5 h-3.5" />,
        textLabel: safeLabel
      };
    } else if (l.includes("sucking") || l.includes("smart money")) {
      return {
        bg: "bg-brand-red/10",
        text: "text-red-400 border-red-500/10",
        icon: <ChevronsDown className="w-3.5 h-3.5" />,
        textLabel: safeLabel
      };
    } else if (l.includes("active") || l.includes("medium") || l.includes("moderate")) {
      return {
        bg: "bg-orange-500/10",
        text: "text-orange-400 border-orange-500/20",
        icon: <ChevronDown className="w-3.5 h-3.5" />,
        textLabel: safeLabel
      };
    } else {
      return {
        bg: "bg-amber-500/5",
        text: "text-amber-500/80 border-amber-500/10",
        icon: <ChevronDown className="w-3 h-3" />,
        textLabel: safeLabel
      };
    }
  };

  const { bg, text, icon, textLabel } = getStyle();

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${bg} ${text}`}>
      {icon}
      <span>{textLabel.toUpperCase()}</span>
    </span>
  );
}
