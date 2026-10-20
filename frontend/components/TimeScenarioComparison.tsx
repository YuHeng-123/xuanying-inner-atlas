"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronDown, Info, TableProperties } from "lucide-react";

import type { RiskLevel, TimeScenarioComparison as Comparison, TimeScenarioPoint, TimeScenarioSummary } from "@/lib/types";

interface Props {
  comparison: Comparison;
}

const dimensions = [
  ["trust_cap", "信任"],
  ["synergy", "协同"],
  ["drain_rate", "损耗"],
  ["friction", "摩擦"],
  ["stickiness", "羁绊"],
] as const;

const riskStyles: Record<RiskLevel, { label: string; className: string; dot: string }> = {
  GREEN: { label: "相对低压", className: "scenario-green", dot: "bg-emerald-500" },
  YELLOW: { label: "中度观察", className: "scenario-amber", dot: "bg-amber-500" },
  RED: { label: "相对高压", className: "scenario-rose", dot: "bg-rose-500" },
};

function hourLabel(hour: number, branch: string): string {
  if (hour === 0) return "子时 · 00:00–01:00段";
  if (hour === 23) return "子时 · 23:00–00:00段（换日界）";
  return `${branch}时 · ${String(hour).padStart(2, "0")}:00`;
}

function assumedTime(point: TimeScenarioPoint, side: "user" | "target", isUnknown: boolean): string {
  if (!isUnknown) return "按已知时辰";
  return hourLabel(point.assumed_hours[side], point.assumed_branches[side]);
}

