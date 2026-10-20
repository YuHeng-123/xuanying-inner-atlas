"use client";

import { useMemo, useRef, useState } from "react";
import { apiEndpoint } from "@/lib/api";
import type { MyProfile } from "@/lib/types";

interface LuckYear {
  year: number;
  nominal_age: number;
  ganzhi: string;
  stem_ten_god: string;
  natal_branch_relations?: Array<{
    name: string;
    branches: string;
    positions: string[];
  }>;
}

interface LuckMonth {
  index: number;
  month_number: number;
  branch: string;
  ganzhi: string;
  stem_ten_god: string;
  start_jieqi: string;
  start_solar_datetime: string;
  end_jieqi: string;
  end_solar_datetime: string;
  natal_branch_relations: Array<{
    name: string;
    branches: string;
    positions: string[];
  }>;
  time_layer_relations: Array<{
    name: string;
    branches: string;
    positions: string[];
  }>;
  all_layer_branch_context: Array<{
    position: string;
    ganzhi: string;
  }>;
  all_layer_relations: Array<{
    name: string;
    branches: string;
    positions: string[];
  }>;
}

interface LuckCycle {
  index: number;
  start_year: number;
  end_year: number;
  start_age: number;
  end_age: number;
  ganzhi: string;
  stem_ten_god: string;
  natal_branch_relations?: Array<{
    name: string;
    branches: string;
    positions: string[];
  }>;
  years: LuckYear[];
}

interface LuckResult {
  gender: "male" | "female";
  direction: string;
  direction_basis: string;
  day_master: string;
  selected_year: number;
  months: LuckMonth[];
  start: {
    solar_datetime: string;
    age_years: number;
    age_months: number;
    age_days: number;
    age_hours: number;
  };
  cycles: LuckCycle[];
  calculation_basis: string[];
}

const representativeHours = [
  [23, "子时 · 23:00–00:00（跨日）"], [0, "子时 · 00:00–01:00"],
  [2, "丑时 · 代表时刻 02:00"], [4, "寅时 · 代表时刻 04:00"],
  [6, "卯时 · 代表时刻 06:00"], [8, "辰时 · 代表时刻 08:00"],
  [10, "巳时 · 代表时刻 10:00"], [12, "午时 · 代表时刻 12:00"],
  [14, "未时 · 代表时刻 14:00"], [16, "申时 · 代表时刻 16:00"],
  [18, "酉时 · 代表时刻 18:00"], [20, "戌时 · 代表时刻 20:00"],
  [22, "亥时 · 代表时刻 22:00"],
] as const;

function localSolarTimestamp(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/.exec(value);
  if (!match) return Number.NaN;
  const [, year, month, day, hour, minute, second] = match;
  return Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
}

function currentChinaClock() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)?.value);
  const year = part("year");
  const timestamp = Date.UTC(year, part("month") - 1, part("day"), part("hour"), part("minute"), part("second"));
  return { year, timestamp };
}

function findCurrentFlowMonthIndex(months: LuckMonth[], now = currentChinaClock().timestamp) {
  return months.findIndex((month) => {
    const start = localSolarTimestamp(month.start_solar_datetime);
    const end = localSolarTimestamp(month.end_solar_datetime);
    return Number.isFinite(start) && Number.isFinite(end) && now >= start && now < end;
  });
}

function relationPositionLabel(position: string) {
  if (position === "flow_month.month") return "流月";
  if (position === "flow_year.year") return "流年";
  if (position === "dayun.cycle") return "大运";
  const pillarName: Record<string, string> = { year: "年柱", month: "月柱", day: "日柱", hour: "时柱" };
  const pillar = position.split(".")[1];
  return pillarName[pillar] ?? position;
}

