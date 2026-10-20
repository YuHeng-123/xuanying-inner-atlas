"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, ExternalLink, RotateCcw, Sparkles, Telescope } from "lucide-react";

import type { MyProfile, TwelveCiLookup } from "@/lib/types";
import { apiEndpoint } from "@/lib/api";
import { getPairingPrompt, twelveCiProfiles } from "@/lib/twelveCi";

type ExplorerTab = "person" | "pair" | "catalog" | "quiz";
interface Props { profile?: MyProfile | null }

const tabs: Array<{ id: ExplorerTab; label: string }> = [
  { id: "person", label: "本人解读" },
  { id: "pair", label: "双方对照" },
  { id: "catalog", label: "十二星次图鉴" },
  { id: "quiz", label: "史料小测" },
];

const questions = [
  { prompt: "故宫博物院资料如何概括十二次的历史用途？", choices: ["观测日月五星运行及节气变化", "按出生月份判定人格", "划分十二生肖年份", "确定每日吉凶颜色"], answer: 0, explanation: "故宫词条说明，十二次用于观测日月五星运行及节气变易。", url: "https://www.dpm.org.cn/lemmas/244880.html" },
  { prompt: "按故宫列出的顺序，“星纪”之后是哪一“次”？", choices: ["鹑首", "玄枵", "大火", "降娄"], answer: 1, explanation: "顺序为星纪、玄枵、娵訾、降娄、大梁、实沈、鹑首、鹑火、鹑尾、寿星、大火、析木。", url: "https://www.dpm.org.cn/lemmas/244880.html" },
  { prompt: "下面哪组是十二星次名称？", choices: ["宝瓶、双鱼、白羊、金牛", "星纪、玄枵、娵訾、降娄", "青龙、白虎、朱雀、玄武", "角、亢、氐、房"], answer: 1, explanation: "十二次与黄道十二宫、二十八宿不是同一套名称体系。", url: "https://www.dpm.org.cn/lemmas/244880.html" },
  { prompt: "资料中提到十二次与节气关系会怎样？", choices: ["历代固定不变", "随岁差等因素发生变化", "只对应农历月份", "与天体位置无关"], answer: 1, explanation: "国立天文台暦Wiki说明，二十四节气与二十八宿、十二次的对应会随岁差变化。", url: "https://eco.mtk.nao.ac.jp/koyomi/wiki/BDBDC6F3BCA1.html" },
];

function parseBirthday(value: string, hour: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (![year, month, day].every(Number.isInteger) || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error("请填写有效的公历出生年月日。");
  }
  return { year, month, day, ...(hour === "" ? {} : { hour: Number(hour) }) };
}

function isLookup(value: unknown): value is TwelveCiLookup {
  return Boolean(value && typeof value === "object" && Array.isArray((value as TwelveCiLookup).candidates) && (value as TwelveCiLookup).candidates.length > 0);
}

