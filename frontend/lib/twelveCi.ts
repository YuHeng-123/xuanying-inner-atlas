export interface TwelveCiProfile {
  id: string;
  name: string;
  earthlyBranch: string;
  season: string;
  imageWord: string;
  keywords: string[];
  socialStyle: string;
  strength: string;
  watchFor: string;
  practice: string;
}

/** Historical branch associations are source-grounded; the reflection copy is original product content. */
export const twelveCiProfiles: TwelveCiProfile[] = [
  { id: "xingji", name: "星纪", earthlyBranch: "丑", season: "大雪—小寒", imageWord: "冬藏", keywords: ["积累", "边界", "耐心"], socialStyle: "更愿意先看长期投入是否可靠，再逐步建立信任。", strength: "擅长守住承诺、整理资源，把模糊的想法落到可持续的安排。", watchFor: "过度谨慎时，可能把尚未发生的风险也一并背在身上。", practice: "把担心拆成可验证的问题：谁负责、何时交付、什么情况需要调整。" },
  { id: "xuanxiao", name: "玄枵", earthlyBranch: "子", season: "小寒—立春", imageWord: "夜航", keywords: ["观察", "敏锐", "转念"], socialStyle: "常先观察气氛和信息，再决定何时表达自己的立场。", strength: "对细节与变化较敏感，能在局面复杂时找到新的切入口。", watchFor: "反复揣测没有说出口的意思，容易让自己消耗。", practice: "不确定时先核实一句：“我理解的是……对吗？”" },
  { id: "yuzhi", name: "娵訾", earthlyBranch: "亥", season: "立春—惊蛰", imageWord: "启程", keywords: ["共情", "想象", "联结"], socialStyle: "重视交流里的感受与信任，愿意听见对方没有说完的部分。", strength: "容易建立亲和感，也能从不同视角理解一件事。", watchFor: "替别人承担过多情绪或责任，忘了确认自己的限度。", practice: "先问自己“我愿意做到哪一步”，再给出明确答复。" },
  { id: "jianglou", name: "降娄", earthlyBranch: "戌", season: "惊蛰—清明", imageWord: "破晓", keywords: ["行动", "推进", "明确"], socialStyle: "偏好把讨论变成行动，期待彼此说清下一步。", strength: "能在停滞时推动事情向前，并把重点重新拉回来。", watchFor: "推进速度过快时，容易把不同节奏误读成不配合。", practice: "给行动留一个确认环节：先对齐目标，再约定具体时间。" },
  { id: "daliang", name: "大梁", earthlyBranch: "酉", season: "清明—立夏", imageWord: "春衡", keywords: ["判断", "秩序", "取舍"], socialStyle: "倾向先厘清标准，再决定资源应该放在哪里。", strength: "善于分辨优先级，能把复杂选择整理成清楚的取舍。", watchFor: "标准过高或过早定论，可能让协商空间变窄。", practice: "把“必须满足”和“可以商量”分开说。" },
  { id: "shishen", name: "实沈", earthlyBranch: "申", season: "立夏—芒种", imageWord: "星野", keywords: ["拆解", "协作", "求证"], socialStyle: "习惯通过具体问题与事实来建立合作感。", strength: "能把难题拆开，愿意通过试做和复盘找到更好的方法。", watchFor: "过度聚焦解决方案时，可能忽略对方需要先被听见。", practice: "先复述对方最在意的一点，再进入分析和分工。" },
  { id: "chunshou", name: "鹑首", earthlyBranch: "未", season: "芒种—小暑", imageWord: "盛夏", keywords: ["热忱", "投入", "照应"], socialStyle: "投入关系时比较主动，愿意提供支持和资源。", strength: "能带动合作气氛，让团队更愿意一起向前。", watchFor: "热心变成默认义务，久而久之出现失衡。", practice: "帮忙之前确认范围、时间和自己是否有余力。" },
  { id: "chunhuo", name: "鹑火", earthlyBranch: "午", season: "小暑—立秋", imageWord: "日中", keywords: ["表达", "鼓舞", "担当"], socialStyle: "沟通表达较直接，喜欢把态度和目标摆到桌面上。", strength: "能鼓舞他人，也愿意在关键时刻承担责任。", watchFor: "表达太快或太满时，容易让安静的声音被盖过。", practice: "重要讨论里留出一轮：“还有谁有不同看法？”" },
  { id: "chunwei", name: "鹑尾", earthlyBranch: "巳", season: "立秋—白露", imageWord: "流光", keywords: ["灵活", "连接", "变化"], socialStyle: "适应变化较快，乐于连接人和想法。", strength: "能在变化中寻找可行路线，也擅长让不同的人开始对话。", watchFor: "同时接太多线索，可能让承诺和优先级变得模糊。", practice: "每次新增事项都同步确认哪件事要后移。" },
  { id: "shouxing", name: "寿星", earthlyBranch: "辰", season: "白露—寒露", imageWord: "秋序", keywords: ["稳定", "照料", "耐久"], socialStyle: "重视稳定的来往方式，常通过持续的小行动表达在意。", strength: "可靠而有耐心，适合共同维护长期合作。", watchFor: "为了维持平和而延后表达不满。", practice: "小问题出现时就温和提出，不等到积累成旧账。" },
  { id: "dahuo", name: "大火", earthlyBranch: "卯", season: "寒露—立冬", imageWord: "暮色", keywords: ["洞察", "专注", "深谈"], socialStyle: "更看重交流的真实度，愿意深入讨论核心问题。", strength: "能发现表面共识下的关键分歧，也重视关系中的真诚。", watchFor: "追求一次谈透，可能让对方感到被逼着立即表态。", practice: "把深谈拆成几个回合，允许双方留时间思考。" },
  { id: "ximu", name: "析木", earthlyBranch: "寅", season: "立冬—大雪", imageWord: "归林", keywords: ["探索", "自主", "开路"], socialStyle: "珍惜自主空间，也喜欢一起探索新的可能。", strength: "愿意试新路，遇到旧办法失效时不容易被困住。", watchFor: "只顾保持选择自由，可能让共同约定缺少稳定感。", practice: "说明自己需要的空间，同时给出明确的回信或复盘时间。" },
];

