export type ExperienceObjectId = "disc" | "relationships" | "divination" | "archive";

export interface ExperienceObject {
  id: ExperienceObjectId;
  number: string;
  name: string;
  shortName: string;
  place: string;
  description: string;
  future: string;
  position: [number, number, number];
  camera: [number, number, number];
  target: [number, number, number];
}

export const EXPERIENCE_OBJECTS: ExperienceObject[] = [
  {
    id: "disc", number: "01", name: "天地人仪器", shortName: "命盘", place: "中央 · 天地人仪器",
    description: "靠近仪器，天地人三层板片展开。建立自己的命盘，切换八字、紫微斗数与十二星次，从不同角度认识自己。",
    future: "八字、紫微与十二星次共用个人出生档案。",
    position: [0, 2.85, 0], camera: [1.4, 3.7, 7.3], target: [0, 2.55, 0],
  },
  {
    id: "relationships", number: "02", name: "关系流场", shortName: "人际", place: "左侧 · 关系流场",
    description: "沿流动的形态进入关系空间。查看人物档案与关系报告，记录相处经历，也可以练习一次难以开口的对话。",
    future: "人物入口连接已保存的档案。",
    position: [-3.35, 1.8, 0.85], camera: [-3.5, 2.6, 5.9], target: [-3.25, 1.55, 0.8],
  },
  {
    id: "divination", number: "03", name: "问卦装置", shortName: "问卦", place: "右侧 · 问卦装置",
    description: "写下问题，选择圣杯掷筊、签筒抽签或铜钱六爻；日常小选择也可单独随机抽选。结果可以保存回看。",
    future: "掷筊、签筒、六爻与日常抽选共用本机记录。",
    position: [3.45, 1.05, 1.05], camera: [3.5, 3.6, 5.6], target: [3.45, 0.85, 1.05],
  },
  {
    id: "archive", number: "04", name: "记忆档案", shortName: "档案", place: "后方 · 记忆档案",
    description: "整理人物与关系记录，按分组查找历史内容。可以导出档案备份，也可以把此前保存的备份恢复到当前浏览器。",
    future: "档案支持检索、导出备份与恢复。",
    position: [3.65, 1.5, -2.4], camera: [4.4, 2.7, 2.7], target: [3.65, 1.4, -2.25],
  },
];

export function getExperienceObject(id: ExperienceObjectId | null) {
  return EXPERIENCE_OBJECTS.find((item) => item.id === id) ?? null;
}
