"use client";

import { Info, Scale } from "lucide-react";

import type { DimensionKey, InteractionResult } from "@/lib/types";

interface ScoreExplanationProps {
  interaction: InteractionResult;
}

const dimensions: Array<{ key: DimensionKey; label: string; meaning: string }> = [
  { key: "trust_cap", label: "信任上限", meaning: "分数越高，越适合通过透明沟通建立稳定预期。" },
  { key: "synergy", label: "利益协同", meaning: "分数越高，越容易在资源、目标和交付上形成合力。" },
  { key: "drain_rate", label: "情绪损耗", meaning: "分数越高，越需要控制沟通频率、承诺范围和恢复空间。" },
  { key: "friction", label: "权力对抗", meaning: "分数越高，越应提前划清职责、决策权和署名规则。" },
  { key: "stickiness", label: "长远羁绊", meaning: "分数越高，关系的长期惯性和相互牵连越强。" },
];

function modifierFor(key: DimensionKey, modifiers: Array<Record<string, unknown>>): string | null {
  const contributions = modifiers.flatMap((modifier) => {
    const deltas = modifier.deltas;
    const delta = deltas && typeof deltas === "object" ? (deltas as Record<string, unknown>)[key] : undefined;
    if (typeof delta !== "number" || !Number.isFinite(delta) || delta === 0) return [];
    const formatted = Number.isInteger(delta) ? String(Math.abs(delta)) : String(Number(Math.abs(delta).toFixed(2)));
    return [`${String(modifier.source ?? "规则")} ${delta > 0 ? "+" : "−"}${formatted}`];
  });
  return contributions.length ? contributions.join(" · ") : null;
}

export default function ScoreExplanation({ interaction }: ScoreExplanationProps) {
  const relations = interaction.branch_relations.slice(0, 3).map((relation) => relation.name || relation.type).filter(Boolean);
  return (
    <section className="glass-panel rounded-3xl p-5 sm:p-7" aria-labelledby="score-explanation-title">
      <div className="flex items-start gap-3"><div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-2 text-amber-300"><Info className="h-5 w-5" /></div><div><p className="eyebrow">SCORE TRACE / 分数解释</p><h2 id="score-explanation-title" className="mt-1 text-lg font-semibold text-slate-100">为什么是这个分数</h2><p className="mt-1 text-xs leading-5 text-slate-500">依据十神关系“{interaction.ten_god}”与地支互动做方向性解释；没有明确加减项时不会虚构数值。</p></div></div>
      <div className="mt-6 space-y-3">
        {dimensions.map(({ key, label, meaning }) => {
          const score = interaction.dimensions[key];
          const modifier = modifierFor(key, interaction.modifiers_applied);
          const direction = score >= 70 ? "当前偏高" : score <= 39 ? "当前偏低" : "当前中等";
          return <article key={key} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="font-mono text-xl font-semibold text-amber-300">{score}</span><div><h3 className="text-sm font-semibold text-slate-200">{label}</h3><p className="mt-1 text-xs text-slate-600">{direction}</p></div></div>{modifier && <span title={modifier} className="inline-flex max-w-[55%] items-center gap-1 rounded-full border border-slate-700 px-2 py-1 font-mono text-[10px] leading-4 text-slate-300"><Scale className="h-3 w-3 shrink-0" /><span className="truncate">{modifier}</span></span>}</div><p className="mt-3 text-xs leading-5 text-slate-400">{meaning}</p><p className="mt-2 text-[11px] leading-5 text-slate-600">相关十神：{interaction.ten_god}。相关地支互动：{relations.length ? relations.join("、") : "未检测到需要单独提示的关系"}。</p></article>;
        })}
      </div>
    </section>
  );
}