function ScenarioCard({ point, title, side, comparison }: { point: TimeScenarioPoint; title: string; side: "best" | "worst"; comparison: Comparison }) {
  const risk = riskStyles[point.interaction.risk_level];
  const userUnknown = comparison.mode !== "target_unknown";
  const targetUnknown = comparison.mode !== "user_unknown";
  const isPositive = side === "best";
  const Icon = isPositive ? ArrowDownRight : ArrowUpRight;
  const relations = point.interaction.branch_relations.slice(0, 3);

  return (
    <article className={`scenario-card ${isPositive ? "scenario-card-best" : "scenario-card-worst"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className={`scenario-icon ${isPositive ? "scenario-icon-best" : "scenario-icon-worst"}`}><Icon className="h-4 w-4" /></span>
          <div>
            <p className="text-xs font-semibold text-slate-900">{title}</p>
            <p className="mt-1 text-[11px] text-slate-500">{point.label}</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${risk.className}`}>
          <i className={`h-1.5 w-1.5 rounded-full ${risk.dot}`} />{risk.label} · {point.interaction.risk_pressure}
        </span>
      </div>

      <div className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-3 text-[11px] sm:grid-cols-2">
        <p className="text-slate-600">我方：<span className="font-medium text-slate-800">{assumedTime(point, "user", userUnknown)}</span></p>
        <p className="text-slate-600">对方：<span className="font-medium text-slate-800">{assumedTime(point, "target", targetUnknown)}</span></p>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-2">
        {dimensions.map(([key, label]) => {
          const value = point.interaction.dimensions[key];
          const isStrain = key === "drain_rate" || key === "friction";
          return (
            <div key={key} className="min-w-0 text-center">
              <p className="truncate text-[9px] text-slate-500">{label}</p>
              <p className={`mt-1 font-mono text-sm font-semibold ${isStrain ? "text-rose-600" : "text-slate-800"}`}>{value}</p>
              <div className="metric-track mt-1.5"><div className={`metric-fill ${isStrain ? "metric-fill-strain" : "metric-fill-capability"}`} style={{ width: `${value}%` }} /></div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 border-t border-slate-200 pt-3">
        <p className="text-[10px] font-semibold text-slate-600">触发本次比较的结构</p>
        <p className="mt-1.5 text-xs leading-5 text-slate-600">
          {relations.length ? relations.map((relation) => `${relation.name}（${relation.branches}）`).join("、") : `日主十神：${point.interaction.ten_god}；本情境没有额外地支关系提示。`}
        </p>
      </div>
    </article>
  );
}

export default function TimeScenarioComparison({ comparison }: Props) {
  const [mobileCase, setMobileCase] = useState<"best" | "worst">("best");
  const [showAll, setShowAll] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const bestRisk = riskStyles[comparison.best_case.interaction.risk_level];
  const worstRisk = riskStyles[comparison.worst_case.interaction.risk_level];
  const allScenarios = useMemo(() => comparison.all_scenarios ?? [], [comparison.all_scenarios]);
  const hourKeys = useMemo(() => Array.from(new Set(allScenarios.map((item) =>
    comparison.mode === "target_unknown" ? item.assumed_hours.target : item.assumed_hours.user))).sort((a, b) => a - b), [allScenarios, comparison.mode]);
  const selectedScenario = allScenarios.find((item) => `${item.assumed_hours.user}-${item.assumed_hours.target}` === selectedKey) ?? null;
  const scenarioColor = (risk: RiskLevel) => risk === "GREEN" ? "bg-emerald-500" : risk === "YELLOW" ? "bg-amber-400" : "bg-rose-500";
  const scenarioAriaLabel = (item: TimeScenarioSummary) => `${item.label}，${riskStyles[item.risk_level].label}，风险压力 ${item.risk_pressure}`;

  return (
    <section className="surface-panel rounded-3xl p-5 sm:p-6" aria-labelledby="time-scenario-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="section-kicker">UNKNOWN HOUR / 时辰范围推演</p>
          <h2 id="time-scenario-title" className="mt-1.5 text-lg font-semibold text-slate-900">把两端可能性并排看</h2>
          <p className="mt-1 text-xs text-slate-500">已比较 {comparison.candidate_count} 组假设，按同一套五维启发指标排序。</p>
        </div>
        <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-[10px] font-medium text-sky-800">12 个传统时辰 · 子时单独核对日界</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 md:hidden" role="tablist" aria-label="选择时辰推演参考">
        <button
          type="button"
          role="tab"
          aria-selected={mobileCase === "best"}
          onClick={() => setMobileCase("best")}
          className={`rounded-xl border px-3 py-2.5 text-left transition ${mobileCase === "best" ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"}`}
        >
          <span className="block text-xs font-semibold text-slate-800">相对有利</span>
          <span className={`mt-1 flex items-center gap-1.5 text-[10px] ${bestRisk.className}`}><i className={`h-1.5 w-1.5 rounded-full ${bestRisk.dot}`} />{bestRisk.label} · {comparison.best_case.interaction.risk_pressure}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileCase === "worst"}
          onClick={() => setMobileCase("worst")}
          className={`rounded-xl border px-3 py-2.5 text-left transition ${mobileCase === "worst" ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-white"}`}
        >
          <span className="block text-xs font-semibold text-slate-800">相对谨慎</span>
          <span className={`mt-1 flex items-center gap-1.5 text-[10px] ${worstRisk.className}`}><i className={`h-1.5 w-1.5 rounded-full ${worstRisk.dot}`} />{worstRisk.label} · {comparison.worst_case.interaction.risk_pressure}</span>
        </button>
      </div>

      <div className="mt-3 md:hidden" role="tabpanel">
        {mobileCase === "best" ? (
          <ScenarioCard point={comparison.best_case} comparison={comparison} side="best" title="对你相对有利的假设" />
        ) : (
          <ScenarioCard point={comparison.worst_case} comparison={comparison} side="worst" title="对你相对需要留意的假设" />
        )}
      </div>

      <div className="mt-4 hidden gap-3 md:grid xl:grid-cols-2">
        <ScenarioCard point={comparison.best_case} comparison={comparison} side="best" title="对你相对有利的假设" />
        <ScenarioCard point={comparison.worst_case} comparison={comparison} side="worst" title="对你相对需要留意的假设" />
      </div>

      <p className="mt-4 flex gap-2 rounded-xl bg-slate-50 px-3.5 py-3 text-[11px] leading-5 text-slate-600">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600" />
        {comparison.ranking_method} {comparison.day_boundary_note} 这只是规则内的相对比较，不是对方真实时辰、现实冲突概率或命运结论。
      </p>

      {allScenarios.length > 0 && <div className="mt-4 border-t border-slate-100 pt-4">
        <h3 className="text-xs font-semibold text-slate-800">稳定提醒与时辰敏感点</h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3"><p className="text-[10px] font-semibold text-emerald-900">所有代表时刻都出现</p>{comparison.common_warnings?.length ? <ul className="mt-1.5 space-y-1">{comparison.common_warnings.map((warning) => <li key={warning.text} className="text-[10px] leading-5 text-emerald-950/80">• {warning.text}</li>)}</ul> : <p className="mt-1.5 text-[10px] leading-5 text-emerald-950/75">没有一条风险提示在全部组合里完全相同；先把它视为待观察，而非坏消息。</p>}</div>
          <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-3"><p className="text-[10px] font-semibold text-amber-950">部分代表时刻出现</p>{comparison.time_sensitive_warnings?.length ? <ul className="mt-1.5 space-y-1">{comparison.time_sensitive_warnings.slice(0, 4).map((warning) => <li key={warning.text} className="text-[10px] leading-5 text-amber-950/80">• {warning.text} <span className="opacity-70">({warning.count}/{allScenarios.length} 组)</span></li>)}</ul> : <p className="mt-1.5 text-[10px] leading-5 text-amber-950/75">当前没有额外的时辰敏感提示。</p>}</div>
        </div>
        <button type="button" aria-expanded={showAll} onClick={() => setShowAll((value) => !value)} className="secondary-button mt-3 inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold"><TableProperties className="h-3.5 w-3.5" />{showAll ? "收起全景" : `查看全部代表时刻组合（${allScenarios.length}）`}<ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAll ? "rotate-180" : ""}`} /></button>
        {showAll && <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
          {comparison.mode === "both_unknown" ? <>
            <p className="mb-3 text-[10px] leading-5 text-slate-500">行是我方假设，列是对方假设。点选格子查看对应五维与提示；子时的 00:00 和 23:00 分开列出。</p>
            <div className="overflow-x-auto pb-2"><div className="grid min-w-[600px] gap-1" style={{ gridTemplateColumns: `52px repeat(${hourKeys.length}, minmax(30px, 1fr))` }}>
              <span className="flex items-center justify-center text-[9px] text-slate-500">我方 ↓ / 对方 →</span>
              {hourKeys.map((hour) => <span key={`th-${hour}`} className="flex items-center justify-center text-[9px] text-slate-500">{hourLabel(hour, allScenarios.find((item) => item.assumed_hours.target === hour)?.assumed_branches.target ?? "")}</span>)}
              {hourKeys.map((userHour) => <div key={`row-${userHour}`} className="contents">
                <span className="flex items-center justify-center text-[9px] text-slate-500">{hourLabel(userHour, allScenarios.find((item) => item.assumed_hours.user === userHour)?.assumed_branches.user ?? "")}</span>
                {hourKeys.map((targetHour) => {
                  const item = allScenarios.find((candidate) => candidate.assumed_hours.user === userHour && candidate.assumed_hours.target === targetHour);
                  if (!item) return <span key={`empty-${userHour}-${targetHour}`} className="h-8 rounded-md bg-slate-50" />;
                  const key = `${userHour}-${targetHour}`;
                  const active = selectedKey === key;
                  return <button key={key} type="button" onClick={() => setSelectedKey(key)} title={scenarioAriaLabel(item)} aria-label={scenarioAriaLabel(item)} aria-pressed={active} className={`h-8 rounded-md ${scenarioColor(item.risk_level)} transition hover:scale-105 ${active ? "ring-2 ring-slate-900 ring-offset-1" : "opacity-70 hover:opacity-100"}`} />;
                })}
              </div>)}
            </div></div>
            <div className="mt-2 flex flex-wrap gap-3 text-[9px] text-slate-500"><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-emerald-500" />相对低压</span><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-amber-400" />中度观察</span><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-rose-500" />相对高压</span></div>
          </> : <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{allScenarios.map((item) => {
            const hour = comparison.mode === "target_unknown" ? item.assumed_hours.target : item.assumed_hours.user;
            const branch = comparison.mode === "target_unknown" ? item.assumed_branches.target : item.assumed_branches.user;
            const key = `${item.assumed_hours.user}-${item.assumed_hours.target}`;
            return <button key={key} type="button" onClick={() => setSelectedKey(key)} aria-pressed={selectedKey === key} className={`rounded-xl border p-3 text-left transition ${selectedKey === key ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}><span className="flex items-center justify-between gap-2"><b className="text-[11px] text-slate-800">{hourLabel(hour, branch)}</b><i className={`h-2 w-2 rounded-full ${scenarioColor(item.risk_level)}`} /></span><span className="mt-1 block text-[10px] text-slate-500">{riskStyles[item.risk_level].label} · 压力 {item.risk_pressure}</span></button>;
          })}</div>}
          {selectedScenario && <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3.5"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold text-slate-900">{selectedScenario.label}</p><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${riskStyles[selectedScenario.risk_level].className}`}>{riskStyles[selectedScenario.risk_level].label} · {selectedScenario.risk_pressure}</span></div><div className="mt-3 grid grid-cols-5 gap-2">{dimensions.map(([key, label]) => <div key={key} className="text-center"><p className="text-[9px] text-slate-500">{label}</p><p className="mt-1 font-mono text-xs font-semibold text-slate-800">{selectedScenario.dimensions[key]}</p></div>)}</div><p className="mt-3 text-[10px] leading-5 text-slate-600">{selectedScenario.risk_reasons.join("；")}</p></div>}
          <p className="mt-3 text-[9px] leading-4 text-slate-500">全景表只呈现算法假设下的相对差异，不代表现实风险概率。若档案来自旧版本，仅保存了两端结果，可能没有可回放的全量组合。</p>
        </div>}
      </div>}
    </section>
  );
}
