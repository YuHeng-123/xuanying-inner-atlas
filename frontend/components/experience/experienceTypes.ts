import type { RiskLevel } from "@/lib/types";
import type { CoinLine } from "@/lib/divination";
import type { DivinationLotRank } from "@/lib/types";

export type WorkspaceTab = "bazi" | "ziwei" | "star-ci" | "relationships" | "archive" | "decision";
export type DecisionMode = "choice" | "cups" | "lot" | "hexagram";
export type ExperiencePhase = "intro" | "entering" | "hall";
export interface ScenePerson { id: string; name: string; risk: RiskLevel; }
export interface SceneData { profileName: string | null; dayStem: string | null; people: ScenePerson[]; }
export interface RitualEvent {
  id: string;
    kind: "choice" | "cups" | "lot" | "coins";
  faces?: ["平面" | "凸面", "平面" | "凸面"];
  line?: CoinLine;
  lines?: CoinLine[];
  coins?: [boolean, boolean, boolean];
  options?: string[];
    selection?: string;
    lotNumber?: number;
    lotRank?: DivinationLotRank;
    lotTitle?: string;
  }
