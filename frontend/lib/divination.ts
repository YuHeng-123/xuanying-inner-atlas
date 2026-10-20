export type TrigramName = "乾" | "兑" | "离" | "震" | "巽" | "坎" | "艮" | "坤";
export type CoinLine = 6 | 7 | 8 | 9;

export interface HexagramInfo {
  number: number;
  name: string;
  lower: TrigramName;
  upper: TrigramName;
  theme: string;
  question: string;
}

export const TRIGRAMS: Record<TrigramName, { bits: string; image: string }> = {
  乾: { bits: "111", image: "天" },
  兑: { bits: "110", image: "泽" },
  离: { bits: "101", image: "火" },
  震: { bits: "100", image: "雷" },
  巽: { bits: "011", image: "风" },
  坎: { bits: "010", image: "水" },
  艮: { bits: "001", image: "山" },
  坤: { bits: "000", image: "地" },
};

// King Wen sequence. The short themes and questions below are original prompts,
// intended for reflection rather than claims about a person's future.
export const HEXAGRAMS: HexagramInfo[] = [
  { number: 1, name: "乾为天", lower: "乾", upper: "乾", theme: "主动开创", question: "这件事里，哪一步需要你先承担责任并开始行动？" },
  { number: 2, name: "坤为地", lower: "坤", upper: "坤", theme: "承接与配合", question: "先听清现实条件，再决定怎样稳稳推进。" },
  { number: 3, name: "水雷屯", lower: "震", upper: "坎", theme: "开局有阻", question: "把大目标拆小，眼下最需要补齐的条件是什么？" },
  { number: 4, name: "山水蒙", lower: "坎", upper: "艮", theme: "学习与求教", question: "你还缺哪条信息，适合先向谁请教？" },
  { number: 5, name: "水天需", lower: "乾", upper: "坎", theme: "等待时机", question: "等待期间，哪件准备工作能让你更从容？" },
  { number: 6, name: "天水讼", lower: "坎", upper: "乾", theme: "分歧与协商", question: "先把双方都认可的事实和边界说清楚。" },
  { number: 7, name: "地水师", lower: "坎", upper: "坤", theme: "组织与纪律", question: "谁负责哪一步，怎样避免临时混乱？" },
  { number: 8, name: "水地比", lower: "坤", upper: "坎", theme: "合作与靠拢", question: "这件事适合找谁同行，合作规则是什么？" },
  { number: 9, name: "风天小畜", lower: "乾", upper: "巽", theme: "小步积累", question: "先做哪件小事，能逐步形成可见进展？" },
  { number: 10, name: "天泽履", lower: "兑", upper: "乾", theme: "谨慎前行", question: "下一步有哪些规则、承诺或安全事项要留意？" },
  { number: 11, name: "地天泰", lower: "乾", upper: "坤", theme: "沟通顺畅", question: "怎样让资源和信息在相关的人之间流动起来？" },
  { number: 12, name: "天地否", lower: "坤", upper: "乾", theme: "暂时受阻", question: "如果眼下沟通不畅，哪些事可以先独立准备？" },
  { number: 13, name: "天火同人", lower: "离", upper: "乾", theme: "寻找同伴", question: "你们共同认可的目标是什么？" },
  { number: 14, name: "火天大有", lower: "乾", upper: "离", theme: "资源充足", question: "已有的资源如何使用，才能兼顾长远？" },
  { number: 15, name: "地山谦", lower: "艮", upper: "坤", theme: "谦和稳健", question: "怎样保持自信，同时给别人留出空间？" },
  { number: 16, name: "雷地豫", lower: "坤", upper: "震", theme: "提前准备", question: "把期待变成行动计划，还差哪一步？" },
  { number: 17, name: "泽雷随", lower: "震", upper: "兑", theme: "顺势调整", question: "哪些变化值得跟进，哪些原则仍要守住？" },
  { number: 18, name: "山风蛊", lower: "巽", upper: "艮", theme: "修补积弊", question: "有什么旧问题被拖久了，现在适合从哪里修起？" },
  { number: 19, name: "地泽临", lower: "兑", upper: "坤", theme: "靠近观察", question: "怎样多了解现场情况，再决定投入多少？" },
  { number: 20, name: "风地观", lower: "坤", upper: "巽", theme: "观察全局", question: "先退一步看全局，会发现什么之前忽略的线索？" },
  { number: 21, name: "火雷噬嗑", lower: "震", upper: "离", theme: "处理障碍", question: "要让事情继续，最需要明确处理的障碍是什么？" },
  { number: 22, name: "山火贲", lower: "离", upper: "艮", theme: "整理表达", question: "怎样让重点更清楚，同时不被表面形式带偏？" },
  { number: 23, name: "山地剥", lower: "坤", upper: "艮", theme: "减少负担", question: "哪些部分已经不再有用，可以先放下？" },
  { number: 24, name: "地雷复", lower: "震", upper: "坤", theme: "重新开始", question: "如果从最小的一步重新开始，你会选什么？" },
  { number: 25, name: "天雷无妄", lower: "震", upper: "乾", theme: "保持真实", question: "怎样按事实行动，不被猜测或冲动牵着走？" },
  { number: 26, name: "山天大畜", lower: "乾", upper: "艮", theme: "积蓄力量", question: "现在积累的知识、时间或资源，未来怎样派上用场？" },
  { number: 27, name: "山雷颐", lower: "震", upper: "艮", theme: "照顾所需", question: "你正在给自己和他人补充什么，又消耗什么？" },
  { number: 28, name: "泽风大过", lower: "巽", upper: "兑", theme: "负担过重", question: "目前的安排是否超出承受能力，能否先减一项？" },
  { number: 29, name: "坎为水", lower: "坎", upper: "坎", theme: "重复挑战", question: "遇到反复出现的困难时，哪条基本原则能保护你？" },
  { number: 30, name: "离为火", lower: "离", upper: "离", theme: "看清重点", question: "哪些事实已经清楚，哪些仍需要核实？" },
  { number: 31, name: "泽山咸", lower: "艮", upper: "兑", theme: "感受回应", question: "注意彼此的反馈，也确认自己的真实意愿。" },
  { number: 32, name: "雷风恒", lower: "巽", upper: "震", theme: "持续经营", question: "什么做法值得长期坚持，什么习惯需要调整？" },
  { number: 33, name: "天山遁", lower: "艮", upper: "乾", theme: "适时退让", question: "暂时退出一步，能否换来更好的选择空间？" },
  { number: 34, name: "雷天大壮", lower: "乾", upper: "震", theme: "力量与节制", question: "有行动力时，怎样避免用力过猛？" },
  { number: 35, name: "火地晋", lower: "坤", upper: "离", theme: "逐步前进", question: "目前的进展可以怎样被看见、确认和巩固？" },
  { number: 36, name: "地火明夷", lower: "离", upper: "坤", theme: "保护心力", question: "环境不明朗时，先保护好哪些重要资源？" },
  { number: 37, name: "风火家人", lower: "离", upper: "巽", theme: "理清分工", question: "相关的人各自期待什么，分工是否说清楚？" },
  { number: 38, name: "火泽睽", lower: "兑", upper: "离", theme: "面对差异", question: "哪些差异可以共存，哪些需要先协商？" },
  { number: 39, name: "水山蹇", lower: "艮", upper: "坎", theme: "绕开难处", question: "直接推进遇到阻力时，有没有更稳妥的路线？" },
  { number: 40, name: "雷水解", lower: "坎", upper: "震", theme: "化解压力", question: "哪一个明确动作，能先解除最大的压力？" },
  { number: 41, name: "山泽损", lower: "兑", upper: "艮", theme: "有所取舍", question: "减少什么之后，真正重要的部分会更清楚？" },
  { number: 42, name: "风雷益", lower: "震", upper: "巽", theme: "互相增益", question: "怎样让投入带来双方都看得见的改善？" },
  { number: 43, name: "泽天夬", lower: "乾", upper: "兑", theme: "明确表态", question: "需要说清的决定是什么，表达时如何保持尊重？" },
  { number: 44, name: "天风姤", lower: "巽", upper: "乾", theme: "留意新变化", question: "新出现的人或机会，哪些信息还需要观察？" },
  { number: 45, name: "泽地萃", lower: "坤", upper: "兑", theme: "聚合资源", question: "有哪些人、工具或经验可以汇集起来？" },
  { number: 46, name: "地风升", lower: "巽", upper: "坤", theme: "稳步成长", question: "持续向前需要什么支持，下一阶目标是什么？" },
  { number: 47, name: "泽水困", lower: "坎", upper: "兑", theme: "承认受限", question: "先承认当前限制，哪些支持可以实际求助？" },
  { number: 48, name: "水风井", lower: "巽", upper: "坎", theme: "维护基础", question: "哪项长期有用的基础工作值得重新维护？" },
  { number: 49, name: "泽火革", lower: "离", upper: "兑", theme: "更新旧法", question: "改变之前需要准备哪些条件，并向谁说明？" },
  { number: 50, name: "火风鼎", lower: "巽", upper: "离", theme: "建立新秩序", question: "如何把已有经验整理成更稳定的新做法？" },
  { number: 51, name: "震为雷", lower: "震", upper: "震", theme: "面对突发", question: "事情突然变化时，先确认什么能让你稳住？" },
  { number: 52, name: "艮为山", lower: "艮", upper: "艮", theme: "停下来想", question: "暂停片刻后，哪些冲动会消退，哪些想法仍然重要？" },
  { number: 53, name: "风山渐", lower: "艮", upper: "巽", theme: "循序渐进", question: "把目标分成几步，第一步做到什么程度就够？" },
  { number: 54, name: "雷泽归妹", lower: "兑", upper: "震", theme: "看清位置", question: "每个人的角色和期待是否匹配？" },
  { number: 55, name: "雷火丰", lower: "离", upper: "震", theme: "把握高点", question: "事情进展快时，怎样记录成果并预留余地？" },
  { number: 56, name: "火山旅", lower: "艮", upper: "离", theme: "临时应变", question: "身处陌生环境时，什么能帮你保持灵活和谨慎？" },
  { number: 57, name: "巽为风", lower: "巽", upper: "巽", theme: "温和推进", question: "怎样用清楚、持续的小行动推动事情？" },
  { number: 58, name: "兑为泽", lower: "兑", upper: "兑", theme: "交流与愉悦", question: "怎样让交流更坦诚，也给彼此留出倾听的空间？" },
  { number: 59, name: "风水涣", lower: "坎", upper: "巽", theme: "疏通隔阂", question: "目前最大的隔阂是什么，怎样让信息重新流动？" },
  { number: 60, name: "水泽节", lower: "兑", upper: "坎", theme: "设定界限", question: "哪些限制是在保护你，哪些限制可以重新协商？" },
  { number: 61, name: "风泽中孚", lower: "兑", upper: "巽", theme: "建立信任", question: "如何让承诺具体、可见，并且能持续兑现？" },
  { number: 62, name: "雷山小过", lower: "艮", upper: "震", theme: "关注细节", question: "先把哪处细节做好，比急着做大决定更合适？" },
  { number: 63, name: "水火既济", lower: "离", upper: "坎", theme: "完成后复查", question: "事情接近完成时，还有什么需要检查和收尾？" },
  { number: 64, name: "火水未济", lower: "坎", upper: "离", theme: "尚待完成", question: "还有哪个环节未完成，怎样避免仓促收尾？" },
];

