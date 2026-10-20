"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Check, CircleHelp, Coins, Dices, History, Plus, RotateCcw, ScrollText, Sparkles, Trash2, X } from "lucide-react";
import { hexagramSymbol, lineChanges, lineIsYang, randomInteger, resolveHexagram, tossCoinThrow, tossCup, type CoinLine } from "@/lib/divination";
import { drawDivinationLot, type DivinationLot } from "@/lib/divinationLots";
import { loadDivinationHistory, saveDivinationHistory } from "@/lib/storage";
import type { SavedDivinationDetail, SavedDivinationReading } from "@/lib/types";
import type { DecisionMode, RitualEvent } from "@/components/experience/experienceTypes";

const MAX_HISTORY = 12;
type Mode = DecisionMode;
type SavedReading = SavedDivinationReading;
type CupReading = ReturnType<typeof tossCup>;

function makeId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="section-kicker">{children}</p>;
}

type DecisionDivinationStudioProps = {
  onRitual?: (event: RitualEvent) => void;
  animateRitual?: boolean;
  presentation?: "reader" | "scene";
  onOpenDetails?: () => void;
  initialMode?: DecisionMode;
  onModeChange?: (mode: DecisionMode) => void;
};

export default function DecisionDivinationStudio({ onRitual, animateRitual = false, presentation = "reader", onOpenDetails, initialMode = "lot", onModeChange }: DecisionDivinationStudioProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [options, setOptions] = useState(["吃面", "吃饭"]);
  const [choiceQuestion, setChoiceQuestion] = useState("");
  const [choiceResult, setChoiceResult] = useState<string | null>(null);
  const [cupQuestion, setCupQuestion] = useState("");
  const [cupResult, setCupResult] = useState<CupReading | null>(null);
  const [lotQuestion, setLotQuestion] = useState("");
  const [lotResult, setLotResult] = useState<DivinationLot | null>(null);
  const [hexQuestion, setHexQuestion] = useState("");
  const [lines, setLines] = useState<CoinLine[]>([]);
  const [history, setHistory] = useState<SavedReading[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [expandedReadingId, setExpandedReadingId] = useState("");
  const [currentId, setCurrentId] = useState("");
  const [message, setMessage] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [busy, setBusy] = useState(false);
  const ritualTimer = useRef<number | null>(null);
  useEffect(() => () => { if (ritualTimer.current !== null) window.clearTimeout(ritualTimer.current); }, []);

  function performRitual(event: RitualEvent, complete: () => void) {
    if (busy) return;
    setMessage("");
    setCurrentId("");
    if (onRitual) onRitual(event);
    if (!animateRitual) { complete(); return; }
    setBusy(true);
    const duration = event.kind === "lot" ? 2800 : 1500;
    ritualTimer.current = window.setTimeout(() => { ritualTimer.current = null; complete(); setBusy(false); }, duration);
  }

  useEffect(() => {
    try {
      setHistory(loadDivinationHistory());
    } catch {
      setMessage("暂时无法读取占卜记录；原有的人际关系档案不受影响。");
    }
  }, []);

  const hexagram = useMemo(() => resolveHexagram(lines), [lines]);
  const currentQuestion = mode === "choice" ? choiceQuestion : mode === "cups" ? cupQuestion : mode === "lot" ? lotQuestion : hexQuestion;
  const currentSummary = mode === "choice" && choiceResult
    ? `随机抽到「${choiceResult}」`
    : mode === "cups" && cupResult
      ? `${cupResult.result}（${cupResult.faces.join("、")}朝上）`
      : mode === "lot" && lotResult
        ? `第 ${lotResult.number} 签 · ${lotResult.rank}「${lotResult.title}」`
        : mode === "hexagram" && hexagram
        ? `${hexagram.current.number}卦${hexagram.current.name}${hexagram.movingLines.length ? `，变为${hexagram.changed.number}卦${hexagram.changed.name}` : ""}`
        : "";
  const hasCurrentResult = Boolean(currentSummary && currentId);
  const currentIsSaved = savedIds.includes(currentId);

  function drawChoice() {
    const usable = options.map((value) => value.trim()).filter(Boolean);
    if (usable.length < 2) {
      setMessage("请至少填写两个选项。");
      return;
    }
    const result = usable[randomInteger(usable.length)];
    const id = makeId();
    setChoiceResult(null);
    performRitual({ id, kind: "choice", options: usable, selection: result }, () => { setChoiceResult(result); setCurrentId(id); });
  }

  function drawCup() {
    if (!cupQuestion.trim()) {
      setMessage("先写一个可以用“是 / 否”回答的问题。");
      return;
    }
    const result = tossCup();
    const id = makeId();
    setCupResult(null);
    performRitual({ id, kind: "cups", faces: result.faces }, () => { setCupResult(result); setCurrentId(id); });
  }

  function drawLot() {
    if (!lotQuestion.trim()) {
      setMessage("先写下这次想梳理的问题，再摇签筒。");
      return;
    }
    const result = drawDivinationLot();
    const id = makeId();
    setLotResult(null);
    performRitual({ id, kind: "lot", lotNumber: result.number, lotRank: result.rank, lotTitle: result.title }, () => { setLotResult(result); setCurrentId(id); });
  }

  function castNextLine() {
    if (!hexQuestion.trim()) {
      setMessage("先写下这次想梳理的问题，再开始掷币。");
      return;
    }
    if (lines.length >= 6) return;
    const thrown = tossCoinThrow();
    const line = thrown.line;
    const next = [...lines, line];
    const id = makeId();
    performRitual({ id, kind: "coins", line, coins: thrown.coins, lines: next }, () => { setLines(next); if (next.length === 6) setCurrentId(id); });
  }

  function resetHexagram() {
    setLines([]);
    setCurrentId("");
    setMessage("");
  }

  function currentDetail(): SavedDivinationDetail | null {
    if (mode === "choice" && choiceResult) {
      return { mode, options: options.map((option) => option.trim()).filter(Boolean), selection: choiceResult };
    }
    if (mode === "cups" && cupResult) return { mode, faces: cupResult.faces, outcome: cupResult.result };
    if (mode === "lot" && lotResult) return { mode, number: lotResult.number, rank: lotResult.rank, title: lotResult.title, reflection: lotResult.reflection };
    if (mode === "hexagram" && lines.length === 6) return { mode, lines: [...lines] };
    return null;
  }

  function saveReading() {
    if (!hasCurrentResult || currentIsSaved) return;
    const detail = currentDetail();
    if (!detail) {
      setMessage("这次结果缺少完整过程，暂时不能保存；请重新起卦后再试。");
      return;
    }
    const entry: SavedReading = {
      id: currentId,
      mode,
      question: currentQuestion.trim() || "日常选择",
      result: currentSummary,
      createdAt: new Date().toISOString(),
      detail,
    };
    const next = [entry, ...history].slice(0, MAX_HISTORY);
    try {
      saveDivinationHistory(next);
      setHistory(next);
      setSavedIds((previous) => [...previous, currentId]);
      setMessage("已保存在这台设备的浏览器中。");
    } catch {
      setMessage("保存失败，可能是浏览器存储空间不足；现有关系档案未受影响。");
    }
  }

  function clearHistory() {
    try {
      saveDivinationHistory([]);
      setHistory([]);
      setSavedIds([]);
      setExpandedReadingId("");
      setConfirmClear(false);
      setMessage("占卜记录已清除。");
    } catch {
      setMessage("没有清除成功，请检查浏览器存储设置后重试。");
    }
  }

  const modes: Array<{ id: Exclude<Mode, "choice">; label: string; detail: string; icon: typeof Dices }> = [
    { id: "cups", label: "掷筊 · 圣杯", detail: "两枚筊杯，适合是非题", icon: Sparkles },
    { id: "lot", label: "签筒抽签", detail: "摇动签筒，抽出一支签", icon: ScrollText },
    { id: "hexagram", label: "铜钱六爻", detail: "三枚铜钱，逐爻成卦", icon: Coins },
  ];

  function selectMode(nextMode: Mode) {
    setMode(nextMode);
    onModeChange?.(nextMode);
    setCurrentId("");
    setChoiceResult(null);
    setCupResult(null);
    setLotResult(null);
    setLines([]);
    setMessage("");
  }

  function updateQuestion(value: string) {
    if (mode === "choice") { setChoiceQuestion(value); setChoiceResult(null); }
    if (mode === "cups") { setCupQuestion(value); setCupResult(null); }
    if (mode === "lot") { setLotQuestion(value); setLotResult(null); }
    if (mode === "hexagram") { setHexQuestion(value); setLines([]); }
    setCurrentId("");
    setMessage("");
  }

  if (presentation === "scene") {
    const buttonClass = "min-h-11 rounded-xl border px-2.5 py-2 text-left transition duration-200 disabled:opacity-50";
    const inactiveClass = "border-[#8cb4d4]/20 bg-[#091321]/72 text-[#b8c9dc] hover:border-[#72dff6]/55 hover:bg-[#52b8dc]/[.08] hover:text-[#eff8ff]";
    const activeClass = "border-[#72dff6]/75 bg-gradient-to-br from-[#53c7ea]/[.19] to-[#7887e9]/[.11] text-[#f2f8ff] shadow-[inset_0_1px_0_#d7f2ff33,0_0_22px_#58cdeb18]";
    const actionLabel = mode === "choice" ? "替我选一个" : mode === "cups" ? "掷圣杯" : mode === "lot" ? "摇签筒，抽一支" : lines.length >= 6 ? "六爻已完成" : `掷第 ${lines.length + 1} 次`;
    return <section className="decision-console w-full rounded-2xl border border-[#82c4e4]/35 bg-gradient-to-br from-[#101a2c]/95 via-[#0b1422]/95 to-[#070d17]/95 p-4 text-[#e8f1fa] shadow-[0_24px_80px_#0009,inset_0_1px_0_#ffffff12] backdrop-blur-2xl sm:p-[18px]" aria-label="问卦操作台">
      <div className="mb-3.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[10px] tracking-[.15em] text-[#9fc8df]"><span className="h-1.5 w-1.5 rounded-full bg-[#71e2ff] shadow-[0_0_9px_#71e2ff99]" />03 / DIVINATION <span className="h-px w-7 bg-gradient-to-r from-[#72dff6]/70 to-transparent" /> 此刻起卦</p>
          <h2 className="mt-1.5 text-[19px] font-medium tracking-[.04em] text-[#f0f6fc]">把问题，交给此刻</h2>
          <p className="mt-1 text-[11px] tracking-[.025em] text-[#a7b8ca]">选一种方式，开始梳理</p>
        </div>
        {onOpenDetails && <button type="button" onClick={onOpenDetails} className="shrink-0 rounded-lg border border-[#8cb4d4]/25 bg-[#08111e]/55 px-2.5 py-2 text-[10px] text-[#c4d6e8] transition hover:border-[#72dff6]/65 hover:bg-[#5bc9e8]/[.09] hover:text-white">记录与说明 <span className="ml-1 text-[#81ddf2]">↗</span></button>}
      </div>

      <div className="grid grid-cols-3 gap-2" role="group" aria-label="选择问卦方式">
        {modes.map(({ id, label, icon: Icon }) => <button key={id} type="button" disabled={busy} aria-pressed={mode === id} onClick={() => selectMode(id)} className={`${buttonClass} ${mode === id ? activeClass : inactiveClass}`}>
          <span className="flex items-center gap-1.5 text-[11px] font-medium"><Icon className="h-3.5 w-3.5 shrink-0 text-[#8bdcf3]" />{id === "cups" ? "圣杯掷筊" : id === "lot" ? "签筒抽签" : "铜钱六爻"}</span>
          <span className="mt-1 block pl-5 text-[9px] tracking-[.02em] text-[#a1b2c5]">{id === "cups" ? "是非问答" : id === "lot" ? "抽取一支签" : "六次成卦"}</span>
        </button>)}
      </div>
      <button type="button" disabled={busy} aria-pressed={mode === "choice"} onClick={() => selectMode("choice")} className={`mt-2 inline-flex min-h-8 items-center rounded-full border px-3 py-1.5 text-[10px] transition ${mode === "choice" ? activeClass : inactiveClass}`}><Dices className="mr-1.5 h-3.5 w-3.5 text-[#8bdcf3]" />日常帮我选一个 <span className="ml-1.5 text-[#9db0c3]">· 随机抽选</span></button>

      <fieldset disabled={busy} aria-busy={busy} className="mt-3.5 min-w-0 border-t border-[#ffffff12] pt-3">
        <label htmlFor="scene-divination-question" className="mb-1.5 block text-[11px] text-[#c5d3e1]">{mode === "cups" ? "写一个可以用是或否回答的问题" : mode === "choice" ? "这次想选什么？（选填）" : "这次想梳理的问题"}</label>
        <textarea id="scene-divination-question" rows={2} maxLength={160} value={currentQuestion} onChange={(event) => updateQuestion(event.target.value)} placeholder={mode === "cups" ? "例如：今天走这条路会更方便吗？" : mode === "choice" ? "例如：午饭吃什么？" : mode === "lot" ? "例如：我接下来应该先处理哪件事？" : "尽量具体；结果用于整理思路"} className="block w-full resize-y rounded-xl border border-[#8cb4d4]/25 bg-[#07101c]/75 px-3 py-2.5 text-[12px] leading-5 text-[#f0f6fc] outline-none transition placeholder:text-[#8398af] focus:border-[#72dff6]/75 focus:bg-[#081321]/95 focus:shadow-[0_0_0_3px_#72dff61c]" />

        {mode === "choice" && <div className="mt-2 grid grid-cols-2 gap-1.5">
          {options.map((option, index) => <div key={index} className="flex min-w-0 items-center gap-1">
            <label className="sr-only" htmlFor={`scene-choice-option-${index}`}>选项 {index + 1}</label>
            <input id={`scene-choice-option-${index}`} maxLength={40} value={option} onChange={(event) => { setOptions((previous) => previous.map((item, itemIndex) => itemIndex === index ? event.target.value : item)); setChoiceResult(null); setCurrentId(""); }} placeholder={`选项 ${index + 1}`} className="min-w-0 flex-1 rounded-md border border-[#8cb4d4]/25 bg-[#07101c]/75 px-2.5 py-2 text-[11px] text-[#e8f1fa] outline-none placeholder:text-[#8398af] focus:border-[#72dff6]/75" />
            {options.length > 2 && <button type="button" aria-label={`删除选项 ${index + 1}`} onClick={() => setOptions((previous) => previous.filter((_, itemIndex) => itemIndex !== index))} className="px-1 text-[#9bb0c3] hover:text-white"><X className="h-3.5 w-3.5" /></button>}
          </div>)}
          <button type="button" disabled={options.length >= 4} onClick={() => setOptions((previous) => [...previous, ""])} className="justify-self-start rounded-md border border-dashed border-[#8cb4d4]/30 px-2 py-1.5 text-[10px] text-[#afc3d5] transition hover:border-[#72dff6]/65 hover:text-white disabled:opacity-40">+ 添加选项</button>
        </div>}

        {mode === "hexagram" && <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex flex-1 gap-1" aria-label={`已掷 ${lines.length} 爻，共六爻`}>
            {Array.from({ length: 6 }, (_, index) => <span key={index} className={`h-1.5 flex-1 rounded-full ${index < lines.length ? "bg-[#72dff6] shadow-[0_0_9px_#72dff677]" : "bg-[#ffffff20]"}`} />)}
          </div>
          <span className="text-[9px] text-[#a7b8ca]">从初爻起 · {lines.length}/6</span>
          {lines.length > 0 && <button type="button" onClick={resetHexagram} className="text-[9px] text-[#9bdff0] underline underline-offset-2">重来</button>}
        </div>}

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <button type="button" disabled={busy || (mode === "hexagram" && lines.length >= 6)} onClick={mode === "choice" ? drawChoice : mode === "cups" ? drawCup : mode === "lot" ? drawLot : castNextLine} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#a5e6f5]/60 bg-gradient-to-r from-[#128eaf] to-[#566bc2] px-4 py-2 text-[11px] font-medium text-white shadow-[0_0_20px_#38bbe52d] transition hover:brightness-110 disabled:cursor-wait disabled:opacity-55">
            {mode === "cups" ? <Sparkles className="h-3.5 w-3.5" /> : mode === "lot" ? <ScrollText className="h-3.5 w-3.5" /> : mode === "hexagram" ? <Coins className="h-3.5 w-3.5" /> : <Dices className="h-3.5 w-3.5" />}{busy ? "器物正在回应…" : actionLabel}
          </button>
          {hasCurrentResult && <button type="button" disabled={currentIsSaved} onClick={saveReading} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[#8cb4d4]/35 bg-[#091321]/55 px-3 py-2 text-[10px] text-[#c5d8e8] transition hover:border-[#72dff6]/70 hover:text-white disabled:opacity-55"><Check className="h-3.5 w-3.5" />{currentIsSaved ? "已保存" : "保存结果"}</button>}
        </div>
      </fieldset>

      {busy && <p role="status" className="mt-2 text-[10px] text-[#a9dff0]">{mode === "cups" ? "圣杯正在落下…" : mode === "lot" ? "签筒摇动，签子正在落下…" : mode === "hexagram" ? "铜钱正在落下…" : "正在抽选…"}</p>}
      {message && <p role="status" className="mt-2 text-[10px] leading-5 text-[#d6e8f5]">{message}</p>}
      {mode === "cups" && cupResult && <div className="mt-2 rounded-lg border border-[#72dff6]/25 bg-gradient-to-br from-[#53c7ea]/[.08] to-[#7887e9]/[.07] px-3 py-2.5" aria-live="polite"><p className="text-sm text-[#eff8ff]">{cupResult.result}<span className="ml-2 text-[10px] text-[#a7bfd1]">{cupResult.faces.join(" / ")}朝上</span></p><p className="mt-1 text-[9px] leading-4 text-[#9db1c4]">浏览器随机模拟，仅作娱乐与自我整理。</p></div>}
      {mode === "lot" && lotResult && <div className="mt-2 rounded-lg border border-[#72dff6]/25 bg-gradient-to-br from-[#53c7ea]/[.08] to-[#7887e9]/[.07] px-3 py-2.5" aria-live="polite"><p className="text-[9px] tracking-wider text-[#a9dff0]">第 {String(lotResult.number).padStart(2, "0")} 签 · {lotResult.rank}</p><p className="mt-1 text-sm text-[#eff8ff]">{lotResult.title}</p><p className="mt-1 text-[10px] leading-5 text-[#b6c8d8]">{lotResult.reflection}</p></div>}
      {mode === "choice" && choiceResult && <div className="mt-2 rounded-lg border border-[#72dff6]/25 bg-gradient-to-br from-[#53c7ea]/[.08] to-[#7887e9]/[.07] px-3 py-2.5" aria-live="polite"><p className="text-[9px] text-[#a9dff0]">这次随机抽到</p><p className="mt-0.5 text-base text-[#eff8ff]">{choiceResult}</p></div>}
      {mode === "hexagram" && hexagram && lines.length === 6 && <div className="mt-2 rounded-lg border border-[#72dff6]/25 bg-gradient-to-br from-[#53c7ea]/[.08] to-[#7887e9]/[.07] px-3 py-2.5" aria-live="polite"><p className="text-sm text-[#eff8ff]">本卦 · {hexagram.current.number} 卦 {hexagram.current.name}</p><p className="mt-1 text-[10px] leading-5 text-[#b6c8d8]">{hexagram.movingLines.length ? `动爻在第 ${hexagram.movingLines.join("、")} 爻，变化为 ${hexagram.changed.number} 卦 ${hexagram.changed.name}。` : "本次没有动爻，卦象保持不变。"}</p></div>}
      <p className="mt-2.5 border-t border-[#ffffff10] pt-2 text-[10px] leading-[1.65] text-[#9aabba]">随机模拟，仅用于娱乐与自我整理，不代表神明回应或确定预言。六爻规则与结果细节可在“记录与说明”中查看。</p>
    </section>;
  }

  return (
    <section className="mx-auto w-full max-w-6xl" aria-labelledby="decision-title">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <SectionLabel>DIVINATION / 问卦与选择</SectionLabel>
          <h1 id="decision-title" className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">选择一种问卦方式</h1>
          <p className="mt-1.5 text-sm text-slate-600">掷筊、签筒、铜钱六爻；日常小选择仍可单独抽选。</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-950"><CircleHelp className="h-4 w-4" />仅供娱乐与自我整理，不是预测</div>
      </div>

      <div className="mb-2 grid gap-2 md:grid-cols-3" role="group" aria-label="选择问卦方式">
        {modes.map(({ id, label, detail, icon: Icon }) => <button key={id} type="button" disabled={busy} aria-pressed={mode === id} onClick={() => selectMode(id)} className={`rounded-2xl border p-4 text-left transition ${mode === id ? "border-blue-300 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:border-blue-200"}`}>
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Icon className="h-4 w-4 text-blue-700" />{label}</span><span className="mt-1 block text-xs text-slate-500">{detail}</span>
        </button>)}
      </div>
      <button type="button" disabled={busy} aria-pressed={mode === "choice"} onClick={() => selectMode("choice")} className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${mode === "choice" ? "border-blue-300 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-600 hover:border-blue-200"}`}><Dices className="h-4 w-4 text-blue-700" />日常帮我选一个 · 2–4 个选项</button>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,.75fr)]">
        <div className="surface-panel min-w-0 rounded-3xl p-4 sm:p-6" role="tabpanel">
          <fieldset disabled={busy} aria-busy={busy} className="min-w-0">
          {mode === "choice" && <div>
            <p className="section-kicker">QUICK DRAW / 随机抽选</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">这次想选什么？</h2>
            <label className="mt-4 block text-xs font-medium text-slate-600" htmlFor="choice-question">简单写下问题（选填）</label>
            <input id="choice-question" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-400" maxLength={120} placeholder="例如：午饭吃什么？" value={choiceQuestion} onChange={(event) => { setChoiceQuestion(event.target.value); setChoiceResult(null); setCurrentId(""); }} />
            <div className="mt-4 space-y-2">
              {options.map((option, index) => <div key={index} className="flex items-center gap-2"><label className="sr-only" htmlFor={`choice-option-${index}`}>选项 {index + 1}</label><input id={`choice-option-${index}`} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-400" maxLength={40} placeholder={`选项 ${index + 1}`} value={option} onChange={(event) => { setOptions((previous) => previous.map((item, itemIndex) => itemIndex === index ? event.target.value : item)); setChoiceResult(null); setCurrentId(""); }} />{options.length > 2 && <button type="button" aria-label={`删除选项 ${index + 1}`} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" onClick={() => { setOptions((previous) => previous.filter((_, itemIndex) => itemIndex !== index)); setChoiceResult(null); setCurrentId(""); }}><X className="h-4 w-4" /></button>}</div>)}
            </div>
            <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={options.length >= 4} className="quiet-button disabled:opacity-50" onClick={() => { setOptions((previous) => [...previous, ""]); setChoiceResult(null); setCurrentId(""); }}><Plus className="h-4 w-4" />添加选项</button><button type="button" className="primary-button inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold" onClick={drawChoice}><Dices className="h-4 w-4" />替我抽一个</button></div>
            {choiceResult && <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4" aria-live="polite"><p className="text-xs font-semibold text-blue-800">这次随机抽到</p><p className="mt-1 text-2xl font-semibold text-slate-900">{choiceResult}</p><p className="mt-2 text-xs leading-5 text-slate-600">每个有效选项机会相同。抽签结果只是帮你启动选择，不代表哪一个一定更好。</p></div>}
          </div>}

          {mode === "cups" && <div>
            <p className="section-kicker">JIAO BEI / 掷筊问答</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">把问题写成“可以吗？”</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">例如：“今天走这条路会更方便吗？”一次只问一件事。</p>
            <label htmlFor="cup-question" className="mt-4 block text-xs font-medium text-slate-600">你想问的问题</label>
            <textarea id="cup-question" className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-blue-400" maxLength={160} placeholder="写一个能用是或否回答的问题" value={cupQuestion} onChange={(event) => { setCupQuestion(event.target.value); setCupResult(null); setCurrentId(""); }} />
            <button type="button" className="primary-button mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold" onClick={drawCup}><Sparkles className="h-4 w-4" />掷一次筊</button>
            {cupResult && <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4" aria-live="polite"><div className="flex flex-wrap gap-2"><span className="inline-flex min-w-20 justify-center rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-semibold">{cupResult.faces[0]}</span><span className="inline-flex min-w-20 justify-center rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-semibold">{cupResult.faces[1]}</span></div><h3 className="mt-3 text-xl font-semibold text-slate-900">{cupResult.result}</h3><p className="mt-1 text-sm leading-6 text-slate-700">{cupResult.result === "圣筊" ? "本次模拟为肯定。" : cupResult.result === "笑筊" ? "本次模拟没有明确答复，可以把问题说得更具体。" : "本次模拟为否定或暂缓的提示。"} 这是浏览器随机模拟，不代表神明回应。</p></div>}
            <p className="mt-3 text-[11px] leading-5 text-slate-500">本应用约定：平面记阳、凸面记阴；一平一凸为圣筊，两个平面为笑筊，两个凸面为伏筊（也有称阴筊）。各地叫法可能不同。</p>
          </div>}

          {mode === "lot" && <div>
            <p className="section-kicker">FORTUNE STICKS / 签筒抽签</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">写下问题，摇签筒抽一支</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">适合开放式问题。签文提供一个整理思路的角度，不替你做决定。</p>
            <label htmlFor="lot-question" className="mt-4 block text-xs font-medium text-slate-600">这次想梳理的问题</label>
            <textarea id="lot-question" className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-blue-400" maxLength={160} placeholder="例如：我接下来应该先处理哪件事？" value={lotQuestion} onChange={(event) => { setLotQuestion(event.target.value); setLotResult(null); setCurrentId(""); }} />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="relative flex h-28 w-24 items-center justify-center overflow-hidden rounded-t-[1.2rem] rounded-b-xl border border-amber-300/60 bg-gradient-to-b from-emerald-950 to-slate-950 shadow-inner" aria-hidden="true">
                <div className="absolute inset-x-3 top-2 h-2 rounded-full border border-amber-200/70 bg-slate-950" />
                <div className="flex h-16 items-end justify-center gap-1 pt-2">{[0, 1, 2, 3, 4, 5, 6].map((stick) => <span key={stick} className="w-1.5 rounded-t-sm bg-gradient-to-b from-amber-200 to-amber-700" style={{ height: `${38 + (stick * 13) % 28}px`, transform: `rotate(${(stick - 3) * 2}deg)` }} />)}</div>
                <span className="absolute bottom-2 text-[9px] tracking-[.28em] text-amber-100/70">签 筒</span>
              </div>
              <div className="flex-1">
                <button type="button" className="primary-button inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold" onClick={drawLot}><ScrollText className="h-4 w-4" />摇签筒，抽一支</button>
                <p className="mt-2 text-xs leading-5 text-slate-500">共 24 支原创签文，四种签类等量随机。</p>
              </div>
            </div>
            {lotResult && <div className="mt-5 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5" aria-live="polite">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold tracking-[.12em] text-amber-800">第 {String(lotResult.number).padStart(2, "0")} 签</p><h3 className="mt-1 text-xl font-semibold text-slate-900">{lotResult.title}</h3></div><span className="rounded-full border border-amber-300 bg-white px-3 py-1 text-sm font-semibold text-amber-900">{lotResult.rank}</span></div>
              <p className="mt-4 border-t border-amber-200/70 pt-3 text-sm leading-7 text-slate-700">{lotResult.reflection}</p>
              <p className="mt-2 text-[11px] leading-5 text-slate-500">此签为应用原创的随机反思提示，不是寺庙传统签文，也不代表吉凶预测。</p>
            </div>}
          </div>}

          {mode === "hexagram" && <div>
            <p className="section-kicker">THREE COINS / 六爻起卦</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">写下想梳理的问题，掷六次</h2>
            <label htmlFor="hex-question" className="mt-4 block text-xs font-medium text-slate-600">这次想梳理的问题</label>
            <textarea id="hex-question" className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-blue-400" maxLength={160} placeholder="尽量具体；结果用于整理思路" value={hexQuestion} onChange={(event) => { setHexQuestion(event.target.value); setLines([]); setCurrentId(""); }} />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">每次生成一爻，从最下面的初爻开始：已掷 {lines.length} / 6 次</p><button type="button" className="quiet-button" onClick={resetHexagram}><RotateCcw className="h-4 w-4" />重新开始</button></div>
            <div className="mt-3 grid grid-cols-6 gap-1.5 sm:gap-2" aria-label={`已生成 ${lines.length} 爻`}>
              {Array.from({ length: 6 }, (_, index) => {
                const line = lines[5 - index];
                return <div key={index} className={`rounded-xl border p-2 text-center ${line ? "border-blue-100 bg-blue-50" : "border-dashed border-slate-200 bg-slate-50"}`}><span className="block text-[10px] text-slate-500">{["上爻", "五爻", "四爻", "三爻", "二爻", "初爻"][index]}</span><div className="my-3 flex h-3 items-center justify-center gap-1" aria-label={line ? `${lineIsYang(line) ? "阳" : "阴"}${lineChanges(line) ? "动爻" : "爻"}` : "尚未生成"}>{line ? lineIsYang(line) ? <span className={`h-2 w-full rounded-full ${lineChanges(line) ? "bg-amber-500" : "bg-blue-700"}`} /> : <><span className={`h-2 w-[42%] rounded-full ${lineChanges(line) ? "bg-amber-500" : "bg-blue-700"}`} /><span className={`h-2 w-[42%] rounded-full ${lineChanges(line) ? "bg-amber-500" : "bg-blue-700"}`} /></> : <span className="h-1 w-8 rounded-full bg-slate-200" />}</div><span className="text-[10px] text-slate-500">{line ? line : "待掷"}</span></div>;
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={lines.length >= 6} className="primary-button inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50" onClick={castNextLine}><Coins className="h-4 w-4" />{lines.length >= 6 ? "六爻已完成" : `掷第 ${lines.length + 1} 次`}</button>{lines.length > 0 && lines.length < 6 && <button type="button" className="quiet-button" onClick={() => setLines((previous) => previous.slice(0, -1))}>撤回上一爻</button>}</div>
            <p className="mt-3 text-[11px] leading-5 text-slate-500">本应用固定使用三枚虚拟硬币；花面记 3、字面记 2。六爻从下往上生成，动爻用于显示变化后的卦象。</p>
            {hexagram && <div className="mt-5 grid gap-3 sm:grid-cols-2" aria-live="polite"><article className="rounded-2xl border border-blue-100 bg-blue-50 p-4"><span className="text-xs font-semibold text-blue-800">本卦 · {hexagram.current.number} 卦</span><div className="mt-1 flex items-baseline gap-2"><span className="text-4xl text-blue-800" aria-hidden="true">{hexagramSymbol(hexagram.current.number)}</span><h3 className="text-lg font-semibold text-slate-900">{hexagram.current.name}</h3></div><p className="mt-2 text-sm font-medium text-slate-700">主题：{hexagram.current.theme}</p><p className="mt-2 text-sm leading-6 text-slate-600">{hexagram.current.question}</p></article><article className="rounded-2xl border border-amber-100 bg-amber-50 p-4"><span className="text-xs font-semibold text-amber-800">变化后的卦 · {hexagram.changed.number} 卦</span><div className="mt-1 flex items-baseline gap-2"><span className="text-4xl text-amber-800" aria-hidden="true">{hexagramSymbol(hexagram.changed.number)}</span><h3 className="text-lg font-semibold text-slate-900">{hexagram.changed.name}</h3></div><p className="mt-2 text-sm font-medium text-slate-700">主题：{hexagram.changed.theme}</p><p className="mt-2 text-sm leading-6 text-slate-600">{hexagram.movingLines.length ? `动爻在第 ${hexagram.movingLines.join("、")} 爻。` : "这次没有动爻，本卦保持不变。"} 可以把主题当成一个观察角度，再回到现实条件做决定。</p></article></div>}
          </div>}

          </fieldset>
          {busy && <p role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">{mode === "cups" ? "筊杯正在落下…" : mode === "lot" ? "签筒摇动，签子正在落下…" : mode === "hexagram" ? "铜钱正在落下…" : "正在抽选…"}</p>}
          {message && <p role="status" className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700">{message}</p>}
          {hasCurrentResult && <button type="button" disabled={currentIsSaved} className="secondary-button mt-4 rounded-xl text-xs font-semibold disabled:opacity-60" onClick={saveReading}><Check className="h-4 w-4" />{currentIsSaved ? "已保存在本机" : "保存这次结果"}</button>}
          <div className="mt-5 flex gap-2 rounded-xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-500"><BookOpen className="mt-0.5 h-4 w-4 shrink-0" /><p>筊杯、签文和铜钱结果由本机随机过程生成，用作娱乐与自我整理，不代表神明回应或确定预言。六爻按当前应用的三枚虚拟硬币规则生成。<span className="mt-1 block">规则参考：<a className="underline decoration-slate-300 underline-offset-2 hover:text-blue-700" href="https://collections.nmth.gov.tw/CollectionContent.aspx?a=132&rno=2004.028.0887.0001" target="_blank" rel="noreferrer">国立台湾历史博物馆筊杯藏品说明</a>、<a className="underline decoration-slate-300 underline-offset-2 hover:text-blue-700" href="https://uaya.org/zh/learn/iching/using-the-oracle/casting-techniques/three-coins/" target="_blank" rel="noreferrer">三枚硬币起卦步骤</a>。</span></p></div>
        </div>

        <aside className="surface-panel rounded-3xl p-4 sm:p-5" aria-labelledby="divination-history-title">
          <div className="flex items-start justify-between gap-2"><div><SectionLabel>ON THIS DEVICE / 本机记录</SectionLabel><h2 id="divination-history-title" className="mt-1 flex items-center gap-2 text-base font-semibold text-slate-900"><History className="h-4 w-4 text-blue-700" />最近保存的结果</h2></div>{history.length > 0 && !confirmClear && <button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="清空占卜记录" onClick={() => setConfirmClear(true)}><Trash2 className="h-4 w-4" /></button>}</div>
          {confirmClear && <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3"><p className="text-xs leading-5 text-rose-900">清除本机保存的占卜记录？这个操作无法恢复，不会影响人际关系档案。</p><div className="mt-2 flex gap-2"><button type="button" className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white" onClick={clearHistory}>确认清除</button><button type="button" className="quiet-button" onClick={() => setConfirmClear(false)}>取消</button></div></div>}
          {history.length === 0 ? <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-5 text-center"><History className="mx-auto h-5 w-5 text-slate-400" /><p className="mt-2 text-sm font-medium text-slate-700">还没有保存的结果</p><p className="mt-1 text-xs leading-5 text-slate-500">每次结果由你决定是否保存。</p></div> : <ul className="mt-3 space-y-2">{history.map((item) => {
            const expanded = expandedReadingId === item.id;
            const itemModeLabel = item.mode === "choice" ? "随机选择" : item.mode === "cups" ? "掷筊" : item.mode === "lot" ? "签筒抽签" : "铜钱六爻";
            const detailsId = `saved-reading-${encodeURIComponent(item.id)}`;
            const restoredHexagram = item.detail?.mode === "hexagram" ? resolveHexagram(item.detail.lines) : null;
            return <li key={item.id} className="rounded-xl border border-slate-100 bg-white p-3">
              <button type="button" className="w-full text-left" aria-expanded={expanded} aria-controls={detailsId} aria-label={`${expanded ? "收起" : "展开"}${itemModeLabel}结果详情：${item.question}`} onClick={() => setExpandedReadingId(expanded ? "" : item.id)}>
                <p className="text-[10px] font-semibold text-blue-700">{itemModeLabel} · {new Date(item.createdAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.question}</p>
                <p className="mt-1 text-sm font-medium leading-5 text-slate-800">{item.result}</p>
                <span className="mt-2 block text-[10px] text-blue-700">{expanded ? "收起详情" : "展开详情"}</span>
              </button>
              {expanded && <div id={detailsId} role="region" aria-label={`${itemModeLabel}结果详情`} className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-600">
                {item.detail?.mode === "choice" && <><p>参与选项：{item.detail.options.join("、")}</p><p>抽中结果：{item.detail.selection}</p></>}
                {item.detail?.mode === "cups" && <><p>两枚筊杯：{item.detail.faces.join("、")}朝上</p><p>模拟结果：{item.detail.outcome}</p></>}
                {item.detail?.mode === "lot" && <><p>签号与签类：第 {item.detail.number} 签 · {item.detail.rank}</p><p>签题：{item.detail.title}</p><p>{item.detail.reflection}</p></>}
                {item.detail?.mode === "hexagram" && <>
                  <p>六爻（从初爻到上爻）：{item.detail.lines.map((line, index) => `第${index + 1}爻 ${lineIsYang(line) ? "阳" : "阴"}${lineChanges(line) ? "·动" : ""}（${line}）`).join("；")}</p>
                  {restoredHexagram && <p>卦象：{restoredHexagram.current.number}卦 {restoredHexagram.current.name} → {restoredHexagram.changed.number}卦 {restoredHexagram.changed.name}</p>}
                </>}
                {!item.detail && <p>这条旧记录只保留了问题和结果摘要，没有保存当时的全部选项或逐爻过程。</p>}
              </div>}
            </li>;
          })}</ul>}
          <p className="mt-4 text-[10px] leading-5 text-slate-500">记录只保存在当前浏览器。清除浏览器网站数据或更换设备后，这些记录可能无法找回。</p>
        </aside>
      </div>
    </section>
  );
}
