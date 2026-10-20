"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { Download, LoaderCircle, LockKeyhole, X } from "lucide-react";

import type { AnalysisResponse, RiskLevel } from "@/lib/types";

interface ShareCardModalProps {
  analysis: AnalysisResponse | null;
  open: boolean;
  userName: string;
  targetName: string;
  onClose: () => void;
}

const riskPalette: Record<RiskLevel, { color: string; soft: string; label: string }> = {
  RED: { color: "#f43f5e", soft: "rgba(244,63,94,0.15)", label: "RED / 高压避险" },
  YELLOW: { color: "#fbbf24", soft: "rgba(251,191,36,0.15)", label: "YELLOW / 观察预警" },
  GREEN: { color: "#34d399", soft: "rgba(52,211,153,0.15)", label: "GREEN / 稳态协作" },
};

const miniLabels = ["信", "协", "耗", "抗", "绊"];
const miniKeys = ["trust_cap", "synergy", "drain_rate", "friction", "stickiness"] as const;

function pointsFor(values: number[], radius: number, center = 60) {
  return values.map((value, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / values.length;
    const distance = radius * (value / 100);
    return `${center + Math.cos(angle) * distance},${center + Math.sin(angle) * distance}`;
  }).join(" ");
}

function MiniRadar({ analysis }: { analysis: AnalysisResponse }) {
  const palette = riskPalette[analysis.interaction.risk_level];
  const values = miniKeys.map((key) => analysis.interaction.dimensions[key]);
  const rings = [25, 45, 65, 85];
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 120 120" className="h-28 w-28 shrink-0" role="img" aria-label="脱敏微缩雷达图">
        {rings.map((ring) => <polygon key={ring} points={pointsFor([100, 100, 100, 100, 100], ring)} fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="0.8" />)}
        <polygon points={pointsFor(values, 48)} fill={palette.soft} stroke={palette.color} strokeWidth="2" />
        {values.map((value, index) => {
          const point = pointsFor([value, 0, 0, 0, 0], 48).split(" ")[index];
          const [x, y] = point.split(",");
          return <circle key={miniLabels[index]} cx={x} cy={y} r="2.5" fill={palette.color} />;
        })}
      </svg>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] text-slate-500">
        {miniLabels.map((label, index) => <span key={label}><b className="mr-1 text-slate-300">{label}</b>{values[index]}</span>)}
      </div>
    </div>
  );
}

export default function ShareCardModal({ analysis, open, userName, targetName, onClose }: ShareCardModalProps) {
  const posterRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  const palette = analysis ? riskPalette[analysis.interaction.risk_level] : riskPalette.GREEN;
  const fileName = useMemo(() => {
    const safeUser = userName.trim().replace(/[^\w\u4e00-\u9fa5-]/g, "") || "我方";
    const safeTarget = targetName.trim().replace(/[^\w\u4e00-\u9fa5-]/g, "") || "对方";
    return `合盘避险-${safeUser}-${safeTarget}.png`;
  }, [targetName, userName]);

  if (!open || !analysis) return null;

  const exportImage = async () => {
    if (!posterRef.current) return;
    setIsExporting(true);
    setExportError(null);
    try {
      const canvas = await html2canvas(posterRef.current, {
        backgroundColor: "#f7faff",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = fileName;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      setExportError("海报生成失败，请稍后重试；报告仍保存在本地档案中。");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-xl sm:p-6" role="dialog" aria-modal="true" aria-labelledby="share-modal-title" onClick={onClose}>
      <div className="w-full max-w-lg" onClick={(event) => event.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between px-1">
          <div><p className="eyebrow">PRIVATE SHARE / 脱敏分享</p><h2 id="share-modal-title" className="mt-1 text-lg font-semibold text-slate-100">生成一张可控范围内的关系海报</h2></div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-800 hover:text-slate-200" aria-label="关闭弹窗"><X className="h-5 w-5" /></button>
        </div>

        <div ref={posterRef} className="scanline overflow-hidden rounded-3xl border border-slate-200 bg-[#f7faff] p-6 shadow-xl sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div><p className="font-mono text-[10px] tracking-[0.3em] text-slate-500">RELATIONSHIP INTELLIGENCE / 01</p><p className="mt-3 text-xs text-slate-500">合盘避险局</p></div>
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-emerald-400"><LockKeyhole className="h-3.5 w-3.5" /> privacy safe</div>
          </div>
          <div className="my-7 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
          <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
            <h3 className="font-display text-2xl font-semibold text-slate-100">{userName || "我方"}</h3>
            <span className="pb-1 font-mono text-sm text-slate-600">×</span>
            <h3 className="font-display text-2xl font-semibold text-slate-100">{targetName || "对方"}</h3>
            <span className="mb-1 rounded-full border border-slate-700 px-2.5 py-1 text-[10px] text-slate-400">{analysis.relationship_type}</span>
          </div>
          <p className="mt-2 text-sm text-slate-500">{analysis.report.relationship_archetype}</p>

          <div className="mt-7 flex flex-col gap-5 rounded-2xl border p-4 sm:flex-row sm:items-center" style={{ borderColor: `${palette.color}44`, backgroundColor: palette.soft }}>
            <div><p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: palette.color }}>{palette.label}</p><p className="mt-2 max-w-xs text-sm leading-6 text-slate-200">{analysis.report.one_sentence_verdict}</p></div>
            <MiniRadar analysis={analysis} />
          </div>
          <div className="mt-6 rounded-2xl border border-amber-400/15 bg-amber-400/[0.045] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400">SOCIAL CODE / 社交金句</p>
            <p className="mt-2 text-sm leading-6 text-amber-50/80">{analysis.report.social_quotes[0] ?? "先把边界和下一步说清楚，关系自然会有答案。"}</p>
          </div>
          <div className="mt-7 flex items-center justify-between border-t border-slate-800 pt-4 text-[10px] text-slate-600"><span>仅展示称呼、原型、等级与微缩雷达</span><span>BAZI / MODERN PLAYBOOK</span></div>
        </div>

        <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button onClick={onClose} className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-slate-100">返回报告</button>
          <button onClick={exportImage} disabled={isExporting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-wait disabled:opacity-70">
            {isExporting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {isExporting ? "正在生成…" : "下载脱敏分享图"}
          </button>
        </div>
        {exportError && <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-center text-xs text-rose-700" role="alert">{exportError}</p>}
        <p className="mt-3 text-center text-[11px] text-slate-600">隐私承诺：海报不会包含任何具体出生年月日或原始困惑。</p>
      </div>
    </div>
  );
}