const HEXAGRAM_BY_PAIR = new Map(HEXAGRAMS.map((item) => [`${item.lower}${item.upper}`, item]));

/** Uniform integer draw using the browser's random source and rejection sampling. */
export function randomInteger(maxExclusive: number): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > 0x100000000) {
    throw new Error("随机范围无效。");
  }
  const values = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
  do {
    globalThis.crypto.getRandomValues(values);
  } while (values[0] >= limit);
  return values[0] % maxExclusive;
}

export function tossCup(): { faces: ["平面" | "凸面", "平面" | "凸面"]; result: "圣筊" | "笑筊" | "阴筊" } {
  const faces: ["平面" | "凸面", "平面" | "凸面"] = [randomInteger(2) ? "平面" : "凸面", randomInteger(2) ? "平面" : "凸面"];
  const result = faces[0] !== faces[1] ? "圣筊" : faces[0] === "平面" ? "笑筊" : "阴筊";
  return { faces, result };
}

export function tossCoinLine(): CoinLine {
  // Fixed app convention: heads (花面) = 3, tails (字面) = 2.
  return tossCoinThrow().line;
}

export function tossCoinThrow(): { line: CoinLine; coins: [boolean, boolean, boolean] } {
  const coins: [boolean, boolean, boolean] = [Boolean(randomInteger(2)), Boolean(randomInteger(2)), Boolean(randomInteger(2))];
  return { line: coins.reduce<number>((total, heads) => total + (heads ? 3 : 2), 0) as CoinLine, coins };
}

