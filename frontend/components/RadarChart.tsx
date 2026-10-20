"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { InteractionResult, RiskLevel } from "@/lib/types";

interface RadarChartProps {
  interaction: InteractionResult;
  compact?: boolean;
}

const radarDimensions = [
  { key: "trust_cap", label: "信任上限" },
  { key: "synergy", label: "利益协同" },
  { key: "drain_rate", label: "情绪损耗" },
  { key: "friction", label: "权力对抗" },
  { key: "stickiness", label: "长远羁绊" },
] as const;

const riskTheme: Record<RiskLevel, { main: string; fill: string; soft: string; label: string }> = {
  RED: { main: "#f43f5e", fill: "rgba(244, 63, 94, 0.25)", soft: "text-rose-400", label: "高压红区" },
  YELLOW: { main: "#fbbf24", fill: "rgba(251, 191, 36, 0.24)", soft: "text-amber-400", label: "观察黄区" },
  GREEN: { main: "#34d399", fill: "rgba(52, 211, 153, 0.24)", soft: "text-emerald-400", label: "稳态绿区" },
};

export default function RadarChart({ interaction, compact = false }: RadarChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const theme = riskTheme[interaction.risk_level];

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current, undefined, { renderer: "svg" });
    const values = radarDimensions.map(({ key }) => interaction.dimensions[key]);
    chart.setOption({
      animationDuration: 650,
      animationEasing: "cubicOut",
      radar: {
        center: ["50%", "50%"],
        radius: compact ? "63%" : "69%",
        shape: "polygon",
        splitNumber: 4,
        indicator: radarDimensions.map(({ label }) => ({ name: label, max: 100 })),
        axisName: {
          color: "#64748b",
          fontSize: compact ? 9 : 11,
          fontWeight: 500,
        },
        axisLine: { lineStyle: { color: "rgba(100, 116, 139, 0.2)" } },
        splitLine: { lineStyle: { color: "rgba(100, 116, 139, 0.16)" } },
        splitArea: {
          areaStyle: {
            color: ["rgba(239, 246, 255, 0.5)", "rgba(248, 250, 252, 0.75)"],
          },
        },
      },
      series: [
        {
          type: "radar",
          symbol: "circle",
          symbolSize: compact ? 4 : 6,
          lineStyle: { width: compact ? 1.5 : 2, color: theme.main, shadowBlur: 12, shadowColor: theme.main },
          itemStyle: { color: theme.main, borderColor: "#ffffff", borderWidth: 2 },
          areaStyle: { color: theme.fill },
          data: [{ value: values }],
        },
      ],
    });

    const resize = () => chart.resize();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    observer?.observe(chartRef.current);
    window.addEventListener("resize", resize);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", resize);
      chart.dispose();
    };
  }, [compact, interaction.dimensions, interaction.risk_level, theme.fill, theme.main]);

  return (
    <div className="h-full min-h-[310px]">
      <div className="mb-1 flex items-center justify-between gap-3">
        <p className="eyebrow">五维关系雷达</p>
        <span className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${theme.soft}`}>{theme.label}</span>
      </div>
      <div ref={chartRef} className={compact ? "h-[180px] w-full" : "h-[300px] w-full sm:h-[340px]"} aria-label="五维关系雷达图" />
      {!compact && (
        <div className="grid grid-cols-5 gap-1 border-t border-slate-800/70 pt-4">
          {radarDimensions.map(({ key, label }) => (
            <div key={key} className="text-center">
              <p className="text-[10px] leading-4 text-slate-600">{label}</p>
              <p className={`mt-1 font-mono text-sm font-semibold ${theme.soft}`}>{interaction.dimensions[key]}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
