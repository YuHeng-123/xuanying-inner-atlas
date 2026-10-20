"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { CalendarClock, Check, ChevronDown, CirclePlus, MessageSquareText } from "lucide-react";

import { createPersonKey } from "@/lib/storage";
import type { RelationshipEvent, StoredRelationship } from "@/lib/types";

interface Props {
  relationship: StoredRelationship;
  events: RelationshipEvent[];
  onAdd: (event: RelationshipEvent) => boolean;
}

const respectOptions = [
  { value: "yes", label: "感到被尊重", style: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  { value: "mixed", label: "感受复杂", style: "border-amber-200 bg-amber-50 text-amber-800" },
  { value: "no", label: "感到不被尊重", style: "border-rose-200 bg-rose-50 text-rose-800" },
] as const;
type RespectFilter = "all" | RelationshipEvent["respect"];

function localDatetimeNow(): string {
  const now = new Date();
  const two = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}T${two(now.getHours())}:${two(now.getMinutes())}`;
}

function eventId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function RelationshipTimeline({ relationship, events, onAdd }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [reflection, setReflection] = useState("");
  const [occurredAtInput, setOccurredAtInput] = useState("");
  const [dateError, setDateError] = useState<string | null>(null);
  const [respect, setRespect] = useState<RelationshipEvent["respect"]>("mixed");
  const [filter, setFilter] = useState<RespectFilter>("all");
  const personKey = relationship.personKey || createPersonKey(relationship);
  const personEvents = useMemo(
    () => events.filter((event) => event.personKey === personKey).sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt)),
    [events, personKey],
  );
  const recentEvents = personEvents.slice(0, 5);
  const recentCounts = {
    yes: recentEvents.filter((item) => item.respect === "yes").length,
    mixed: recentEvents.filter((item) => item.respect === "mixed").length,
    no: recentEvents.filter((item) => item.respect === "no").length,
  };
  const visibleEvents = filter === "all" ? personEvents : personEvents.filter((item) => item.respect === filter);

  const toggleForm = () => {
    if (!formOpen) {
      setOccurredAtInput(localDatetimeNow());
      setDateError(null);
    }
    setFormOpen((open) => !open);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanSummary = summary.trim();
    if (!cleanSummary) return;
    const occurredAt = new Date(occurredAtInput);
    if (!occurredAtInput || !Number.isFinite(occurredAt.getTime()) || occurredAt.getTime() > Date.now()) {
      setDateError("请选择有效的互动时间，不能晚于现在。");
      return;
    }
    const saved = onAdd({
      id: eventId(),
      personKey,
      targetName: relationship.targetName,
      relationshipType: relationship.relationshipType,
      occurredAt: occurredAt.toISOString(),
      summary: cleanSummary,
      respect,
      ...(reflection.trim() ? { reflection: reflection.trim() } : {}),
    });
    if (!saved) return;
    setSummary("");
    setReflection("");
    setOccurredAtInput("");
    setDateError(null);
    setRespect("mixed");
    setFormOpen(false);
  };

  return (
    <section className="surface-panel rounded-3xl p-5 sm:p-6" aria-labelledby="relationship-timeline-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="section-kicker">REAL-LIFE NOTES / 现实互动记录</p>
          <h2 id="relationship-timeline-title" className="mt-1.5 text-lg font-semibold text-slate-900">和{relationship.targetName}的时间线</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">记事实和自己的感受，过段时间回看相处变化；笔记不会改变测算分数。</p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] text-slate-600">{personEvents.length} 条</span>
      </div>

      {recentEvents.length > 0 && <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-4" aria-label={`最近${recentEvents.length}次互动的主观感受`}>
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold text-slate-800">最近 {recentEvents.length} 次互动</p><span className="text-[10px] text-slate-500">按记录时间，展示你的感受</span></div>
        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-slate-200" role="img" aria-label={`感到被尊重 ${recentCounts.yes} 次，感受复杂 ${recentCounts.mixed} 次，感到不被尊重 ${recentCounts.no} 次`}>
          <span className="bg-emerald-500" style={{ width: `${recentCounts.yes / recentEvents.length * 100}%` }} /><span className="bg-amber-400" style={{ width: `${recentCounts.mixed / recentEvents.length * 100}%` }} /><span className="bg-rose-500" style={{ width: `${recentCounts.no / recentEvents.length * 100}%` }} />
        </div>
        <p className="mt-2 text-[11px] leading-5 text-slate-600">被尊重 {recentCounts.yes} · 感受复杂 {recentCounts.mixed} · 不被尊重 {recentCounts.no}</p>
        <p className="mt-1 text-[10px] leading-5 text-slate-500">这是你自己记录的感受，样本只取最近五条；请结合具体事件判断。</p>
      </div>}

      <button type="button" onClick={toggleForm} aria-expanded={formOpen} className="secondary-button mt-4 inline-flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-xs font-semibold">
        <span className="inline-flex items-center gap-2"><CirclePlus className="h-4 w-4 text-blue-600" />记录一次互动</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${formOpen ? "rotate-180" : ""}`} />
      </button>

      {formOpen && <form onSubmit={submit} className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
        <label className="block text-xs font-medium text-slate-700" htmlFor="event-time">互动发生时间</label>
        <input id="event-time" type="datetime-local" required value={occurredAtInput} min="1900-01-01T00:00" max={localDatetimeNow()} onChange={(event) => { setOccurredAtInput(event.target.value); setDateError(null); }} className="form-input mt-2 w-full rounded-xl px-3 py-2.5 text-sm" />
        {dateError && <p className="mt-1 text-xs text-rose-700" role="alert">{dateError}</p>}
        <label className="mt-3 block text-xs font-medium text-slate-700" htmlFor="event-summary">那次发生了什么？</label>
        <textarea id="event-summary" value={summary} onChange={(event) => setSummary(event.target.value)} maxLength={1000} required rows={3} placeholder="尽量记录可观察到的行为和原话，不用急着下结论。" className="form-input mt-2 min-h-24 w-full resize-y rounded-xl px-3 py-2.5 text-sm" />
        <fieldset className="mt-3">
          <legend className="text-xs font-medium text-slate-700">这次相处中，我感到被尊重吗？</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {respectOptions.map((option) => <button key={option.value} type="button" aria-pressed={respect === option.value} onClick={() => setRespect(option.value)} className={`rounded-full border px-3 py-2 text-[11px] font-medium transition ${respect === option.value ? option.style : "border-slate-200 bg-white text-slate-600"}`}>{option.label}</button>)}
          </div>
        </fieldset>
        <label className="mt-3 block text-xs font-medium text-slate-700" htmlFor="event-reflection">补充复盘（选填）</label>
        <input id="event-reflection" value={reflection} onChange={(event) => setReflection(event.target.value)} maxLength={1000} placeholder="下次我希望怎么沟通或设边界？" className="form-input mt-2 w-full rounded-xl px-3 py-2.5 text-sm" />
        <div className="mt-3 flex justify-end"><button type="submit" disabled={!summary.trim()} className="primary-button inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold disabled:opacity-45"><Check className="h-3.5 w-3.5" />保存到本机</button></div>
      </form>}

      {personEvents.length > 0 && <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="按感受筛选互动记录">
        {([ { value: "all", label: `全部 ${personEvents.length}` }, ...respectOptions.map((item) => ({ value: item.value, label: `${item.label} ${personEvents.filter((event) => event.respect === item.value).length}` })) ] as Array<{ value: RespectFilter; label: string }>).map((item) => <button key={item.value} type="button" aria-pressed={filter === item.value} onClick={() => setFilter(item.value)} className={`rounded-full border px-3 py-1.5 text-[11px] transition ${filter === item.value ? "border-blue-300 bg-blue-50 font-semibold text-blue-800" : "border-slate-200 bg-white text-slate-600 hover:border-blue-200"}`}>{item.label}</button>)}
      </div>}

      {personEvents.length ? visibleEvents.length ? <ol className="mt-4 space-y-3">
        {visibleEvents.map((item) => {
          const mood = respectOptions.find((option) => option.value === item.respect) ?? respectOptions[1];
          return <li key={item.id} className="relative rounded-2xl border border-slate-200 bg-white p-4">
            <span className="absolute -left-[5px] top-5 h-2 w-2 rounded-full bg-blue-500 ring-4 ring-white" />
            <div className="flex flex-wrap items-center justify-between gap-2"><time className="inline-flex items-center gap-1.5 text-[10px] text-slate-500"><CalendarClock className="h-3.5 w-3.5" />{new Date(item.occurredAt).toLocaleString("zh-CN", { dateStyle: "medium", timeStyle: "short" })}</time><span className={`rounded-full border px-2 py-1 text-[10px] font-medium ${mood.style}`}>{mood.label}</span></div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-800">{item.summary}</p>
            {item.reflection && <p className="mt-2 flex gap-2 border-t border-slate-100 pt-2.5 text-xs leading-5 text-slate-600"><MessageSquareText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />{item.reflection}</p>}
          </li>;
        })}
      </ol> : <p className="mt-4 rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">此筛选下还没有互动记录。</p> : <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center"><CalendarClock className="mx-auto h-5 w-5 text-slate-400" /><p className="mt-2 text-xs font-medium text-slate-700">还没有现实互动记录</p><p className="mt-1 text-[11px] leading-5 text-slate-500">先记录发生了什么，过一段时间再回头看，会比只凭印象更清楚。</p></div>}
      <p className="mt-4 border-t border-slate-100 pt-3 text-[10px] leading-5 text-slate-500">隐私提示：记录仅保存在当前浏览器的本地档案中；请勿填写不必要的敏感信息。</p>
    </section>
  );
}