export default function BaziFortuneTimeline({ profile }: { profile: MyProfile }) {
  const [gender, setGender] = useState<"" | "male" | "female">("");
  const [assumedHour, setAssumedHour] = useState("");
  const [selectedYear, setSelectedYear] = useState(() => currentChinaClock().year);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);
  const [result, setResult] = useState<LuckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const hour = profile.hour ?? (assumedHour === "" ? null : Number(assumedHour));
  const years = useMemo(() => result?.cycles.flatMap((cycle) => cycle.years) ?? [], [result]);
  const selectedCycle = result?.cycles.find((cycle) => selectedYear >= cycle.start_year && selectedYear <= cycle.end_year);
  const selectedAnnual = selectedCycle?.years.find((annual) => annual.year === selectedYear);
  const currentMonthIndex = useMemo(() => result ? findCurrentFlowMonthIndex(result.months) : -1, [result]);

  const calculate = async (yearToLoad = selectedYear, alignToCurrentFlowYear = false) => {
    if (!gender || hour === null) return;
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(apiEndpoint("/api/v1/fortune/bazi"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: profile.year, month: profile.month, day: profile.day, hour, gender, selected_year: yearToLoad }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const detail = body && typeof body === "object" && "detail" in body && typeof body.detail === "string" ? body.detail : "岁运计算服务暂时不可用。";
        throw new Error(detail);
      }
      if (!body || typeof body !== "object" || !("cycles" in body)) throw new Error("岁运服务返回内容不完整。");
      if (requestId.current === currentRequest) {
        const nextResult = body as LuckResult;
        const chinaNow = currentChinaClock();
        const currentIndex = findCurrentFlowMonthIndex(nextResult.months, chinaNow.timestamp);
        const firstMonthStart = nextResult.months[0] ? localSolarTimestamp(nextResult.months[0].start_solar_datetime) : Number.NaN;

        if (alignToCurrentFlowYear && yearToLoad === chinaNow.year && nextResult.months.length > 0 && Number.isFinite(firstMonthStart) && chinaNow.timestamp < firstMonthStart) {
          const previousFlowYear = yearToLoad - 1;
          setSelectedYear(previousFlowYear);
          void calculate(previousFlowYear);
          return;
        }

        setResult(nextResult);
        if (currentIndex >= 0) setSelectedMonthIndex(currentIndex);
      }
    } catch (reason) {
      if (requestId.current === currentRequest) setError(reason instanceof Error ? reason.message : "连接岁运计算服务失败，请检查后端是否启动。");
    } finally {
      if (requestId.current === currentRequest) setLoading(false);
    }
  };

  const chooseYear = (year: number) => {
    setSelectedYear(year);
    setSelectedMonthIndex(0);
    if (result && gender && hour !== null) void calculate(year);
  };
  const monthlyDataReady = result?.selected_year === selectedYear;
  const selectedMonth = monthlyDataReady ? result?.months[selectedMonthIndex] : undefined;

  return <div className="space-y-4">
    <section className="surface-panel rounded-3xl p-5 sm:p-6">
      <div><p className="section-kicker">BAZI / DA YUN · LIU NIAN</p><h2 className="mt-1 text-xl font-semibold text-slate-900">大运与流年</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">按出生资料计算起运时间、大运区间和流年干支。下面展示计算结果与日主十神对应关系，不把它们自动转成现实吉凶预测。</p></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="text-xs font-medium text-slate-700">本次排盘口径<select value={gender} onChange={(event) => { requestId.current += 1; setLoading(false); setGender(event.target.value as "" | "male" | "female"); setResult(null); setError(null); }} className="form-input mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm"><option value="">请选择</option><option value="male">男</option><option value="female">女</option></select><span className="mt-1 block text-[10px] font-normal leading-5 text-slate-500">仅用于本次传统起运算法，不写入个人档案。</span></label>
        {profile.hour === undefined || profile.hour === null
          ? <label className="text-xs font-medium text-slate-700">假设出生时辰<select value={assumedHour} onChange={(event) => { requestId.current += 1; setLoading(false); setAssumedHour(event.target.value); setResult(null); setError(null); }} className="form-input mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm"><option value="">请选择一个代表时刻</option>{representativeHours.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><span className="mt-1 block text-[10px] font-normal leading-5 text-slate-500">未知时辰时不会代填；所选时刻只是假设。</span></label>
          : <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs leading-5 text-emerald-900">档案时辰：{String(profile.hour).padStart(2, "0")}:00<br />按整点计算，分钟未记录。</p>}
        <button type="button" onClick={() => void calculate(selectedYear, true)} disabled={!gender || hour === null || loading} className="primary-button inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50">{loading ? "正在计算…" : "计算岁运"}</button>
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-800">{error}</p>}
    </section>

    {result && <>
      <section className="surface-panel rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="section-kicker">起运信息 · 日主 {result.day_master}</p><h3 className="mt-1 text-lg font-semibold text-slate-900">{result.direction} · 起运约 {result.start.age_years}年{result.start.age_months}个月{result.start.age_days}天</h3><p className="mt-1 text-xs leading-5 text-slate-600">库内起运时刻：{result.start.solar_datetime}</p></div><label className="text-xs font-medium text-slate-700">查看流年<select value={selectedYear} onChange={(event) => chooseYear(Number(event.target.value))} className="form-input mt-1.5 block rounded-xl px-3 py-2.5 text-sm"><option value={selectedYear}>{years.some((annual) => annual.year === selectedYear) ? `${selectedYear}年` : `${selectedYear}年（超出当前返回区间）`}</option>{years.filter((annual) => annual.year !== selectedYear).map((annual) => <option key={annual.year} value={annual.year}>{annual.year}年 · {annual.ganzhi}</option>)}</select></label></div>
        <p className="mt-3 text-xs leading-5 text-slate-600">{result.direction_basis}</p>
        {selectedAnnual && selectedCycle ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-[10px] text-blue-800">所选流年</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{selectedAnnual.year} · {selectedAnnual.ganzhi}</p>
              <p className="mt-1 text-xs text-slate-600">虚岁 {selectedAnnual.nominal_age} · 岁干十神 {selectedAnnual.stem_ten_god}</p>
              <div className="mt-3 border-t border-blue-100 pt-3">
                <p className="text-[10px] font-semibold text-slate-700">流年支与本命四柱地支</p>
                {(selectedAnnual.natal_branch_relations ?? []).length > 0 ? (
                  <ul className="mt-2 space-y-1.5">
                    {(selectedAnnual.natal_branch_relations ?? []).map((relation, index) => (
                      <li key={`${relation.name}-${relation.branches}-${index}`} className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-white/80 bg-white/80 px-2.5 py-2 text-[10px] text-slate-700">
                        <span className="font-semibold text-indigo-800">{relation.name}</span>
                        <span>{relation.branches}</span>
                        <span className="text-slate-500">{Array.from(new Set(relation.positions.map(relationPositionLabel))).join(" · ")}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-1 text-[10px] leading-5 text-slate-600">项目当前列出的地支关系规则中，未检出对应关系。</p>}
                <p className="mt-1.5 text-[9px] leading-4 text-slate-500">只展示项目规则识别的关系，不据此判断吉凶。</p>
              </div>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
              <p className="text-[10px] text-violet-800">所在大运</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{selectedCycle.start_year}–{selectedCycle.end_year} · {selectedCycle.ganzhi}</p>
              <p className="mt-1 text-xs text-slate-600">虚岁 {selectedCycle.start_age}–{selectedCycle.end_age} · 运干十神 {selectedCycle.stem_ten_god}</p>
              <div className="mt-3 border-t border-violet-100 pt-3">
                <p className="text-[10px] font-semibold text-slate-700">大运支与本命四柱地支</p>
                {(selectedCycle.natal_branch_relations ?? []).length > 0 ? (
                  <ul className="mt-2 space-y-1.5">
                    {(selectedCycle.natal_branch_relations ?? []).map((relation, index) => (
                      <li key={`${relation.name}-${relation.branches}-${index}`} className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-white/80 bg-white/80 px-2.5 py-2 text-[10px] text-slate-700">
                        <span className="font-semibold text-indigo-800">{relation.name}</span>
                        <span>{relation.branches}</span>
                        <span className="text-slate-500">{Array.from(new Set(relation.positions.map(relationPositionLabel))).join(" · ")}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-1 text-[10px] leading-5 text-slate-600">项目当前列出的地支关系规则中，未检出对应关系。</p>}
                <p className="mt-1.5 text-[9px] leading-4 text-slate-500">只展示项目规则识别的关系，不据此判断吉凶。</p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-[10px] text-slate-500">十神口径</p><p className="mt-1 text-xs leading-5 text-slate-700">以本命日干 {result.day_master} 为基准，分别对照大运干、流年干。</p></div>
          </div>
        ) : <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-950">所选年份不在排盘库返回的大运区间内。可以从下拉框中选择一个已计算的年份。</p>}
      </section>

      <section className="surface-panel rounded-3xl p-5 sm:p-6">
        <div><p className="section-kicker">BAZI / LIU YUE</p><h3 className="mt-1 text-base font-semibold text-slate-900">流月 · {selectedYear}年</h3><p className="mt-1 text-xs leading-5 text-slate-500">八字流月按节气月序列展示，寅月为第一月；节气时刻采用中国标准时间。</p></div>
        {!monthlyDataReady && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">{loading ? "正在读取所选年份的流月…" : "当前年份的流月数据尚未加载。"}</p>}
        {monthlyDataReady && result.months.length === 0 && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-950">排盘库返回的大运范围没有包含这一年，因此没有对应的流月数据。</p>}
        {monthlyDataReady && result.months.length > 0 && <>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">{result.months.map((flowMonth, index) => <button key={flowMonth.index} type="button" onClick={() => setSelectedMonthIndex(index)} aria-pressed={selectedMonthIndex === index} className={`rounded-xl border p-3 text-left transition ${selectedMonthIndex === index ? "border-blue-400 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-800 hover:border-blue-300"}`}><span className="flex items-center gap-1 text-[10px] opacity-75">第{flowMonth.month_number}节气月{currentMonthIndex === index && <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold opacity-100 ${selectedMonthIndex === index ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"}`}>当前</span>}</span><span className="mt-1 block text-sm font-semibold">{flowMonth.branch}月 · {flowMonth.ganzhi}</span><span className={`mt-1 block text-[10px] ${selectedMonthIndex === index ? "text-blue-50" : "text-slate-500"}`}>{flowMonth.start_jieqi}起 {flowMonth.start_solar_datetime.slice(5, 16)}</span><span className={`mt-1 block text-[10px] ${selectedMonthIndex === index ? "text-blue-50" : "text-slate-500"}`}>月干十神 {flowMonth.stem_ten_god}</span></button>)}</div>
          {selectedMonth && (
            <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
              <h4 className="text-sm font-semibold text-blue-950">第{selectedMonth.month_number}节气月 · {selectedMonth.ganzhi}</h4>
              <p className="mt-1 text-xs leading-5 text-slate-700">地支 {selectedMonth.branch} · 月干十神 {selectedMonth.stem_ten_god}（以本命日主 {result.day_master} 为基准）。</p>
              <p className="mt-1 text-xs leading-5 text-slate-700">节气区间：{selectedMonth.start_jieqi}起 {selectedMonth.start_solar_datetime} · 至 {selectedMonth.end_jieqi}起 {selectedMonth.end_solar_datetime}。</p>
              <div className="mt-3 border-t border-blue-100 pt-3">
                <h5 className="text-xs font-semibold text-slate-800">本命与岁运关系总览</h5>
                <p className="mt-1 text-[10px] leading-5 text-slate-600">以下合并本命四柱与所选大运、流年、流月地支；每条关系标出涉及的位置。</p>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {selectedMonth.all_layer_branch_context.map((item) => (
                    <div key={item.position} className="rounded-xl border border-white/80 bg-white/80 px-3 py-2">
                      <span className="block text-[10px] text-slate-500">{relationPositionLabel(item.position)}</span>
                      <span className="mt-0.5 block text-sm font-semibold text-slate-800">{item.ganzhi}</span>
                    </div>
                  ))}
                </div>
                {selectedMonth.all_layer_relations.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {selectedMonth.all_layer_relations.map((relation, index) => (
                      <li key={`${relation.name}-${relation.branches}-${index}`} className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-white/80 bg-white/80 px-3 py-2 text-xs text-slate-700">
                        <span className="font-semibold text-indigo-800">{relation.name}</span>
                        <span>{relation.branches}</span>
                        <span className="text-slate-500">{Array.from(new Set(relation.positions.map(relationPositionLabel))).join(" · ")}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-3 text-xs text-slate-600">这七个位置中，未检出项目已定义的地支关系。</p>}
                <p className="mt-2 text-[10px] leading-5 text-slate-500">按项目已定义的六合、六冲、六害与刑规则识别，只呈现盘面组合，不据此判断吉凶。</p>
              </div>
              <p className="mt-3 text-[10px] leading-5 text-slate-500">交节时刻依据 lunar-python 节气表，使用中国标准时间；时刻前后以交节点切换月份。这里只列历法与十神对应，不据此断定吉凶。</p>
            </div>
          )}
        </>}
      </section>

      <section className="surface-panel rounded-3xl p-5 sm:p-6"><div className="mb-4"><h3 className="text-base font-semibold text-slate-900">大运时间线</h3><p className="mt-1 text-xs leading-5 text-slate-500">点击年份查看对应流年和流月。高亮表示当前选择年份。</p></div><div className="space-y-3">{result.cycles.map((cycle) => <article key={cycle.index} className={`rounded-2xl border p-4 ${selectedCycle?.index === cycle.index ? "border-violet-300 bg-violet-50/60" : "border-slate-200 bg-white"}`}><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-semibold text-slate-900">{cycle.start_year}–{cycle.end_year} · {cycle.ganzhi}</h4><span className="rounded-full bg-white px-2.5 py-1 text-[10px] text-slate-600">虚岁 {cycle.start_age}–{cycle.end_age} · 运干十神 {cycle.stem_ten_god}</span></div><div className="mt-3 flex flex-wrap gap-1.5">{cycle.years.map((annual) => <button key={annual.year} type="button" onClick={() => chooseYear(annual.year)} aria-pressed={selectedYear === annual.year} className={`min-w-20 rounded-xl border px-2.5 py-2 text-left text-[10px] leading-4 ${selectedYear === annual.year ? "border-blue-400 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"}`}><span className="block font-semibold">{annual.year} · {annual.ganzhi}</span><span className={selectedYear === annual.year ? "text-blue-50" : "text-slate-500"}>虚岁 {annual.nominal_age} · {annual.stem_ten_god}</span></button>)}</div></article>)}</div></section>

      <details className="surface-panel rounded-2xl p-4"><summary className="cursor-pointer text-xs font-semibold text-slate-700">计算依据与适用边界</summary><ul className="mt-3 list-disc space-y-1 pl-5 text-[11px] leading-5 text-slate-600">{result.calculation_basis.map((line) => <li key={line}>{line}</li>)}</ul><p className="mt-3 text-[11px]"><a className="text-blue-700" href="https://github.com/6tail/lunar-python" target="_blank" rel="noreferrer">lunar-python 源码 ↗</a></p></details>
    </>}
  </div>;
}
