"use client";

import { useMemo, useState } from "react";
import { astro } from "iztro";
import type { PalaceName } from "iztro/lib/i18n";
import { CircleHelp, Compass, Sparkles, Stars } from "lucide-react";

import type { BirthDate, MyProfile, StoredRelationship } from "@/lib/types";
import { transformedStars } from "@/lib/ziwei";

interface Props { profile: MyProfile; relationships: StoredRelationship[] }
type Gender = "男" | "女" | "";
type Chart = ReturnType<typeof astro.bySolar>;

const timeNames = ["早子时", "丑时", "寅时", "卯时", "辰时", "巳时", "午时", "未时", "申时", "酉时", "戌时", "亥时", "晚子时"];
const starNotes: Record<string, string> = {
  紫微: "主统筹、主导与责任议题；可观察自己如何使用影响力，也要留意是否过度承担或控制。",
  天机: "主思考、策划与变化议题；可观察点子如何落实，以及变化时如何稳定节奏。",
  太阳: "主公开表达、付出与能见度议题；可观察投入是否有边界、表达是否给他人留空间。",
  武曲: "主执行、资源与结果议题；可观察自己如何处理效率、金钱和承诺。",
  天同: "主协调、舒适与人情议题；可观察维护和气时，是否也说清真实需求。",
  廉贞: "主原则、边界与关系互动议题；可观察规则是否透明，分歧能否回到具体事项。",
  天府: "主储备、管理与稳定议题；可观察资源如何安排，以及安全感是否妨碍尝试。",
  太阴: "主细节、规划与内在感受议题；可观察准备是否充分，也要避免因顾虑而延迟沟通。",
  贪狼: "主兴趣、社交与多元尝试议题；可观察热情如何分配，约定如何持续兑现。",
  巨门: "主分析、表达与辨析议题；可观察讨论是否帮助澄清，也留意措辞对关系的影响。",
  天相: "主协作、规范与协调议题；可观察如何支持团队，同时保留自己的判断。",
  天梁: "主原则、照应与经验议题；可观察帮助他人时的边界，以及建议是否被对方需要。",
  七杀: "主决断、独立与压力应对议题；可观察快速行动前，是否完成信息核对和风险评估。",
  破军: "主变化、重组与试错议题；可观察旧方法何时需要更新，以及改变的成本由谁承担。",
};
const palaceFocus: PalaceName[] = ["命宫", "官禄", "财帛", "夫妻"];

function timeIndex(hour: number): number {
  return hour === 23 ? 12 : Math.floor((hour + 1) / 2);
}

function hourForIndex(index: number): number {
  if (index === 0) return 0;
  if (index === 12) return 23;
  return index * 2;
}

function dateText(birth: BirthDate) {
  return `${birth.year}-${String(birth.month).padStart(2, "0")}-${String(birth.day).padStart(2, "0")}`;
}

function lunarDayText(day: number) {
  const names = ["", "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十", "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十", "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"];
  return names[day] ?? String(day);
}

function personPalaceRead(chart: Chart, palaceName: PalaceName, title: string) {
  const palace = chart.palace(palaceName);
  if (!palace) return `${title}宫位数据不可用。`;
  const stars = palace.majorStars.map((star) => star.name);
  const transformations = transformedStars(palace).map((star) => `${star.name}化${star.mutagen}`);
  const transformationNote = transformations.length ? ` 本盘此处可见${transformations.join("、")}。` : "";
  if (!stars.length) return `${title}落在${palace.earthlyBranch}，本宫没有主星。传统读盘通常还要参看对宫与三方四正；这里先如实展示空宫，不把它断作吉凶。${transformationNote}`;
  const meanings = stars.map((name) => starNotes[name] ?? `${name}为主星之一，可结合宫位与四化进一步阅读。`);
  return `${title}在${palace.earthlyBranch}，主星为${stars.join("、")}。${meanings.join(" ")}${transformationNote}`;
}

