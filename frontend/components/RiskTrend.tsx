"use client";

import { ArrowRight } from "lucide-react";

import type { RiskTrendPoint } from "@/lib/types";

interface RiskTrendProps {
  points: RiskTrendPoint[];
  compact?: boolean;
}

const style = {
  GREEN: { label: "GREEN", className: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" },
  YELLOW: { label: "YELLOW", className: "border-amber-400/25 bg-amber-400/10 text-amber-300" },
  RED: { label: "RED", className: "border-rose-500/25 bg-rose-500/10 text-rose-300" },
};

export default function RiskTrend({ points, compact = false }: RiskTrendProps) {
  if (!points.length) return null;
  const visible = compact ? points.slice(-4) : points;
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="风险变化趋势">
      {visible.map((point, index) => (
        <div key={point.id} className="flex items-center gap-1.5">
          {index > 0 && <ArrowRight className="h-3 w-3 text-slate-600" aria-hidden="true" />}
          <span className={`rounded-full border px-2 py-1 font-mono text-[9px] tracking-[0.12em] ${style[point.riskLevel].className}`} title={new Date(point.createdAt).toLocaleString("zh-CN")}>
            {style[point.riskLevel].label}
          </span>
        </div>
      ))}
    </div>
  );
}
