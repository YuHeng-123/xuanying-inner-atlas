"use client";

import { useMemo, useState } from "react";
import { Check, Clipboard, MessagesSquare, ShieldCheck } from "lucide-react";

import type { RelationshipType } from "@/lib/types";

type Tone = "温和" | "直接" | "坚定";
interface RehearsalScenario {
  id: string;
  title: string;
  trigger: string;
  lines: Record<Tone, string>;
}

const common: RehearsalScenario[] = [
  { id: "unclear", title: "目标或要求比较模糊", trigger: "对方交代的事情缺少完成标准", lines: { 温和: "我先确认一下，您希望我优先解决哪一部分？我整理成两三个选项发您确认。", 直接: "为了按时交付，我需要确认目标、优先级和截止时间。您看这三项分别是什么？", 坚定: "目前信息还不足以承诺完整交付。我可以先做已明确的部分，范围确认后再锁定时间。" } },
  { id: "scope", title: "临时增加任务或责任", trigger: "既有分工之外突然加码", lines: { 温和: "我可以一起想办法。我们先看看现有事项里哪一项可以调整优先级？", 直接: "这项新增工作会影响原定交付，请确认由哪项任务顺延，以及最终负责人是谁。", 坚定: "我目前不能在不调整范围和时间的情况下接下这部分。请先书面确认新的分工与交付边界。" } },
];

const roleScenarios: Record<RelationshipType, RehearsalScenario[]> = {
  "直属领导": [common[0], common[1], { id: "feedback", title: "收到笼统或公开批评", trigger: "反馈有压力，但缺少具体例子", lines: { 温和: "我想把这次反馈落实好，方便您指出一个最需要改进的具体例子吗？", 直接: "我听到结果不符合预期。为了修正，请明确具体差距、验收标准和复盘时间。", 坚定: "我愿意对工作结果负责，也希望讨论基于具体事项。我们可以会后逐条核对事实和改进要求。" } }],
  "平级同事": [common[0], common[1], { id: "credit", title: "分工或成果归属不清", trigger: "多人参与，但负责人和贡献没有记清", lines: { 温和: "我们把各自负责的部分简单列一下，后续同步起来会更省心。", 直接: "为避免重复或遗漏，我整理了负责人、交付物和时间点，请一起确认。", 坚定: "这部分由我完成的内容我会留好记录；新增部分请先明确负责人和相应资源。" } }],
  "合伙人": [common[0], common[1], { id: "money", title: "投入、收益或决策权有分歧", trigger: "口头共识与实际执行不一致", lines: { 温和: "我们先把双方投入、决策方式和退出条件放在一张表里，看看哪里还没对齐。", 直接: "这涉及投入和收益，需要按协议逐项核对。没有确认前，我先不扩大资金或责任承诺。", 坚定: "涉及资金、股权或责任的调整，请先形成双方确认的书面条款，再执行。" } }],
  "朋友": [common[0], { id: "favor", title: "帮忙超出自己的承受范围", trigger: "你不想答应，但担心伤感情", lines: { 温和: "我理解你现在需要支持，但这件事我这次做不到；我可以陪你一起想别的办法。", 直接: "这件事我没法答应，其他我能帮的部分可以再具体聊。", 坚定: "我已经说明了这次不能帮忙，请尊重这个决定；如果继续施压，我会先结束这次讨论。" } }, common[1]],
  "相亲对象": [common[0], { id: "pace", title: "相处节奏或边界不同", trigger: "你想放慢节奏或明确期待", lines: { 温和: "我更希望按彼此舒服的节奏了解，咱们可以坦诚说说各自期待。", 直接: "我目前希望慢一点，也需要保留自己的安排。如果你期待不同，我们可以直接对齐。", 坚定: "我不接受被催促或被替我做决定。请尊重我的节奏，否则我会暂停联系。" } }, common[1]],
};

export default function ConversationRehearsal({ relationshipType }: { relationshipType: RelationshipType }) {
  const scenarios = roleScenarios[relationshipType] ?? common;
  const [scenarioId, setScenarioId] = useState(scenarios[0].id);
  const [copiedTone, setCopiedTone] = useState<Tone | null>(null);
  const [copyError, setCopyError] = useState(false);
  const scenario = useMemo(() => scenarios.find((item) => item.id === scenarioId) ?? scenarios[0], [scenarioId, scenarios]);

  const copy = async (tone: Tone) => {
    try {
      await navigator.clipboard.writeText(scenario.lines[tone]);
      setCopiedTone(tone);
      setCopyError(false);
      window.setTimeout(() => setCopiedTone((current) => current === tone ? null : current), 1800);
    } catch {
      setCopiedTone(null);
      setCopyError(true);
    }
  };

  return (
    <section className="surface-panel rounded-3xl p-5 sm:p-6" aria-labelledby="rehearsal-title">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><MessagesSquare className="h-5 w-5" /></span>
        <div><p className="section-kicker">SAY IT CLEAR / 情境演练</p><h2 id="rehearsal-title" className="mt-1 text-lg font-semibold text-slate-900">先练一句，再进入现场</h2><p className="mt-1 text-xs leading-5 text-slate-500">选择真实场景，比较不同语气；内容是沟通练习模板，不是对对方的判断。</p></div>
      </div>

      <label className="mt-4 block text-xs font-medium text-slate-700" htmlFor="rehearsal-scenario">当前关系：{relationshipType} · 选择情境</label>
      <select id="rehearsal-scenario" value={scenario.id} onChange={(event) => { setScenarioId(event.target.value); setCopiedTone(null); }} className="form-input mt-2 w-full rounded-xl px-3 py-2.5 text-sm">
        {scenarios.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
      </select>
      <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2.5 text-[11px] leading-5 text-slate-600"><ShieldCheck className="mr-1.5 inline h-3.5 w-3.5 text-blue-600" />触发情境：{scenario.trigger}</p>

      <div className="mt-3 grid gap-2.5">
        {(["温和", "直接", "坚定"] as const).map((tone) => <article key={tone} className="rounded-2xl border border-slate-200 bg-white p-3.5">
          <div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold text-slate-800">{tone}表达</p><button type="button" onClick={() => void copy(tone)} className="quiet-button min-h-8 px-2.5 py-1.5 text-[10px]">{copiedTone === tone ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Clipboard className="h-3.5 w-3.5" />}{copiedTone === tone ? "已复制" : "复制这句"}</button></div>
          <p className="mt-2 text-xs leading-6 text-slate-700">“{scenario.lines[tone]}”</p>
        </article>)}
      </div>
      <p aria-live="polite" className={`mt-2 min-h-4 text-[10px] ${copyError ? "text-rose-700" : "text-slate-500"}`}>{copyError ? "浏览器未允许访问剪贴板；可选中上方句子手动复制。" : copiedTone ? "已复制，可粘贴到备忘录或沟通草稿中。" : "点击复制后可粘贴到备忘录或沟通草稿中。"}</p>
    </section>
  );
}
