"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpenText, LoaderCircle } from "lucide-react";
import TimeScenarioComparison from "@/components/TimeScenarioComparison";
import BaziFortuneTimeline from "@/components/BaziFortuneTimeline";
import { WorkbenchInspector, WorkbenchTabs } from "@/components/Workbench";

import type { BirthDate, MyProfile, StoredRelationship, TimeScenarioComparison as TimeScenarioData } from "@/lib/types";
import { apiEndpoint } from "@/lib/api";

interface Props {
  profile: MyProfile;
  relationships: StoredRelationship[];
}

interface PositionReading {
  position: string;
  label: string;
  pillar: string;
  stem_element: string;
  branch_element: string;
  ten_god: string;
  explanation: string;
}

interface PersonRead {
  day_master: string;
  day_master_element: string;
  day_master_yin_yang: string;
  day_master_note: string;
  positions: PositionReading[];
  hidden_stems: Array<{
    position: string;
    label: string;
    branch: string;
    stems: Array<{ stem: string; element: string; ten_god: string }>;
  }>;
  seasonal_context: {
    month_branch: string;
    main_hidden_stem: string | null;
    main_hidden_element: string | null;
    main_hidden_ten_god: string | null;
    same_element_branches: string[];
    exposed_stems: Array<{ stem: string; positions: string[] }>;
    note: string;
  };
  strength_evidence: {
    status: "INCOMPLETE" | "BOUNDARY_UNCERTAIN" | "SUPPORTIVE" | "STRAINED" | "MIXED";
    label: string;
    month_main_direction: string;
    same_element_branches: string[];
    supporting_visible_stems: string[];
    draining_visible_stems: string[];
    review_direction: string;
    rule_note: string;
  };
  visible_element_counts: Record<string, number>;
  element_note: string;
  has_hour: boolean;
  minute_sensitive_note?: string | null;
  uncertainty_note: string;
  method_note: string;
}

interface BirthTimeUncertainty {
  candidate_count: number;
  pillar_options: Record<"year" | "month" | "day", string[]>;
  changing_pillars: string[];
  note: string;
}

export interface BaziResult {
  user_bazi: { pillars: Record<string, string | null>; has_hour: boolean };
  user_reading: PersonRead;
  user_time_uncertainty?: BirthTimeUncertainty | null;
  target_bazi?: { pillars: Record<string, string | null>; has_hour: boolean } | null;
  target_reading?: PersonRead | null;
  target_time_uncertainty?: BirthTimeUncertainty | null;
  comparison?: {
    ten_god: string;
    ten_god_note: string;
    day_master_pair: string;
    branch_evidence: string[];
    reading: string;
    uncertainty_note: string;
  } | null;
  time_scenarios?: TimeScenarioData | null;
}

const elementColors: Record<string, string> = {
  木: "border-emerald-200 bg-emerald-50 text-emerald-800",
  火: "border-rose-200 bg-rose-50 text-rose-800",
  土: "border-amber-200 bg-amber-50 text-amber-900",
  金: "border-slate-300 bg-slate-100 text-slate-800",
  水: "border-sky-200 bg-sky-50 text-sky-800",
};

function birthPayload(date: BirthDate) {
  return { year: date.year, month: date.month, day: date.day, ...(date.hour === undefined || date.hour === null ? {} : { hour: date.hour }) };
}