function ChartPanel({ name, chart, onCloseReadings = false }: { name: string; chart: Chart; onCloseReadings?: boolean }) {
  const [expandedPalace, setExpandedPalace] = useState<string | null>("命宫");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);
  const mainPalace = chart.palace("命宫");
  const keyStars = mainPalace?.majorStars.map((star) => star.name) ?? [];
  const mutagens = chart.palaces.flatMap((palace) => transformedStars(palace).map((star) => ({ star: star.name, mutagen: star.mutagen, palace: palace.name })));
  const decadeList = useMemo(() => chart.decadalList(), [chart]);
  const yearOptions = useMemo(() => Array.from(new Set([
    selectedYear,
    ...decadeList.flatMap((decade) => Array.from({ length: decade.yearRange[1] - decade.yearRange[0] + 1 }, (_, index) => decade.yearRange[0] + index)),
  ])).sort((first, second) => first - second), [decadeList, selectedYear]);
  const currentHoroscope = useMemo(() => chart.horoscope(`${selectedYear}-06-01`), [chart, selectedYear]);
  const monthlyList = useMemo(() => chart.monthlyList(selectedYear), [chart, selectedYear]);
  const selectedMonthly = monthlyList[selectedMonthIndex] ?? monthlyList[0];
  const activeDecade = decadeList.find((decade) => selectedYear >= decade.yearRange[0] && selectedYear <= decade.yearRange[1]);
  const yearlyPalace = chart.palaces[currentHoroscope.yearly.index]?.name;
  const yearlyStars = currentHoroscope.yearly.stars?.flat().map((star) => star.name) ?? [];
  const monthlyPalace = selectedMonthly?.palaceNames[selectedMonthly.index];
  const monthlyStars = selectedMonthly?.stars?.flat().map((star) => star.name) ?? [];
  return (
    <article className="surface-panel min-w-0 rounded-3xl p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="section-kicker">ZI WEI DOU SHU / {name}</p><h2 className="mt-1 text-xl font-semibold text-slate-900">{name}的紫微命盘</h2><p className="mt-1 text-xs text-slate-500">公历 {chart.solarDate} · 农历 {chart.lunarDate} · {chart.time}（{chart.timeRange}）</p></div><span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-800">{chart.gender}盘</span></div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[["命宫", `${chart.earthlyBranchOfSoulPalace}宫`], ["身宫", `${chart.earthlyBranchOfBodyPalace}宫`], ["命主 / 身主", `${chart.soul} / ${chart.body}`], ["五行局", chart.fiveElementsClass]].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-3"><p className="text-[10px] text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold text-slate-900">{value}</p></div>)}
      </div>
      <section className="mt-4 rounded-2xl border border-violet-100 bg-violet-50/60 p-4"><h3 className="flex items-center gap-2 text-sm font-semibold text-violet-950"><Sparkles className="h-4 w-4" />命宫主星取象</h3><p className="mt-2 text-sm leading-6 text-violet-950/85">{keyStars.length ? keyStars.map((star) => starNotes[star] ?? `${star}为命宫主星，请结合全盘结构查看。`).join(" ") : "命宫无主星。传统读盘会参看对宫和三方四正，单看命宫不足以下结论。"}</p><p className="mt-2 text-[10px] leading-5 text-violet-900/70">这是按本产品引用的入门取象整理的自我观察提示，不是对性格或命运的验证。</p></section>
      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h3 className="text-sm font-semibold text-slate-900">大限与流年</h3><p className="mt-1 text-[10px] leading-5 text-slate-500">选定年份后按该年 6 月 1 日读取动态盘，展示运限干支、落宫、四化与流曜。</p></div><label className="text-[10px] font-medium text-slate-700">查看年份<select value={selectedYear} onChange={(event) => { setSelectedYear(Number(event.target.value)); setSelectedMonthIndex(0); }} className="form-input mt-1 block rounded-xl px-3 py-2 text-xs">{yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}</select></label></div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <article className="rounded-xl border border-violet-100 bg-violet-50/60 p-3"><h4 className="text-[10px] font-semibold text-violet-950">大限 · {currentHoroscope.decadal.heavenlyStem}{currentHoroscope.decadal.earthlyBranch}</h4><p className="mt-1 text-xs leading-5 text-slate-700">{activeDecade ? `${activeDecade.yearRange[0]}–${activeDecade.yearRange[1]} · 虚岁 ${activeDecade.ageRange[0]}–${activeDecade.ageRange[1]} · ${activeDecade.palaceName}` : "所选年份未落在库返回的大限区间内"}</p><p className="mt-1 text-[10px] leading-5 text-slate-600">大限四化：{currentHoroscope.decadal.mutagen.join("、") || "未返回"}</p></article>
          <article className="rounded-xl border border-blue-100 bg-blue-50/60 p-3"><h4 className="text-[10px] font-semibold text-blue-950">流年 · {currentHoroscope.yearly.heavenlyStem}{currentHoroscope.yearly.earthlyBranch}</h4><p className="mt-1 text-xs leading-5 text-slate-700">参考日期 {currentHoroscope.solarDate} · 虚岁 {currentHoroscope.age.nominalAge}{yearlyPalace ? ` · 流年命宫 ${yearlyPalace}` : ""}</p><p className="mt-1 text-[10px] leading-5 text-slate-600">流年四化：{currentHoroscope.yearly.mutagen.join("、") || "未返回"}</p><p className="mt-1 text-[10px] leading-5 text-slate-600">流年流曜：{yearlyStars.slice(0, 10).join("、") || "未返回"}</p></article>
        </div>
        <div className="mt-4 border-t border-slate-200 pt-4">
          <div><h4 className="text-xs font-semibold text-slate-900">流月 · 农历 {selectedYear} 年</h4><p className="mt-1 text-[10px] leading-5 text-slate-500">按 iztro 的农历流月列表显示；闰月默认拆为前、后两段，每段附农历日期范围。</p></div>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">{monthlyList.map((flowMonth, index) => {
            const monthLabel = `${flowMonth.isLeapMonth ? "闰" : "农历"}${flowMonth.month}月`;
            const partLabel = flowMonth.part === "first" ? "上半月" : flowMonth.part === "second" ? "下半月" : "整月";
            return <button key={`${flowMonth.month}-${flowMonth.part}-${index}`} type="button" onClick={() => setSelectedMonthIndex(index)} aria-pressed={selectedMonthIndex === index} className={`rounded-xl border p-2.5 text-left transition ${selectedMonthIndex === index ? "border-violet-400 bg-violet-600 text-white" : "border-slate-200 bg-white text-slate-800 hover:border-violet-300"}`}><span className="block text-[10px] opacity-75">{monthLabel} · {partLabel}</span><span className="mt-1 block text-sm font-semibold">{flowMonth.heavenlyStem}{flowMonth.earthlyBranch}</span><span className={`mt-1 block text-[10px] ${selectedMonthIndex === index ? "text-violet-50" : "text-slate-500"}`}>{lunarDayText(flowMonth.dayRange[0])}–{lunarDayText(flowMonth.dayRange[1])}</span></button>;
          })}</div>
          {selectedMonthly && <div className="mt-3 rounded-2xl border border-violet-100 bg-violet-50/60 p-4"><h5 className="text-xs font-semibold text-violet-950">{selectedMonthly.isLeapMonth ? "闰" : "农历"}{selectedMonthly.month}月 · {selectedMonthly.part === "first" ? "上半月" : selectedMonthly.part === "second" ? "下半月" : "整月"} · {selectedMonthly.heavenlyStem}{selectedMonthly.earthlyBranch}</h5><p className="mt-1 text-[10px] leading-5 text-slate-700">农历日期 {lunarDayText(selectedMonthly.dayRange[0])}–{lunarDayText(selectedMonthly.dayRange[1])}{monthlyPalace ? ` · 流月命宫 ${monthlyPalace}` : ""}</p><p className="mt-1 text-[10px] leading-5 text-slate-600">流月四化：{selectedMonthly.mutagen.join("、") || "未返回"}</p><p className="mt-1 text-[10px] leading-5 text-slate-600">流月流曜：{monthlyStars.slice(0, 10).join("、") || "未返回"}</p></div>}
        </div>
        <p className="mt-3 text-[10px] leading-5 text-slate-500">以上是 iztro 默认运限配置计算出的盘面项目，只展示星曜和宫位数据，不自动生成吉凶结论；不同流派的运限分界与读法可能不同。</p>
      </section>
      <section className="mt-4 grid gap-2 md:grid-cols-2">
        {palaceFocus.filter((palaceName) => palaceName !== "命宫").map((palaceName) => <div key={palaceName} className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="text-xs font-semibold text-slate-800">{palaceName}宫 · 传统观察主题</h3><p className="mt-2 text-xs leading-5 text-slate-600">{personPalaceRead(chart, palaceName, palaceName)}</p></div>)}
      </section>
      <section className="mt-5">
        <div className="flex flex-wrap items-end justify-between gap-2"><div><h3 className="text-sm font-semibold text-slate-900">十二宫与星曜分布</h3><p className="mt-1 text-[10px] text-slate-500">手机端左右滑动，点开宫位查看主星、辅星和四化</p></div><span className="text-[10px] text-slate-500">命宫主星：{keyStars.join("、") || "空宫"}</span></div>
        <div className="mt-3 grid grid-flow-col auto-cols-[minmax(210px,78vw)] snap-x gap-2 overflow-x-auto pb-2 sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-2 sm:overflow-visible xl:grid-cols-3">
          {chart.palaces.map((palace) => {
            const opened = expandedPalace === palace.name;
            const allStars = [...palace.majorStars, ...palace.minorStars];
            return <button type="button" key={palace.name} aria-expanded={opened} onClick={() => setExpandedPalace(opened ? null : palace.name)} className={`snap-start rounded-2xl border p-3 text-left transition ${opened ? "border-violet-300 bg-violet-50/60" : "border-slate-200 bg-white hover:border-violet-200"}`}>
              <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-slate-900">{palace.name}{palace.isBodyPalace ? " · 身宫" : ""}</span><span className="font-display text-sm text-slate-500">{palace.earthlyBranch}</span></div>
              <p className="mt-2 min-h-5 text-[11px] leading-5 text-slate-700">{palace.majorStars.map((star) => `${star.name}${star.mutagen ? `·化${star.mutagen}` : ""}`).join("、") || "本宫无主星"}</p>
              {opened && <div className="mt-2 border-t border-violet-200/70 pt-2"><p className="text-[10px] leading-5 text-slate-600">{personPalaceRead(chart, palace.name, palace.name)}</p>{palace.minorStars.length > 0 && <p className="mt-1 text-[10px] leading-5 text-slate-500">辅星：{palace.minorStars.map((star) => star.name).join("、")}</p>}{palace.adjectiveStars.length > 0 && <p className="mt-1 text-[10px] leading-5 text-slate-500">杂曜：{palace.adjectiveStars.slice(0, 5).map((star) => star.name).join("、")}</p>}</div>}
            </button>;
          })}
        </div>
      </section>
      <section className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4"><h3 className="text-xs font-semibold text-slate-800">本命四化落点</h3><p className="mt-2 text-xs leading-5 text-slate-600">{mutagens.length ? mutagens.map((entry) => `${entry.star}化${entry.mutagen}在${entry.palace}宫`).join("；") : "本盘未返回四化落点。"}</p></section>
      {onCloseReadings && <p className="mt-3 text-[10px] text-slate-500">命盘按选择的时辰生成。若出生时间有误，宫位和星曜分布也可能变化。</p>}
    </article>
  );
}

