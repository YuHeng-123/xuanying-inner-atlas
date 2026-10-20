"use client";

import { ArrowRight, Copy, ShieldAlert } from "lucide-react";
import { useState } from "react";
import type { AnalysisResponse, RiskLevel, TimeScenarioComparison } from "@/lib/types";

interface Props { analysis: AnalysisResponse; profileBasisOutdated: boolean; onExpand: () => void; }
const riskStyle: Record<RiskLevel, { label: string; className: string }> = {
  GREEN: { label: "深度同盟", className: "text-emerald-300 bg-emerald-400/10" },
  YELLOW: { label: "保持观察", className: "text-[#dfbd79] bg-[#d7ad63]/10" },
  RED: { label: "利益设防", className: "text-rose-300 bg-rose-400/10" },
};

function scenarioLabel(scenario: TimeScenarioComparison["best_case"], title: string) {
  const risk = riskStyle[scenario.interaction.risk_level];
  return <div className="rounded-xl border border-white/[0.07] bg-black/15 p-3">
    <p className="text-[10px] text-stone-500">{title} · {scenario.label}</p>
    <p className={`mt-1 text-sm font-semibold ${risk.className.split(" ")[0]}`}>{risk.label}<span className="ml-2 font-mono text-[10px] opacity-70">{scenario.interaction.risk_level}</span></p>
    <p className="mt-1 text-[10px] text-stone-500">规则风险压力 {scenario.interaction.risk_pressure.toFixed(1)}</p>
  </div>;
}

export default function ReportSummary({ analysis, profileBasisOutdated, onExpand }: Props) {
  const [copied, setCopied] = useState(false);
  const { report, interaction } = analysis;
  const scenarios = analysis.time_scenarios;
  const quote = report.social_quotes[0] ?? "我们先把目标、边界和下一步写清楚。";
  const copyQuote = async () => { try { await navigator.clipboard.writeText(quote); setCopied(true); window.setTimeout(() => setCopied(false), 1500); } catch { setCopied(false); } };
  return <section id="summary" className="brief-panel scroll-mt-5 rounded-[30px] p-6 sm:p-8" aria-labelledby="summary-title">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div className="max-w-3xl"><div className="flex flex-wrap items-center gap-3"><p className="section-kicker">关系判断</p><span className={`rounded-full px-3 py-1 text-[11px] ${riskStyle[interaction.risk_level].className}`}>{scenarios ? `六字参考盘 · ${riskStyle[interaction.risk_level].label}` : riskStyle[interaction.risk_level].label}</span><span className="rounded-full border border-slate-700 bg-slate-950/35 px-2.5 py-1 text-[10px] text-slate-400">指标：规则计算 · 报告：{analysis.report_source === "MOCK" ? "MOCK 示例" : "AI 解读"}</span></div><h2 id="summary-title" className="mt-4 font-display text-2xl font-medium text-stone-100">{report.relationship_archetype}</h2><p className="mt-3 text-lg leading-8 text-stone-300">“{report.one_sentence_verdict}”</p>{scenarios && <p className="mt-3 text-xs leading-5 text-amber-200/75">出生时辰未知：上面的原型、断语与等级仅基于不含时柱的六字参考盘，不代表所有时辰。下方并列展示规则推演的相对有利端与谨慎端。</p>}</div><button onClick={onExpand} className="quiet-button shrink-0 px-4 py-2.5">深入查看<ArrowRight className="h-4 w-4" /></button></div>
    {scenarios && <div className="mt-6 grid gap-3 border-t border-white/[0.06] pt-5 sm:grid-cols-2">{scenarioLabel(scenarios.best_case, "相对有利端")}{scenarioLabel(scenarios.worst_case, "相对谨慎端")}</div>}
    {profileBasisOutdated && <p className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-xs leading-5 text-amber-100/80" role="status">本报告依据旧版本人出生资料生成；修改底牌不会自动改变历史结论。请重新测算以生成新版本。</p>}
    <div className="mt-7 grid gap-6 border-t border-white/[0.06] pt-6 lg:grid-cols-[.8fr_1.2fr]"><div><p className="flex items-center gap-2 text-xs text-rose-300"><ShieldAlert className="h-3.5 w-3.5" />最需要防范</p><p className="mt-2 text-sm leading-6 text-stone-400">{interaction.risk_reasons[0] ?? "关键事项出现模糊时，用事实和边界把讨论拉回正轨。"}</p></div><div><p className="text-xs text-[#dfbd79]">可直接使用的话</p><div className="mt-2 flex items-start justify-between gap-4"><p className="text-sm leading-6 text-stone-300">“{quote}”</p><button onClick={copyQuote} className="shrink-0 rounded-full p-2 text-stone-500 transition hover:bg-white/[0.05] hover:text-[#dfbd79]" aria-label="复制推荐话术"><Copy className="h-4 w-4" /><span className="sr-only">{copied ? "已复制" : "复制"}</span></button></div></div></div>
  </section>;
}