function PersonPanel({ name, pillars, reading, timeUncertainty, view = "chart", highlight = "" }: {
  name: string; pillars: Record<string, string | null>; reading: PersonRead;
  timeUncertainty?: BirthTimeUncertainty | null; view?: "chart" | "reading"; highlight?: string;
}) {
  const [position, setPosition] = useState("month");
  const [insight, setInsight] = useState("self");
  const [drawer, setDrawer] = useState(false);
  const current = reading.positions.find((item) => item.position === position);
  const hidden = reading.hidden_stems.find((item) => item.position === position);
  const labels = [["year", "年柱"], ["month", "月柱"], ["day", "日柱"], ["hour", "时柱"]] as const;
  return <article className="surface-panel min-w-0 rounded-3xl p-4 sm:p-6">
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div><p className="section-kicker">{name} · {view === "chart" ? "四柱命盘" : "本人解读"}</p><h2 className="mt-2 text-xl font-semibold text-slate-900">日主 {reading.day_master}<span className="ml-3 text-sm font-normal text-slate-500">{reading.day_master_yin_yang}{reading.day_master_element}</span></h2></div>
      <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs text-blue-800">{reading.has_hour ? "四柱完整" : "时辰未知 · 三柱基准"}</span>
    </div>
    {reading.minute_sensitive_note && <p role="note" className="mb-4 rounded-xl bg-rose-50 p-3 text-xs leading-6 text-rose-900">{reading.minute_sensitive_note}</p>}
    {view === "chart" ? <div className="grid min-w-0 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(220px,.75fr)]">
      <div className="min-w-0">
        <div className="grid grid-cols-4 gap-2">{labels.map(([key, label]) => <button key={key} type="button" aria-label={name + "的" + label} aria-pressed={position === key} data-evidence={Boolean(highlight && pillars[key] && Array.from(pillars[key]!).some((char) => highlight.includes(char)))} className="pillar-tile" onClick={() => { setPosition(key); setDrawer(true); }}>
          <span className="block text-xs text-slate-500">{label}</span><span className="my-5 block text-3xl font-semibold leading-relaxed text-slate-900">{pillars[key] ? <>{pillars[key]![0]}<br />{pillars[key]![1]}</> : "？"}</span>
          <span className="block text-[11px] text-blue-700">{reading.positions.find((item) => item.position === key)?.ten_god ?? "待补时辰"}</span>
        </button>)}</div>
        <p className="mt-4 text-sm leading-6 text-slate-600">点击任一柱，查看它的五行、藏干与十神依据。</p>
        <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4"><p className="text-xs font-semibold text-blue-900">日主取象</p><p className="mt-2 text-sm leading-7 text-slate-700">{reading.day_master_note}</p></div>
      </div>
      <WorkbenchInspector title={(labels.find(([key]) => key === position)?.[1] ?? "命盘") + " · 盘面依据"} open={drawer} onClose={() => setDrawer(false)}>
        {current ? <div className="space-y-4 text-sm leading-7 text-slate-700">
          <p className="text-3xl font-semibold tracking-widest text-blue-800">{current.pillar}</p>
          <p>天干属{current.stem_element} · 地支属{current.branch_element}</p>
          <p><b>十神：</b>{current.ten_god}（相对于日主{reading.day_master}）</p>
          <p>{current.explanation}</p>
          <div className="border-t border-slate-200 pt-3"><b>藏干</b><p>{hidden?.stems.map((stem) => stem.stem + "（" + stem.element + "·" + stem.ten_god + "）").join("、") || "未提供"}</p></div>
          {position === "month" && <p className="rounded-xl bg-amber-50 p-3">{reading.seasonal_context.note}</p>}
        </div> : <p className="text-sm leading-7 text-slate-600">未提供出生时辰，此处不生成时柱。可在“时辰推演”中查看代表时刻的变化。</p>}
      </WorkbenchInspector>
    </div> : <>
      <WorkbenchTabs label={name + "的解读主题"} value={insight} onChange={setInsight} items={[{ id: "self", label: "日主取象" }, { id: "season", label: "月令藏干" }, { id: "strength", label: "强弱线索" }, { id: "elements", label: "五行分布" }]} />
      <div className="min-h-56 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700">
        {insight === "self" && <><h3 className="mb-3 font-semibold text-slate-900">日主 {reading.day_master} · {reading.day_master_element}</h3><p>{reading.day_master_note}</p><p className="mt-4 text-xs text-slate-500">{reading.uncertainty_note}</p></>}
        {insight === "season" && <><h3 className="mb-3 font-semibold text-slate-900">月令与同类藏干</h3><p>{reading.seasonal_context.note}</p><p className="mt-3">月令藏干透出：{reading.seasonal_context.exposed_stems.filter((item) => item.positions.length).map((item) => item.stem + "（" + item.positions.join("、") + "）").join("、") || "已知天干未见"}</p></>}
        {insight === "strength" && <><h3 className="mb-3 font-semibold text-slate-900">{reading.strength_evidence.label}</h3><p>月令主气：{reading.strength_evidence.month_main_direction}</p><p>同五行藏干：{reading.strength_evidence.same_element_branches.join("、") || "未见"}</p><p>其他可见天干：扶身 {reading.strength_evidence.supporting_visible_stems.join("、") || "未见"} / 耗制 {reading.strength_evidence.draining_visible_stems.join("、") || "未见"}</p><p className="mt-3">{reading.strength_evidence.review_direction}</p><p className="mt-3 text-xs text-slate-500">{reading.strength_evidence.rule_note}</p></>}
        {insight === "elements" && <><h3 className="mb-3 font-semibold text-slate-900">可见五行计数</h3><div className="grid grid-cols-5 gap-2">{Object.entries(reading.visible_element_counts).map(([element, count]) => <div key={element} className={"rounded-xl border p-2 text-center " + elementColors[element]}>{element}<b className="mt-2 block text-xl">{count}</b></div>)}</div><p className="mt-4">{reading.element_note}</p></>}
      </div>
    </>}
    {timeUncertainty && <details className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3">
      <summary className="cursor-pointer text-sm font-medium text-amber-950">时辰未知：三柱是否会变化</summary>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">{labels.filter(([key]) => key !== "hour").map(([key, label]) => <p key={key} className="text-xs leading-6 text-amber-950">{label}：{timeUncertainty.pillar_options[key as "year" | "month" | "day"].join(" / ")}</p>)}</div>
      <p className="mt-2 text-xs leading-6 text-amber-950">{timeUncertainty.note}</p>
    </details>}
  </article>;
}

