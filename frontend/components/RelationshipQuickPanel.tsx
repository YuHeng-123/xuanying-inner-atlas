"use client";

import { ArrowUpRight, History, RefreshCw, Share2, Trash2 } from "lucide-react";
import RiskTrend from "@/components/RiskTrend";
import type { RelationshipGroup, RiskLevel, StoredRelationship } from "@/lib/types";

interface Props { group: RelationshipGroup; selected: StoredRelationship; profileBasisOutdated: boolean; onViewDeep: () => void; onReanalyze: () => void; onShare: () => void; onDelete: () => void; }
const riskStyle: Record<RiskLevel, { label: string; className: string; dot: string }> = {
  GREEN: { label: "深度同盟", className: "text-emerald-300", dot: "bg-emerald-400" },
  YELLOW: { label: "保持观察", className: "text-[#dfbd79]", dot: "bg-[#d7ad63]" },
  RED: { label: "利益设防", className: "text-rose-300", dot: "bg-rose-400" },
};
const metrics = [["trust_cap", "信任"], ["synergy", "协同"], ["drain_rate", "损耗"], ["friction", "对抗"], ["stickiness", "羁绊"]] as const;

export default function RelationshipQuickPanel({ group, selected, profileBasisOutdated, onViewDeep, onReanalyze, onShare, onDelete }: Props) {
  const risk = riskStyle[selected.risk_level];
  const timeScenarios = selected.analysis.time_scenarios;
  const actions = selected.report.defense_strategies.slice(0, 3);
  const trend = group.history.map((entry) => ({ id: entry.id, riskLevel: entry.risk_level, createdAt: entry.createdAt }));
  const date = new Date(selected.updatedAt || selected.createdAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
  return <aside data-risk={selected.risk_level} className="decision-panel animate-float-in flex h-full min-h-[520px] flex-col rounded-[30px] p-5 sm:p-7" aria-labelledby="quick-panel-title">
    <div className="flex items-start justify-between gap-3"><div><p className="section-kicker">当前关系</p><h2 id="quick-panel-title" className="mt-2 font-display text-2xl font-medium text-stone-100">{selected.targetName}</h2><p className="mt-1 text-xs text-stone-500">{selected.relationshipType} · {date}</p></div><button onClick={onDelete} className="rounded-full p-2 text-stone-600 transition hover:bg-rose-400/10 hover:text-rose-300" aria-label={`删除 ${selected.targetName} 的全部档案`}><Trash2 className="h-4 w-4" /></button></div>
    {profileBasisOutdated && <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-3.5 py-3 text-xs leading-5 text-amber-100/85" role="status"><p className="font-semibold">此报告基于旧版本人出生资料</p><p className="mt-1 text-amber-100/65">历史结果不会随底牌修改自动重算。需要更新时，点击下方“重新测算”。</p></div>}
    <div className={`mt-6 flex items-center gap-2 text-sm font-medium ${risk.className}`}><span className={`h-2 w-2 rounded-full ${risk.dot}`} /><span>{timeScenarios ? `六字参考盘 · ${risk.label}` : risk.label}</span><span className="ml-auto font-mono text-[10px] tracking-widest text-stone-600">{selected.risk_level}</span></div>
    {timeScenarios && <div className="mt-3 rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-3 text-[11px] leading-5 text-stone-400"><p>时辰未知，时柱相关结果存在范围：</p><p className="mt-1 text-stone-300">相对有利 {riskStyle[timeScenarios.best_case.interaction.risk_level].label} · 相对谨慎 {riskStyle[timeScenarios.worst_case.interaction.risk_level].label}</p><p className="mt-1 text-stone-600">下方断语与五维数值仍是六字参考盘，不是范围结论。</p></div>}
    <blockquote className="mt-5 border-l border-[#d7ad63]/50 pl-4 text-[17px] font-medium leading-8 text-stone-200">“{selected.report.one_sentence_verdict}”</blockquote>
    <div className="mt-6 grid grid-cols-5 gap-2 border-y border-white/[0.06] py-4">{metrics.map(([key, label]) => <div key={key} className="text-center"><p className="text-[10px] text-stone-600">{label}</p><p className="mt-1 font-mono text-sm text-stone-300">{selected.metrics[key]}</p><div className="metric-track mx-auto mt-2 w-full"><div className="metric-fill" style={{ width: `${selected.metrics[key]}%` }} /></div></div>)}</div>
    <div className="mt-5"><p className="text-xs font-medium text-stone-300">现在先做</p><ol className="mt-3 space-y-3">{actions.map((action, index) => <li key={action} className="flex gap-3 text-xs leading-5 text-stone-400"><span className="mt-0.5 font-mono text-[#d7ad63]">{index + 1}</span><span>{action}</span></li>)}</ol></div>
    <div className="mt-auto pt-6"><div className="mb-4 flex items-center gap-2 text-[11px] text-stone-600"><History className="h-3.5 w-3.5" />{group.history.length} 次研判<RiskTrend points={trend} compact /></div><button onClick={onViewDeep} className="gold-button flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold">查看完整判断<ArrowUpRight className="h-4 w-4" /></button><div className="mt-2 grid grid-cols-2 gap-2"><button onClick={onReanalyze} className="quiet-button"><RefreshCw className="h-3.5 w-3.5" />重新测算</button><button onClick={onShare} className="quiet-button"><Share2 className="h-3.5 w-3.5" />脱敏分享</button></div></div>
  </aside>;
}