function TimeCandidatePicker({ label, knownHour, value, onChange }: { label: string; knownHour?: number | null; value: number | null; onChange: (index: number) => void }) {
  if (knownHour !== undefined && knownHour !== null) return <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">{label}时辰：{timeNames[timeIndex(knownHour)]}（按填写的{String(knownHour).padStart(2, "0")}:00 排盘）</div>;
  return <div className="rounded-2xl border border-amber-200 bg-amber-50/75 p-3"><p className="flex items-center gap-2 text-xs font-semibold text-amber-950"><CircleHelp className="h-4 w-4" />{label}出生时辰未知</p><p className="mt-1 text-[10px] leading-5 text-amber-950/75">紫微盘不能唯一确定。可点选下列一个时辰作为假设并查看候选盘；不会替你挑“最好”或“最差”。</p><div className="mt-2 flex flex-wrap gap-1.5">{timeNames.map((name, index) => <button type="button" key={`${label}-${index}`} aria-pressed={value === index} onClick={() => onChange(index)} className={`rounded-lg border px-2 py-1.5 text-[10px] transition ${value === index ? "border-violet-400 bg-violet-600 text-white" : "border-amber-200 bg-white text-amber-950 hover:border-violet-300"}`}>{name}{index === 0 ? " 00–01" : index === 12 ? " 23–24" : ` ${String(index * 2 - 1).padStart(2, "0")}–${String(index * 2 + 1).padStart(2, "0")}`}</button>)}</div></div>;
}