export default function BaziReadingStudio({ profile, relationships }: Props) {
  const [targetId, setTargetId] = useState("");
  const [result, setResult] = useState<BaziResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState("chart");
  const [subject, setSubject] = useState("self");
  const [highlight, setHighlight] = useState("");
  const activeRequest = useRef<AbortController | null>(null);

  const targets = useMemo(() => {
    const seen = new Set<string>();
    return relationships.filter((person) => {
      const key = person.personKey ?? `${person.targetName}-${person.relationshipType}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [relationships]);
  const target = targets.find((item) => item.id === targetId) ?? null;

  useEffect(() => {
    activeRequest.current?.abort();
    activeRequest.current = null;
    setResult(null);
    setError(null);
    setLoading(false);
    return () => {
      activeRequest.current?.abort();
      activeRequest.current = null;
    };
  }, [profile, target]);

  const runReading = async () => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 45_000);
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch(apiEndpoint("/api/v1/reading/bazi"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ user_birth: birthPayload(profile), ...(target ? { target_birth: birthPayload(target.targetDate) } : {}) }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const detail = body && typeof body === "object" && "detail" in body && typeof body.detail === "string" ? body.detail : "八字排盘服务暂时不可用。";
        throw new Error(detail);
      }
      if (!body || typeof body !== "object" || !("user_reading" in body)) throw new Error("排盘服务返回内容不完整。");
      if (activeRequest.current === controller && !controller.signal.aborted) setResult(body as BaziResult);
    } catch (reason) {
      if (activeRequest.current === controller) setError(controller.signal.aborted
        ? "排盘请求超时，请检查后端服务后重试。"
        : reason instanceof Error ? reason.message : "连接排盘服务失败，请检查后端是否启动。");
    } finally {
      window.clearTimeout(timeout);
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        setLoading(false);
      }
    }
  };

  return (
    <section className="mx-auto w-full max-w-7xl" aria-labelledby="bazi-reading-title">
      <header className="surface-panel overflow-hidden rounded-3xl">
        <div className="grid gap-5 bg-gradient-to-br from-sky-50 via-white to-indigo-50/70 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div><p className="section-kicker">BAZI / FOUR PILLARS · 规则计算</p><h1 id="bazi-reading-title" className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">八字解读</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">从四柱、日主、藏干、月令与十神逐项说明盘面依据。排盘由现有规则服务计算，不是 AI 生成。可以只看自己，也可以选择一位关系人并列对照。</p></div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="min-w-48 text-xs font-medium text-slate-700">对照关系人（可选）<select value={targetId} onChange={(event) => setTargetId(event.target.value)} className="form-input mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm"><option value="">只解读本人</option>{targets.map((person) => <option key={person.id} value={person.id}>{person.targetName} · {person.relationshipType}</option>)}</select></label>
            <button type="button" onClick={runReading} disabled={loading} className="primary-button inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-60"><BookOpenText className="h-4 w-4" />{loading && <LoaderCircle className="h-4 w-4 animate-spin" />}{loading ? "正在排盘…" : "开始解读"}</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-slate-200 bg-white/80 px-5 py-3 text-[10px] leading-5 text-slate-500 sm:px-7"><span>公历生日 · 北京时间</span><span>立春换年 · 节气换月 · 23:00换日</span><span>传统术数参考，不是科学预测</span></div>
      </header>

      {error && <p role="alert" className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
      {!result && !loading && <div className="surface-panel mt-4 rounded-3xl p-5 sm:p-7"><p className="text-sm font-semibold text-slate-900">解读会展示哪些内容</p><div className="mt-3 grid gap-2 sm:grid-cols-3">{[["盘面结构", "年、月、日柱及未知时辰的变化候选"], ["藏干与十神", "展示藏干、月令透出及强弱线索初筛"], ["本人或双方", "选择档案关系人后，展示双方盘面与地支依据"]].map(([title, detail]) => <div key={title} className="rounded-2xl border border-slate-200 bg-white p-4"><h2 className="text-xs font-semibold text-slate-800">{title}</h2><p className="mt-1.5 text-xs leading-5 text-slate-600">{detail}</p></div>)}</div></div>}

      {loading && <div role="status" className="mt-5 grid animate-pulse grid-cols-4 gap-3 rounded-3xl border border-slate-200 bg-white p-6">{[0, 1, 2, 3].map((item) => <div key={item} className="h-48 rounded-2xl bg-slate-100" />)}<span className="col-span-4 text-center text-sm text-slate-500">正在核对盘面与时辰边界…</span></div>}
      {result && <div className="mt-4">
        <WorkbenchTabs label="八字工作台栏目" value={view} onChange={setView} items={[{ id: "chart", label: "命盘" }, { id: "reading", label: "解读" }, { id: "pair", label: "双方对照" }, { id: "hours", label: "时辰推演" }, { id: "fortune", label: "大运流年" }, { id: "sources", label: "计算依据" }]} />
        {(view === "chart" || view === "reading" || view === "pair") && <>
          {view === "pair" && <section className="surface-panel mb-4 rounded-2xl p-5" aria-label="双方八字对照">
            {result.comparison && target ? <><h2 className="text-lg font-semibold">{result.comparison.day_master_pair}</h2><p className="mt-2 text-sm leading-7 text-slate-600">{result.comparison.ten_god_note} {result.comparison.reading}</p>
              <p className="mt-4 text-xs font-semibold text-slate-700">点击依据，在下方高亮涉及的字</p>
              <div className="mt-2 flex flex-wrap gap-2">{result.comparison.branch_evidence.map((line) => <button type="button" key={line} onClick={() => setHighlight(highlight === line ? "" : line)} aria-pressed={highlight === line} className={highlight === line ? "rounded-xl border border-amber-400 bg-amber-50 p-3 text-left text-sm" : "rounded-xl border border-slate-200 bg-white p-3 text-left text-sm"}>{line}</button>)}</div>
              {!result.comparison.branch_evidence.length && <p className="mt-2 text-sm text-slate-500">这套规则未识别到额外地支关系。</p>}
              <p className="mt-3 text-xs leading-6 text-slate-500">{result.comparison.uncertainty_note}</p>
            </> : <p className="text-sm text-slate-600">先在上方选择关系人并点击“开始解读”，即可并列查看双方盘面。</p>}
          </section>}
          {result.target_reading && <div className="md:hidden"><WorkbenchTabs label="查看哪一方的八字" value={subject} onChange={setSubject} items={[{ id: "self", label: profile.name || "我" }, { id: "target", label: target?.targetName || "对方" }]} /></div>}
          <div className={"grid min-w-0 gap-4 " + (result.target_reading ? "2xl:grid-cols-2" : "")}>
            <div className={subject === "target" && result.target_reading ? "hidden min-w-0 md:block" : "min-w-0"}><PersonPanel name={profile.name || "我"} pillars={result.user_bazi.pillars} reading={result.user_reading} timeUncertainty={result.user_time_uncertainty} view={view === "reading" ? "reading" : "chart"} highlight={view === "pair" ? highlight : ""} /></div>
            {result.target_reading && result.target_bazi && target && <div className={subject === "self" ? "hidden min-w-0 md:block" : "min-w-0"}><PersonPanel name={target.targetName} pillars={result.target_bazi.pillars} reading={result.target_reading} timeUncertainty={result.target_time_uncertainty} view={view === "reading" ? "reading" : "chart"} highlight={view === "pair" ? highlight : ""} /></div>}
          </div>
        </>}
        {view === "hours" && (result.time_scenarios ? <TimeScenarioComparison comparison={result.time_scenarios} /> : <section className="surface-panel rounded-2xl p-6"><h2 className="text-lg font-semibold">时辰状态</h2><p className="mt-3 text-sm leading-7 text-slate-600">{result.user_time_uncertainty?.note ?? "当前本人已填写时辰，按该时辰排盘。"} {result.target_time_uncertainty?.note}</p><p className="mt-3 text-sm text-slate-500">选择一个出生时辰未知的关系人，再开始解读，即可比较全部组合与两端情境。</p></section>)}
        {view === "fortune" && <BaziFortuneTimeline profile={profile} />}
        {view === "sources" && <section className="surface-panel rounded-2xl p-6"><h2 className="text-lg font-semibold text-slate-900">计算方法与资料来源</h2><p className="mt-3 text-sm leading-7 text-slate-600">{result.user_reading.method_note} 八字历法转换使用 lunar-python；十神按天干五行生克与阴阳关系推导。{result.user_reading.has_hour ? "" : "未知时辰时以 00:00 为基准，并展示代表时刻下三柱的变化。"} 古籍提供月令、藏干透出等分析思路；页面的三项等权初筛条件是本产品规则。</p><div className="mt-4 flex flex-wrap gap-4 text-sm"><a className="text-blue-700" href="https://github.com/6tail/lunar-python" target="_blank" rel="noreferrer">lunar-python 排盘实现 ↗</a><a className="text-blue-700" href="https://donglishuzhai.net/chapter/3721.html" target="_blank" rel="noreferrer">《子平真诠·论用神》 ↗</a><a className="text-blue-700" href="https://caipu.donglishuzhai.net/chapter/3723.html" target="_blank" rel="noreferrer">《论用神变化》 ↗</a></div></section>}
      </div>}
      {!targets.length && <p className="mt-4 text-xs text-slate-500">当前档案库没有关系人；保存一次关系测算后，可以在这里并列解读双方。</p>}
    </section>
  );
}