export function lineIsYang(value: CoinLine): boolean {
  return value === 7 || value === 9;
}

export function lineChanges(value: CoinLine): boolean {
  return value === 6 || value === 9;
}

export function resolveHexagram(lines: CoinLine[]): { current: HexagramInfo; changed: HexagramInfo; movingLines: number[] } | null {
  if (lines.length !== 6) return null;
  const trigramByBits = new Map(Object.entries(TRIGRAMS).map(([name, value]) => [value.bits, name as TrigramName]));
  const lookup = (bits: string) => {
    const lower = trigramByBits.get(bits.slice(0, 3));
    const upper = trigramByBits.get(bits.slice(3, 6));
    return lower && upper ? HEXAGRAM_BY_PAIR.get(`${lower}${upper}`) : undefined;
  };
  const baseBits = lines.map((line) => lineIsYang(line) ? "1" : "0").join("");
  const changedBits = lines.map((line) => lineChanges(line) ? (lineIsYang(line) ? "0" : "1") : (lineIsYang(line) ? "1" : "0")).join("");
  const current = lookup(baseBits);
  const changed = lookup(changedBits);
  if (!current || !changed) return null;
  return { current, changed, movingLines: lines.flatMap((line, index) => lineChanges(line) ? [index + 1] : []) };
}

export function hexagramSymbol(number: number): string {
  return String.fromCodePoint(0x4dc0 + number - 1);
}
