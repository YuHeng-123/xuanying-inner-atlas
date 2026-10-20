import { randomInteger } from "@/lib/divination";
import type { DivinationLotRank } from "@/lib/types";

export interface DivinationLot {
  number: number;
  rank: DivinationLotRank;
  title: string;
  reflection: string;
}

// Original, locally authored reflection prompts. The four labels are equally
// represented; these are not quotations from a temple lot canon.
export const DIVINATION_LOTS: readonly DivinationLot[] = [
  { number: 1, rank: "上签", title: "顺势起步", reflection: "已有条件可以支持一小步行动。先把目标和下一步写清，再稳稳开始。" },
  { number: 2, rank: "上签", title: "得人相助", reflection: "把需要说具体，合适的支持更容易出现。也记得确认彼此的期待。" },
  { number: 3, rank: "上签", title: "积累见效", reflection: "之前的准备正在形成基础。沿着可验证的进展继续，不必急着求快。" },
  { number: 4, rank: "上签", title: "眼界渐开", reflection: "新的信息可能带来更好的选择。留意事实，也给自己留出调整空间。" },
  { number: 5, rank: "上签", title: "合作有路", reflection: "把分工和共同目标讲明白，合作会更容易落到行动上。" },
  { number: 6, rank: "上签", title: "先行一步", reflection: "与其等待完全确定，不如从低风险的小步骤开始并观察结果。" },
  { number: 7, rank: "吉签", title: "稳中有进", reflection: "方向可以继续观察，按计划推进，并及时核对时间和资源。" },
  { number: 8, rank: "吉签", title: "沟通得宜", reflection: "把真实想法说清楚，也认真听对方的条件，误会会少一些。" },
  { number: 9, rank: "吉签", title: "循序渐进", reflection: "把大事拆成可完成的小段，完成一段后再决定下一段。" },
  { number: 10, rank: "吉签", title: "资源可用", reflection: "先盘点手里的时间、预算和帮助，再选择适合的做法。" },
  { number: 11, rank: "吉签", title: "互相成全", reflection: "这件事有协商余地。说清边界与回报，找到双方都能接受的方案。" },
  { number: 12, rank: "吉签", title: "调整有益", reflection: "保留有效部分，改动不合适的安排。小幅调整也能改善体验。" },
  { number: 13, rank: "中平", title: "先看全局", reflection: "眼前线索还不完整。先补齐关键信息，再比较选项的实际代价。" },
  { number: 14, rank: "中平", title: "暂缓定论", reflection: "不必马上给出结论。给自己一点时间，观察事情是否出现新变化。" },
  { number: 15, rank: "中平", title: "厘清重点", reflection: "一次只处理最重要的一件事，避免被次要细节带着走。" },
  { number: 16, rank: "中平", title: "核实约定", reflection: "把时间、责任和条件逐一确认，重要内容最好留下清楚记录。" },
  { number: 17, rank: "中平", title: "听见需要", reflection: "先分辨自己真正需要什么，再看当前选项是否能满足它。" },
  { number: 18, rank: "中平", title: "留有余地", reflection: "为意外情况预留时间和资源，计划会更从容，也更容易调整。" },
  { number: 19, rank: "下签", title: "守住边界", reflection: "先确认自己的底线和可承受范围，不因一时压力答应超出能力的事。" },
  { number: 20, rank: "下签", title: "暂避冲动", reflection: "情绪强烈时先暂停。等信息和心情都更稳定，再做重要决定。" },
  { number: 21, rank: "下签", title: "检查风险", reflection: "先找出最可能造成损失的环节，准备好退路后再考虑是否推进。" },
  { number: 22, rank: "下签", title: "补齐条件", reflection: "目前可能还缺时间、信息或支持。先补足关键条件，不必勉强赶进度。" },
  { number: 23, rank: "下签", title: "减少消耗", reflection: "看看哪些投入已经没有帮助，及时止损或缩小范围也是一种选择。" },
  { number: 24, rank: "下签", title: "先求稳妥", reflection: "遇到不确定时，优先选择安全、可逆、容易复查的下一步。" },
];

export function drawDivinationLot(): DivinationLot {
  return DIVINATION_LOTS[randomInteger(DIVINATION_LOTS.length)];
}
