"use client";

import { useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  LoaderCircle,
  MessageSquareText,
  Sparkles,
  UserRound,
} from "lucide-react";

import type { DualFormValues, RelationshipType } from "@/lib/types";

const relationshipOptions: RelationshipType[] = ["直属领导", "平级同事", "合伙人", "朋友", "相亲对象"];
const hourOptions = Array.from({ length: 24 }, (_, hour) => hour);

interface DualInputCardProps {
  initialValues: DualFormValues;
  isLoading: boolean;
  onSubmit: (values: DualFormValues) => void | Promise<void>;
}

function HourSelect({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="input-shell">
      <Clock3 className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} aria-label="出生时辰">
        <option value="">时辰未知（六字）</option>
        {hourOptions.map((hour) => (
          <option key={hour} value={hour}>
            {String(hour).padStart(2, "0")} : 00
          </option>
        ))}
      </select>
    </div>
  );
}

export default function DualInputCard({ initialValues, isLoading, onSubmit }: DualInputCardProps) {
  const [values, setValues] = useState<DualFormValues>(initialValues);

  const update = <K extends keyof DualFormValues>(key: K, value: DualFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onSubmit(values);
  };

  return (
    <section className="glass-panel relative overflow-hidden rounded-3xl" aria-labelledby="input-station-title">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/70 to-transparent" />
      <div className="flex flex-col gap-3 border-b border-slate-800/80 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div>
          <p className="eyebrow">01 / 双人信息对决输入台</p>
          <h2 id="input-station-title" className="mt-2 font-display text-xl font-semibold tracking-tight text-slate-100">
            把模糊的直觉，交给一套可回溯的关系坐标
          </h2>
        </div>
        <div className="flex items-center gap-2 self-start rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5 text-[11px] text-emerald-300 sm:self-auto">
          <span className="animate-pulse-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
          输入端已加密脱敏
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 sm:p-7">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
          <div className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.035] p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-400">我方底牌</p>
                <p className="mt-1 text-xs text-slate-500">先校准自己的出牌风格</p>
              </div>
              <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-2 text-amber-300">
                <UserRound className="h-4 w-4" aria-hidden="true" />
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-medium text-slate-400">怎么称呼你 <span className="text-rose-400">*</span></span>
                <div className="input-shell">
                  <UserRound className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                  <input
                    required
                    value={values.userName}
                    onChange={(event) => update("userName", event.target.value)}
                    placeholder="例如：林默"
                    maxLength={30}
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-medium text-slate-400">出生年月日 <span className="text-rose-400">*</span></span>
                <div className="input-shell">
                  <CalendarDays className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                  <input
                    required
                    type="date"
                    value={values.userDate}
                    onChange={(event) => update("userDate", event.target.value)}
                    aria-label="我方出生年月日"
                  />
                </div>
              </label>

              <div>
                <span className="mb-2 block text-xs font-medium text-slate-400">出生时辰 <span className="text-slate-600">· 选填</span></span>
                <HourSelect id="user-hour" value={values.userHour} onChange={(value) => update("userHour", value)} />
                <p className="mt-2 text-[11px] leading-5 text-slate-600">不确定也没关系，将按六字信息研判。</p>
              </div>
            </div>
          </div>

          <div className="relative hidden items-center justify-center lg:flex" aria-hidden="true">
            <div className="h-full w-px bg-gradient-to-b from-transparent via-slate-700 to-transparent" />
            <div className="absolute rounded-full border border-slate-700 bg-slate-950 p-2 text-slate-500 shadow-2xl">
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>

          <div className="rounded-2xl border border-rose-500/15 bg-rose-500/[0.035] p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-400">对方信息</p>
                <p className="mt-1 text-xs text-slate-500">读懂局势，不预判人心</p>
              </div>
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-2 text-rose-300">
                <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-medium text-slate-400">对方称呼 <span className="text-rose-400">*</span></span>
                <div className="input-shell">
                  <UserRound className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                  <input
                    required
                    value={values.targetName}
                    onChange={(event) => update("targetName", event.target.value)}
                    placeholder="例如：周总 / Alex"
                    maxLength={30}
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-medium text-slate-400">关系类型 <span className="text-rose-400">*</span></span>
                <div className="input-shell">
                  <BriefcaseBusiness className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                  <select value={values.relationshipType} onChange={(event) => update("relationshipType", event.target.value as RelationshipType)}>
                    {relationshipOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-medium text-slate-400">出生年月日 <span className="text-rose-400">*</span></span>
                  <div className="input-shell">
                    <CalendarDays className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                    <input
                      required
                      type="date"
                      value={values.targetDate}
                      onChange={(event) => update("targetDate", event.target.value)}
                      aria-label="对方出生年月日"
                    />
                  </div>
                </label>
                <div>
                  <span className="mb-2 block text-xs font-medium text-slate-400">出生时辰 <span className="text-slate-600">· 选填</span></span>
                  <HourSelect id="target-hour" value={values.targetHour} onChange={(value) => update("targetHour", value)} />
                </div>
              </div>

              <label className="block">
                <span className="mb-2 block text-xs font-medium text-slate-400">相处困惑 / 备注 <span className="text-slate-600">· 选填</span></span>
                <div className="input-shell items-start">
                  <MessageSquareText className="mt-3 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                  <textarea
                    value={values.concern}
                    onChange={(event) => update("concern", event.target.value)}
                    placeholder="最近发生了什么？你最想看清哪一个局面？"
                    rows={3}
                    maxLength={4000}
                    className="resize-none"
                  />
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center justify-between gap-4 border-t border-slate-800/80 pt-6 sm:flex-row">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Sparkles className="h-4 w-4 text-amber-400" aria-hidden="true" />
            <span>五维量化 · 关系原型 · 可执行避险策略</span>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="shine-button inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-400/10 disabled:cursor-wait disabled:opacity-70 sm:w-auto"
          >
            {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
            {isLoading ? "正在读取关系坐标…" : "开始人际合盘与避险研判"}
          </button>
        </div>
      </form>
    </section>
  );
}