async function fetchLookup(date: string, hour: string, signal: AbortSignal): Promise<TwelveCiLookup> {
  const response = await fetch(apiEndpoint("/api/v1/twelve-ci"), {
    method: "POST", headers: { "Content-Type": "application/json" }, signal,
    body: JSON.stringify(parseBirthday(date, hour)),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body && typeof body === "object" && "detail" in body && typeof body.detail === "string" ? body.detail : null;
    throw new Error(detail ?? "十二星次查询服务暂时不可用，请确认后端已启动。");
  }
  if (!isLookup(body)) throw new Error("服务返回的星次结果不完整，请稍后重试。");
  return body;
}

function periodLabel(startAt: string, endAt: string) {
  return `${startAt.slice(0, 10)} 起 · 至 ${endAt.slice(0, 10)} 节气交界`;
}

export default function TwelveCiExplorer({ profile = null }: Props) {
  const [tab, setTab] = useState<ExplorerTab>("person");
  const [selfDate, setSelfDate] = useState("");
  const [selfHour, setSelfHour] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [targetHour, setTargetHour] = useState("");
  const [targetName, setTargetName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pairResult, setPairResult] = useState<{ self: TwelveCiLookup; target: TwelveCiLookup | null } | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState(twelveCiProfiles[0].id);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [quizComplete, setQuizComplete] = useState(false);
  const score = useMemo(() => answers.reduce((total, value, index) => total + Number(value === questions[index].answer), 0), [answers]);

  useEffect(() => {
    if (!profile) return;
    setSelfDate(`${profile.year}-${String(profile.month).padStart(2, "0")}-${String(profile.day).padStart(2, "0")}`);
    setSelfHour(profile.hour === undefined || profile.hour === null ? "" : String(profile.hour));
  }, [profile]);

  const selectedProfile = useMemo(() => twelveCiProfiles.find((item) => item.id === selectedProfileId) ?? twelveCiProfiles[0], [selectedProfileId]);
  const pairings = useMemo(() => {
    if (!pairResult) return [];
    if (!pairResult.target) return [];
    return pairResult.self.candidates.flatMap((self) => pairResult.target!.candidates.map((target) => ({
      self, target, prompt: getPairingPrompt(self.id, target.id),
    })));
  }, [pairResult]);

  const runPairing = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    try {
      const self = await fetchLookup(selfDate, selfHour, controller.signal);
      const target = tab === "pair" ? await fetchLookup(targetDate, targetHour, controller.signal) : null;
      setPairResult({ self, target });
    } catch (reason) {
      setError(reason instanceof DOMException && reason.name === "AbortError" ? "查询超时，请检查本地后端服务。" : reason instanceof Error ? reason.message : "查询失败，请稍后重试。");
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  };

  const chooseAnswer = (index: number) => {
    if (answer !== null) return;
    setAnswer(index);
    setAnswers((current) => { const next = [...current]; next[questionIndex] = index; return next; });
  };
  const moveQuestion = (direction: -1 | 1) => {
    if (direction === 1 && questionIndex === questions.length - 1) { setQuizComplete(true); return; }
    const next = questionIndex + direction;
    setQuestionIndex(next);
    setAnswer(answers[next] ?? null);
  };
  const restartQuiz = () => { setQuestionIndex(0); setAnswer(null); setAnswers([]); setQuizComplete(false); };

  return (
    <section className="mx-auto w-full max-w-6xl" aria-labelledby="twelve-ci-title">
      <header className="surface-panel overflow-hidden rounded-3xl">
        <div className="relative border-b border-slate-200 bg-gradient-to-br from-[#eef7ff] via-white to-indigo-50/80 px-5 py-6 sm:px-8 sm:py-8">
          <div className="pointer-events-none absolute -right-10 -top-16 h-60 w-60 rounded-full border border-blue-200/70" />
          <div className="pointer-events-none absolute -right-2 -top-8 h-44 w-44 rounded-full border border-dashed border-indigo-200/80" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700"><Telescope className="h-6 w-6" /></span><div><p className="section-kicker">TWELVE CI / 十二星次</p><h1 id="twelve-ci-title" className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">十二星次解读</h1></div></div>
            <span className="rounded-full border border-blue-200 bg-white/85 px-3 py-1.5 text-[10px] font-medium text-blue-800">现代节气映射 · 原创解读</span>
          </div>
          <p className="relative mt-4 max-w-3xl text-sm leading-6 text-slate-600">输入公历生日查看节令映射，再读个人主题或并列比较双方。十二星次原用于古代天文观测；生日性格解释与互动问题是现代原创体验，不冒充古籍定论。</p>
        </div>

        <nav className="flex gap-2 overflow-x-auto p-3 sm:px-6" aria-label="十二星次功能">
          {tabs.map((item) => <button key={item.id} type="button" onClick={() => setTab(item.id)} aria-current={tab === item.id ? "page" : undefined} className={`shrink-0 rounded-xl border px-4 py-2.5 text-xs font-semibold transition ${tab === item.id ? "border-blue-300 bg-blue-50 text-blue-800" : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}>{item.label}</button>)}
        </nav>
      </header>

      {(tab === "person" || tab === "pair") && <div className="mt-5 space-y-5">
        <form onSubmit={runPairing} className="surface-panel rounded-3xl p-5 sm:p-7">
          <div className="mb-5"><p className="section-kicker">BIRTHDAY TO TWELVE CI / 公历生日换算</p><h2 className="mt-1 text-xl font-semibold text-slate-900">{tab === "person" ? "查看本人的十二星次解读" : "并列查看双方的星次主题"}</h2><p className="mt-1 text-xs leading-5 text-slate-500">输入身份证上的公历生日；时刻可留空。若生日落在本产品设定的节令交界，会并列显示候选星次。</p></div>
          <div className="grid gap-4 lg:grid-cols-2">
            {(tab === "pair" ? [{ label: profile?.name || "我", date: selfDate, setDate: setSelfDate, hour: selfHour, setHour: setSelfHour }, { label: targetName.trim() || "对方", date: targetDate, setDate: setTargetDate, hour: targetHour, setHour: setTargetHour }] : [{ label: profile?.name || "我", date: selfDate, setDate: setSelfDate, hour: selfHour, setHour: setSelfHour }]).map((person, index) => <fieldset key={index} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
              <legend className="px-1 text-sm font-semibold text-slate-800">{index === 0 ? "本人" : "对方"} · {person.label}</legend>
              {tab === "pair" && index === 1 && <label className="mt-1 block text-xs text-slate-600">称呼（选填）<input value={targetName} onChange={(event) => setTargetName(event.target.value)} maxLength={40} placeholder="例如：小林" className="form-input mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm" /></label>}
              <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px]">
                <label className="text-xs font-medium text-slate-700">公历出生日期<input type="date" required={index === 0 || tab === "pair"} value={person.date} onChange={(event) => person.setDate(event.target.value)} className="form-input mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm" /></label>
                <label className="text-xs font-medium text-slate-700">出生时刻（选填）<select value={person.hour} onChange={(event) => person.setHour(event.target.value)} className="form-input mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm"><option value="">未知 / 不填</option>{Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{String(hour).padStart(2, "0")}:00</option>)}</select></label>
              </div>
            </fieldset>)}
          </div>
          {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">{error}</p>}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="max-w-xl text-[10px] leading-5 text-slate-500">生日仅发送至本地后端查询节气交界；没有调用外部模型。星次对应仅按本产品明示的节令映射，不等同于古代已经形成的生日人格学。</p><button type="submit" disabled={loading} className="primary-button inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-55"><Sparkles className="h-4 w-4" />{loading ? "正在核对节气…" : tab === "person" ? "生成我的星次解读" : "并列查看双方主题"}</button></div>
        </form>

        {pairResult && <section className="surface-panel rounded-3xl p-5 sm:p-7" aria-live="polite">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="section-kicker">TRADITIONAL NAME / MODERN REFLECTION</p><h2 className="mt-1 text-xl font-semibold text-slate-900">{pairResult.target ? `${profile?.name || "我"} × ${targetName.trim() || "对方"}` : `${profile?.name || "我"} · 十二星次解读`}</h2></div><span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-medium text-amber-900">文化体验参考，不作命运判断</span></div>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {[{ label: profile?.name || "我", result: pairResult.self }, ...(pairResult.target ? [{ label: targetName.trim() || "对方", result: pairResult.target }] : [])].map(({ label, result }) => <article key={label} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"><p className="text-xs font-semibold text-slate-700">{label}的星次可能</p><div className="mt-3 flex flex-wrap gap-2">{result.candidates.map((candidate) => <span key={candidate.id} className="rounded-full border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-800">{candidate.name} · 十二辰 {candidate.earthly_branch}</span>)}</div>{result.boundary_note && <p className="mt-3 text-[11px] leading-5 text-amber-800">{result.boundary_note}</p>}{result.candidates.length === 1 && <p className="mt-2 text-[10px] text-slate-500">节令段：{periodLabel(result.candidates[0].start_at, result.candidates[0].end_at)}</p>}</article>)}
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">{[{ label: profile?.name || "我", lookup: pairResult.self }, ...(pairResult.target ? [{ label: targetName.trim() || "对方", lookup: pairResult.target }] : [])].flatMap(({ label, lookup }) => lookup.candidates.map((candidate) => {
            const reading = twelveCiProfiles.find((item) => item.id === candidate.id);
            if (!reading) return null;
            return <article key={`${label}-${candidate.id}`} className="rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/50 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold text-slate-900">{label} · {reading.name}</h3><span className="text-[10px] text-slate-500">体验节令段 {reading.season} · 十二辰 {reading.earthlyBranch}</span></div><div className="mt-3 grid gap-2 sm:grid-cols-2"><div className="rounded-xl bg-white/85 p-3"><p className="text-[10px] font-semibold text-blue-900">相处倾向（现代原创）</p><p className="mt-1 text-xs leading-5 text-slate-700">{reading.socialStyle}</p></div><div className="rounded-xl bg-white/85 p-3"><p className="text-[10px] font-semibold text-emerald-900">可发挥之处</p><p className="mt-1 text-xs leading-5 text-slate-700">{reading.strength}</p></div><div className="rounded-xl bg-white/85 p-3"><p className="text-[10px] font-semibold text-amber-900">留意点</p><p className="mt-1 text-xs leading-5 text-slate-700">{reading.watchFor}</p></div><div className="rounded-xl bg-white/85 p-3"><p className="text-[10px] font-semibold text-violet-900">一个练习</p><p className="mt-1 text-xs leading-5 text-slate-700">{reading.practice}</p></div></div></article>;
          }))}</div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {pairings.map(({ self, target, prompt }, index) => <article key={`${self.id}-${target.id}`} className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/70 p-4"><div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold text-slate-900">{prompt.title}</p><span className="font-mono text-[10px] text-indigo-500">组合 {index + 1}</span></div><p className="mt-1 text-[11px] font-medium text-slate-600">{self.name} × {target.name}</p><p className="mt-3 text-xs leading-6 text-slate-700">{prompt.summary}</p><p className="mt-3 rounded-xl border border-white bg-white/85 px-3 py-2.5 text-xs leading-5 text-indigo-950"><b>可以聊：</b>{prompt.question}</p></article>)}
          </div>
          {(pairResult.self.boundary_note || pairResult.target?.boundary_note) && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs leading-5 text-amber-900">生日跨节气边界：已并列呈现所有可能组合，不会擅自选择其中一个。</p>}
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3"><p className="text-[10px] leading-5 text-slate-500">方法说明：配对话题按本产品十二环位的距离生成，用作沟通破冰问题；不是古籍配对规则、统计结论或现实关系预测。{pairResult.self.method_note}</p></div>
        </section>}
      </div>}

      {tab === "catalog" && <div className="mt-5 space-y-5">
        <section className="surface-panel rounded-3xl p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="section-kicker">THE TWELVE / 名称与节令</p><h2 className="mt-1 text-xl font-semibold text-slate-900">十二星次图鉴</h2></div><p className="text-[10px] text-slate-500">点击卡片展开现代原创反思</p></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {twelveCiProfiles.map((item, index) => <button key={item.id} type="button" onClick={() => setSelectedProfileId(item.id)} aria-pressed={selectedProfileId === item.id} className={`group min-h-36 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${selectedProfileId === item.id ? "border-blue-300 bg-blue-50/80 shadow-sm" : "border-slate-200 bg-white hover:border-blue-200"}`}>
              <div className="flex items-start justify-between gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-xl font-display text-sm font-semibold ${selectedProfileId === item.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}>{item.imageWord.slice(0, 1)}</span><span className="font-mono text-[10px] tracking-widest text-slate-400">CI · {String(index + 1).padStart(2, "0")}</span></div>
              <div className="mt-3 flex items-baseline justify-between gap-2"><h3 className="text-base font-semibold text-slate-900">{item.name}</h3><span className="text-[10px] text-slate-500">传统配属 · 十二辰 {item.earthlyBranch}</span></div>
              <p className="mt-1 text-[10px] text-blue-700">体验节令段：{item.season}</p><div className="mt-2 flex flex-wrap gap-1.5">{item.keywords.map((word) => <span key={word} className="rounded-full bg-slate-100 px-2 py-1 text-[9px] text-slate-600">{word}</span>)}</div>
            </button>)}
          </div>
        </section>
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <article className="surface-panel rounded-3xl p-5 sm:p-7"><p className="section-kicker">EDITORIAL REFLECTION / 原创现代文案</p><div className="mt-2 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-semibold text-slate-900">{selectedProfile.name}</h2><p className="mt-1 text-xs text-slate-500">{selectedProfile.imageWord} · 体验节令段 {selectedProfile.season}</p></div><span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-[10px] text-violet-800">现代反思，不是古籍性格结论</span></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-emerald-50/70 p-4"><p className="text-xs font-semibold text-emerald-900">相处风格</p><p className="mt-2 text-sm leading-6 text-emerald-950/85">{selectedProfile.socialStyle}</p></div><div className="rounded-2xl bg-blue-50/70 p-4"><p className="text-xs font-semibold text-blue-900">可发挥的优势</p><p className="mt-2 text-sm leading-6 text-blue-950/85">{selectedProfile.strength}</p></div><div className="rounded-2xl bg-amber-50/80 p-4"><p className="text-xs font-semibold text-amber-950">值得自查</p><p className="mt-2 text-sm leading-6 text-amber-950/85">{selectedProfile.watchFor}</p></div><div className="rounded-2xl bg-indigo-50/80 p-4"><p className="text-xs font-semibold text-indigo-950">一个练习</p><p className="mt-2 text-sm leading-6 text-indigo-950/85">{selectedProfile.practice}</p></div></div>
          </article>
          <aside className="surface-panel rounded-3xl p-5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><BookOpen className="h-5 w-5" /></span><h3 className="mt-4 text-sm font-semibold text-slate-900">史料边界</h3><p className="mt-2 text-xs leading-5 text-slate-600">星纪等名称和十二辰配属有史料依据；“冬藏、夜航”等主题、性格文案及配对提示均为本产品原创体验内容。</p><div className="mt-4 space-y-2 border-t border-slate-100 pt-4"><a className="source-link" href="https://www.dpm.org.cn/lemmas/244880.html" target="_blank" rel="noreferrer">故宫博物院：赤道十二宫 <ExternalLink className="h-3 w-3" /></a><a className="source-link" href="https://eco.mtk.nao.ac.jp/koyomi/wiki/BDBDC6F3BCA1.html" target="_blank" rel="noreferrer">日本国立天文台：十二次与节气 <ExternalLink className="h-3 w-3" /></a></div></aside>
        </section>
      </div>}

      {tab === "quiz" && <section className="surface-panel mt-5 rounded-3xl p-5 sm:p-7" aria-labelledby="source-quiz-title">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="section-kicker">SOURCE-GUIDED / 史料小测</p><h2 id="source-quiz-title" className="mt-1 text-xl font-semibold text-slate-900">只测资料能支持的内容</h2></div>{!quizComplete && <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600">{questionIndex + 1} / {questions.length}</span>}</div>
        {quizComplete ? <div className="py-8 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Check className="h-5 w-5" /></span><h3 className="mt-4 text-xl font-semibold text-slate-900">史料题答对 {score} / {questions.length}</h3><p className="mt-2 text-xs text-slate-500">这衡量的是史料知识，不是人格或配对准确率。</p><button onClick={restartQuiz} className="primary-button mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold"><RotateCcw className="h-3.5 w-3.5" />重新开始</button></div> : <>
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }} /></div>
          <h3 className="mt-5 text-lg font-semibold leading-7 text-slate-900">{questions[questionIndex].prompt}</h3><div className="mt-4 grid gap-2 sm:grid-cols-2">{questions[questionIndex].choices.map((choice, index) => <button key={choice} type="button" onClick={() => chooseAnswer(index)} disabled={answer !== null} className={`rounded-xl border px-4 py-3 text-left text-sm transition ${answer === null ? "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40" : index === questions[questionIndex].answer ? "border-emerald-300 bg-emerald-50 text-emerald-900" : answer === index ? "border-rose-300 bg-rose-50 text-rose-900" : "border-slate-200 bg-slate-50 text-slate-500"}`}>{String.fromCharCode(65 + index)} · {choice}</button>)}</div>
          {answer !== null && <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/70 p-4"><p className="text-xs font-semibold text-blue-900">{answer === questions[questionIndex].answer ? "回答正确" : "对照来源再看一次"}</p><p className="mt-1.5 text-xs leading-5 text-slate-700">{questions[questionIndex].explanation}</p><a className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-blue-700" href={questions[questionIndex].url} target="_blank" rel="noreferrer">打开来源 <ExternalLink className="h-3 w-3" /></a></div>}
          <div className="mt-5 flex justify-between border-t border-slate-100 pt-4"><button type="button" onClick={() => moveQuestion(-1)} disabled={questionIndex === 0} className="secondary-button rounded-xl px-3 py-2 text-xs disabled:opacity-40"><ArrowLeft className="mr-1 inline h-3.5 w-3.5" />上一题</button><button type="button" onClick={() => moveQuestion(1)} disabled={answer === null} className="primary-button rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-40">{questionIndex === questions.length - 1 ? "查看结果" : "下一题"}<ArrowRight className="ml-1 inline h-3.5 w-3.5" /></button></div>
        </>}
        <p className="mt-4 flex gap-2 border-t border-slate-100 pt-3 text-[10px] leading-5 text-slate-500"><BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0" />历史资料用于核对“古代记载了什么”，并不证明生日性格或关系预测有效。</p>
      </section>}
    </section>
  );
}