export default function ZiweiReadingStudio({ profile, relationships }: Props) {
  const [targetId, setTargetId] = useState("");
  const [selfGender, setSelfGender] = useState<Gender>("");
  const [targetGender, setTargetGender] = useState<Gender>("");
  const [selfCandidate, setSelfCandidate] = useState<number | null>(null);
  const [targetCandidate, setTargetCandidate] = useState<number | null>(null);
  const [showChart, setShowChart] = useState(false);

  const targets = useMemo(() => {
    const seen = new Set<string>();
    return relationships.filter((person) => {
      const key = person.personKey ?? `${person.targetName}-${person.relationshipType}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [relationships]);
  const target = targets.find((person) => person.id === targetId) ?? null;
  const selfIndex = profile.hour === undefined || profile.hour === null ? selfCandidate : timeIndex(profile.hour);
  const targetHour = target?.targetDate.hour;
  const targetIndex = targetHour === undefined || targetHour === null ? targetCandidate : timeIndex(targetHour);

  const charts = useMemo(() => {
    if (!showChart || !selfGender || selfIndex === null || selfIndex === undefined) return { self: null, target: null, error: null as string | null };
    try {
      const self = astro.bySolar(dateText(profile), selfIndex, selfGender, true, "zh-CN");
      const other = target && targetGender && targetIndex !== null && targetIndex !== undefined
        ? astro.bySolar(dateText(target.targetDate), targetIndex, targetGender, true, "zh-CN")
        : null;
      return { self, target: other, error: null as string | null };
    } catch (reason) {
      return { self: null, target: null, error: reason instanceof Error ? reason.message : "排盘失败，请核对日期与时辰。" };
    }
  }, [profile, selfGender, selfIndex, showChart, target, targetGender, targetIndex]);

  const canRead = Boolean(selfGender && selfIndex !== null && selfIndex !== undefined && (!target || (targetGender && targetIndex !== null && targetIndex !== undefined)));
  const comparisonPalaces: PalaceName[] = ["命宫", "夫妻", "官禄", "财帛"];

  return (
    <section className="mx-auto w-full max-w-7xl" aria-labelledby="ziwei-reading-title">
      <header className="surface-panel overflow-hidden rounded-3xl">
        <div className="grid gap-5 bg-gradient-to-br from-violet-50 via-white to-sky-50 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"><div><p className="section-kicker">ZI WEI DOU SHU / PURPLE STAR ASTROLOGY</p><h1 id="ziwei-reading-title" className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">紫微斗数解读</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">查看十二宫、主星、命身宫与四化落点。可看本人，也可选档案中的关系人并列查看双方结构。</p></div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-xs font-medium text-slate-700">本人排盘性别<select value={selfGender} onChange={(event) => { setSelfGender(event.target.value as Gender); setShowChart(false); }} className="form-input mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm"><option value="">请选择</option><option value="男">男</option><option value="女">女</option></select></label>
            <label className="text-xs font-medium text-slate-700">对照关系人（可选）<select value={targetId} onChange={(event) => { setTargetId(event.target.value); setTargetGender(""); setTargetCandidate(null); setShowChart(false); }} className="form-input mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm"><option value="">只看本人</option>{targets.map((person) => <option key={person.id} value={person.id}>{person.targetName} · {person.relationshipType}</option>)}</select></label>
            {target && <label className="text-xs font-medium text-slate-700 sm:col-span-2">对方排盘性别<select value={targetGender} onChange={(event) => { setTargetGender(event.target.value as Gender); setShowChart(false); }} className="form-input mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm"><option value="">请选择</option><option value="男">男</option><option value="女">女</option></select></label>}
          </div>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-slate-200 bg-white/80 px-5 py-3 text-[10px] leading-5 text-slate-500 sm:px-7"><span>支持公历输入，库内换算农历排盘</span><span>按中国标准时间 UTC+8</span><span>暂不校正真太阳时</span><span>排盘性别按所选参数进入算法</span><span>无出生时辰时提供候选，不代选</span></div>
      </header>

      <div className="mt-4 space-y-3">
        <TimeCandidatePicker label="本人" knownHour={profile.hour} value={selfCandidate} onChange={(index) => { setSelfCandidate(index); setShowChart(false); }} />
        {target && <TimeCandidatePicker label={target.targetName} knownHour={targetHour} value={targetCandidate} onChange={(index) => { setTargetCandidate(index); setShowChart(false); }} />}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4"><p className="max-w-3xl text-[11px] leading-5 text-slate-600">排盘库需要性别参数。不同流派在四化、闰月处理等处可能采用不同规则；当前采用 iztro 默认配置，页面会显示实际排出的历法与星曜位置。</p><button type="button" disabled={!canRead} onClick={() => setShowChart(true)} className="primary-button inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"><Compass className="h-4 w-4" />排出并解读命盘</button></div>
      {!canRead && <p className="mt-3 text-xs text-slate-500">请先选择本人排盘性别；出生时辰未知时，也请点选一个候选时辰后再排盘。</p>}
      {charts.error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{charts.error}</p>}
      {showChart && charts.self && <div className={`mt-4 grid items-start gap-4 ${charts.target ? "2xl:grid-cols-2" : "grid-cols-1"}`}>
        <ChartPanel name={profile.name || "我"} chart={charts.self} onCloseReadings={profile.hour === undefined || profile.hour === null} />
        {charts.target && target && <ChartPanel name={target.targetName} chart={charts.target} onCloseReadings={targetHour === undefined || targetHour === null} />}
        {charts.target && target && <section className="surface-panel rounded-3xl p-5 sm:p-6 2xl:col-span-2"><div className="flex items-center gap-2"><Stars className="h-4 w-4 text-violet-600" /><h2 className="text-base font-semibold text-slate-900">双方结构并列</h2></div><p className="mt-1 text-xs leading-5 text-slate-500">这里按相同宫位展示两张盘的配置，帮助提出具体沟通问题；没有把星曜组合换算成关系分数或古法合婚结论。</p><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{comparisonPalaces.map((palaceName) => {
          const mine = charts.self?.palace(palaceName);
          const theirs = charts.target?.palace(palaceName);
          const myStars = mine?.majorStars.map((star) => star.name).join("、") || "空宫";
          const theirStars = theirs?.majorStars.map((star) => star.name).join("、") || "空宫";
          return <article key={palaceName} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"><h3 className="text-xs font-semibold text-slate-800">{palaceName}宫</h3><p className="mt-2 text-xs leading-5 text-slate-600"><b className="text-slate-800">{profile.name}：</b>{myStars}</p><p className="mt-1 text-xs leading-5 text-slate-600"><b className="text-slate-800">{target.targetName}：</b>{theirStars}</p><p className="mt-3 border-t border-slate-200 pt-2 text-[10px] leading-5 text-violet-900">可以讨论：双方在{palaceName}主题上，各自最看重什么？哪些期待需要明确说出来？</p></article>;
        })}</div></section>}
        <details className="surface-panel rounded-2xl p-4 2xl:col-span-2"><summary className="cursor-pointer text-xs font-semibold text-slate-700">排盘与解读资料来源</summary><div className="mt-3 space-y-2 text-[11px] leading-5 text-slate-600"><p>排盘由开源库 iztro 依公历日期、时辰和性别参数计算；紫微斗数流派有差异，当前显示的是库默认配置结果。</p><p>星曜提示是本产品按命宫主星及宫位编辑的简明传统取象，用于阅读与自我观察，不是古籍原文或科学结论。</p><div className="flex flex-wrap gap-x-4 gap-y-1"><a className="text-blue-700" href="https://github.com/SylarLong/iztro" target="_blank" rel="noreferrer">iztro 源码与 MIT 许可证 ↗</a><a className="text-blue-700" href="https://docs.iztro.com/quick-start" target="_blank" rel="noreferrer">官方排盘接口文档 ↗</a><a className="text-blue-700" href="https://docs.iztro.com/learn/major-star" target="_blank" rel="noreferrer">十四主星入门资料 ↗</a><a className="text-blue-700" href="https://docs.iztro.com/posts/palace" target="_blank" rel="noreferrer">十二宫说明 ↗</a></div></div></details>
      </div>}
    </section>
  );
}
