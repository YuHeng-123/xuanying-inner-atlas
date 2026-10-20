"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Check, CircleAlert, Clock3, FileText, LockKeyhole, Quote, ShieldCheck, X } from "lucide-react";

import RadarChart from "@/components/RadarChart";
import type { RiskLevel, StoredRelationship } from "@/lib/types";

interface RelationshipDetailDrawerProps {
  relationship: StoredRelationship | null;
  onClose: () => void;
  onShare: (relationship: StoredRelationship) => void;
}

const riskCopy: Record<RiskLevel, { label: string; className: string; color: string }> = {
  RED: { label: "RED / 利益设防", className: "border-rose-500/30 bg-rose-500/10 text-rose-300", color: "text-rose-400" },
  YELLOW: { label: "YELLOW / 公事公办", className: "border-amber-400/30 bg-amber-400/10 text-amber-300", color: "text-amber-400" },
  GREEN: { label: "GREEN / 深度同盟", className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300", color: "text-emerald-400" },
};

export default function RelationshipDetailDrawer({ relationship, onClose, onShare }: RelationshipDetailDrawerProps) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!relationship) return;
    setEntered(false);
    const frame = window.requestAnimationFrame(() => setEntered(true));
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, relationship]);

  if (!relationship) return null;

  const { analysis } = relationship;
  const { report, interaction } = analysis;
  const risk = riskCopy[relationship.risk_level];
  const savedDate = new Date(relationship.createdAt);
  const savedLabel = Number.isNaN(savedDate.getTime()) ? "本地档案" : savedDate.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });

  return (
    <div className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="drawer-title" onClick={onClose}>
      <aside className={`absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-white shadow-2xl shadow-slate-900/15 transition-transform duration-500 ease-out ${entered ? "translate-x-0" : "translate-x-full"}`} onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-5 sm:px-7"><div><p className="eyebrow">NODE DETAIL / 关系档案</p><div className="mt-2 flex flex-wrap items-center gap-3"><h2 id="drawer-title" className="text-2xl font-semibold text-slate-100">{relationship.targetName}</h2><span className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-400">{relationship.relationshipType}</span></div><p className="mt-2 flex items-center gap-2 text-[11px] text-slate-600"><Clock3 className="h-3.5 w-3.5" />本地档案 · {savedLabel} · 不上传</p></div><div className="flex items-center gap-2"><button onClick={() => onShare(relationship)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-slate-100"><ArrowUpRight className="h-3.5 w-3.5" />分享</button><button onClick={onClose} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-800 hover:text-slate-200" aria-label="关闭关系详情"><X className="h-5 w-5" /></button></div></div>

        <div className="no-scrollbar flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          <div className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${risk.className}`}><span className="text-[10px] font-bold uppercase tracking-[0.18em]">{risk.label}</span><span className="font-mono text-xs">pressure {interaction.risk_pressure}</span></div>
          <div className="mt-5 rounded-3xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5"><RadarChart interaction={interaction} /></div>

          <section className="mt-5 rounded-3xl border border-slate-800 bg-slate-900/60 p-5"><p className="eyebrow">RELATION ARCHETYPE</p><h3 className="mt-2 text-xl font-semibold text-slate-100">{report.relationship_archetype}</h3><p className="mt-4 text-base leading-7 text-slate-300">“{report.one_sentence_verdict}”</p><div className="mt-4 flex flex-wrap gap-2 text-xs"><span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-slate-400">对方日主十神：{interaction.ten_god}</span><span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-slate-400">记录完整报告</span></div></section>

          <section className="mt-5"><div className="flex items-center gap-2"><CircleAlert className={`h-4 w-4 ${risk.color}`} /><h3 className="text-lg font-semibold text-slate-100">避险情境</h3></div><div className="mt-3 space-y-3">{report.risk_situations.map((situation, index) => <article key={`${situation}-${index}`} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-600">TRIGGER 0{index + 1}</p><p className="mt-2 text-sm leading-6 text-slate-300">{situation}</p><div className="mt-3 flex gap-2 border-t border-slate-800 pt-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /><p className="text-xs leading-5 text-emerald-100/70">{report.defense_strategies[index % Math.max(report.defense_strategies.length, 1)]}</p></div></article>)}</div></section>

          <section className="mt-5 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.035] p-4"><h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-300"><Check className="h-4 w-4" />必做准则</h3><ul className="mt-3 space-y-2">{report.dos.map((item) => <li key={item} className="text-xs leading-5 text-slate-400">· {item}</li>)}</ul></div><div className="rounded-2xl border border-rose-500/15 bg-rose-500/[0.035] p-4"><h3 className="flex items-center gap-2 text-sm font-semibold text-rose-300"><X className="h-4 w-4" />绝对禁区</h3><ul className="mt-3 space-y-2">{report.donts.map((item) => <li key={item} className="text-xs leading-5 text-slate-400">· {item}</li>)}</ul></div></section>

          <section className="mt-5 rounded-3xl border border-amber-400/15 bg-amber-400/[0.035] p-5"><p className="eyebrow">LONG GAME / 长线策略</p><ol className="mt-4 space-y-3">{report.long_term_strategy.map((item, index) => <li key={item} className="flex gap-3 text-sm leading-6 text-slate-400"><span className="font-mono text-amber-400">0{index + 1}</span>{item}</li>)}</ol><div className="mt-5 border-t border-amber-400/10 pt-4"><p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-400"><Quote className="h-3.5 w-3.5" />社交金句</p><p className="mt-2 text-sm leading-6 text-amber-50/75">{report.social_quotes[0]}</p></div></section>

          <p className="mt-5 flex gap-2 text-[11px] leading-5 text-slate-600"><LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" />完整报告已保存在本设备的 relationships_history 列表中；删除浏览器本地数据后将无法恢复。</p>
        </div>
      </aside>
    </div>
  );
}