export interface PairingPrompt {
  title: string;
  summary: string;
  question: string;
}

/** An editorial icebreaker based only on positions in this product's 12-step cycle. */
export function getPairingPrompt(firstId: string, secondId: string): PairingPrompt {
  const first = twelveCiProfiles.findIndex((profile) => profile.id === firstId);
  const second = twelveCiProfiles.findIndex((profile) => profile.id === secondId);
  if (first < 0 || second < 0) return { title: "先看见彼此", summary: "选出双方的星次后，再生成一条沟通话题。", question: "最近哪件事最值得一起对齐？" };
  const difference = Math.abs(first - second);
  const distance = Math.min(difference, twelveCiProfiles.length - difference);
  if (distance === 0) return { title: "相似节奏", summary: "可以从共同偏好开始；相似也不代表需求完全相同。", question: "你们各自最看重的合作标准是什么？" };
  if (distance === 1 || distance === 2) return { title: "邻近节奏", summary: "容易找到共同话题，也适合提前说清各自的优先顺序。", question: "这件事里，你希望先推进什么、先保留什么？" };
  if (distance === 3 || distance === 4) return { title: "互补话题", summary: "可以把不同视角变成分工优势，关键是别默认对方会补位。", question: "谁负责提出新方案，谁负责核对落地条件？" };
  if (distance === 5) return { title: "先问再推", summary: "做决定的节奏可能不同；把假设说出来，比猜对方想法更省力。", question: "在承诺之前，你们分别需要哪些信息？" };
  return { title: "对照视角", summary: "优先对齐目标、边界和时间表；不同视角不等于不合。", question: "如果目标相同，双方能接受的路径和底线分别是什么？" };
}
