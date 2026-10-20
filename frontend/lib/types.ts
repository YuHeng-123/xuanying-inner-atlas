export type RiskLevel = "RED" | "YELLOW" | "GREEN";

export type RelationshipType = "直属领导" | "平级同事" | "合伙人" | "朋友" | "相亲对象";

export type DimensionKey = "trust_cap" | "synergy" | "drain_rate" | "friction" | "stickiness";

export interface DualFormValues {
  userName: string;
  userDate: string;
  userHour: string;
  targetName: string;
  targetDate: string;
  targetHour: string;
  relationshipType: RelationshipType;
  concern: string;
}

export interface MyProfile {
  name: string;
  year: number;
  month: number;
  day: number;
  hour?: number | null;
}

export interface BirthDate {
  year: number;
  month: number;
  day: number;
  hour?: number | null;
}

export interface BaziFeature {
  calendar: string;
  birth: BirthDate;
  pillars: { year: string; month: string; day: string; hour: string | null };
  characters: string[];
  stems: Record<string, string>;
  branches: Record<string, string>;
  day_stem: string;
  day_branch: string;
  has_hour: boolean;
  pillar_count: number;
  calculation_convention?: {
    input_calendar: string;
    timezone: string;
    year_boundary: string;
    month_boundary: string;
    day_boundary: string;
    true_solar_time: boolean;
    note: string;
  };
}

export interface Dimensions {
  trust_cap: number;
  synergy: number;
  drain_rate: number;
  friction: number;
  stickiness: number;
}

export interface BranchRelation {
  type: string;
  name: string;
  branches: string;
  scope: string;
  positions: string[];
}

export interface InteractionResult {
  ten_god: string;
  day_stems: { user: string; target: string };
  dimensions: Dimensions;
  risk_level: RiskLevel;
  risk_pressure: number;
  branch_relations: BranchRelation[];
  relation_counts: Record<string, number>;
  risk_reasons: string[];
  modifiers_applied: Array<Record<string, unknown>>;
}

export interface ReportData {
  relationship_archetype: string;
  one_sentence_verdict: string;
  risk_situations: string[];
  /** Added later; older stored reports can omit these review cues. */
  risk_signals?: string[];
  defense_strategies: string[];
  dos: string[];
  donts: string[];
  long_term_strategy: string[];
  social_quotes: string[];
  disclaimer: string;
}

export interface TimeScenarioPoint {
  label: string;
  assumed_hours: { user: number; target: number };
  assumed_branches: { user: string; target: string };
  user_bazi: BaziFeature;
  target_bazi: BaziFeature;
  interaction: InteractionResult;
}

export interface TimeScenarioSummary {
  label: string;
  assumed_hours: { user: number; target: number };
  assumed_branches: { user: string; target: string };
  risk_level: RiskLevel;
  risk_pressure: number;
  dimensions: Dimensions;
  risk_reasons: string[];
  branch_relations: Array<{ name: string; branches: string }>;
}

export interface ScenarioWarning {
  text: string;
  count: number;
}

export interface TimeScenarioComparison {
  mode: "target_unknown" | "user_unknown" | "both_unknown";
  candidate_count: number;
  hour_branch_count: number;
  day_boundary_note: string;
  ranking_method: string;
  best_case: TimeScenarioPoint;
  worst_case: TimeScenarioPoint;
  extremes_are_distinct: boolean;
  all_scenarios?: TimeScenarioSummary[];
  common_warnings?: ScenarioWarning[];
  time_sensitive_warnings?: ScenarioWarning[];
}

export interface AnalysisResponse {
  report_source: "LLM" | "MOCK";
  relationship_type: string;
  user_bazi: BaziFeature;
  target_bazi: BaziFeature;
  interaction: InteractionResult;
  report: ReportData;
  time_scenarios?: TimeScenarioComparison | null;
}

export interface StoredRelationship {
  id: string;
  targetName: string;
  relationshipType: RelationshipType;
  targetDate: BirthDate;
  risk_level: RiskLevel;
  metrics: Dimensions;
  report: ReportData;
  createdAt: string;
  /** Immutable copy of the user's chart inputs at analysis time; absent on legacy archives. */
  profileSnapshot?: MyProfile;
  /** 原始分析快照，用于离线恢复完整报告；保留为历史记录的向后兼容扩展。 */
  analysis: AnalysisResponse;
  personKey?: string;
  updatedAt?: string;
}

export interface RelationshipEvent {
  id: string;
  personKey: string;
  targetName: string;
  relationshipType: RelationshipType;
  occurredAt: string;
  summary: string;
  respect: "yes" | "mixed" | "no";
  reflection?: string;
}

export interface RelationshipGroup {
  personKey: string;
  latest: StoredRelationship;
  history: StoredRelationship[];
}

export interface RiskTrendPoint {
  id: string;
  riskLevel: RiskLevel;
  createdAt: string;
}

export type SavedDivinationMode = "choice" | "cups" | "lot" | "hexagram";

export type DivinationLotRank = "上签" | "吉签" | "中平" | "下签";

export type SavedDivinationDetail =
    | { mode: "choice"; options: string[]; selection: string }
    | { mode: "cups"; faces: ["平面" | "凸面", "平面" | "凸面"]; outcome: "圣筊" | "笑筊" | "阴筊" }
    | { mode: "lot"; number: number; rank: DivinationLotRank; title: string; reflection: string }
    | { mode: "hexagram"; lines: Array<6 | 7 | 8 | 9> };

export interface SavedDivinationReading {
  id: string;
  mode: SavedDivinationMode;
  question: string;
  result: string;
  createdAt: string;
  /** Optional for older v1/v2 backups that preserved only the result summary. */
  detail?: SavedDivinationDetail;
}

export interface ArchiveExportData {
  version: 1 | 2;
  exportedAt: string;
  profile: MyProfile | null;
  relationships: StoredRelationship[];
  events?: RelationshipEvent[];
  /** Absent in v1 archives; kept optional so older backups remain readable. */
  divinationHistory?: SavedDivinationReading[];
}

export interface TwelveCiCandidate {
  id: string;
  name: string;
  earthly_branch: string;
  start_term: string;
  end_term: string;
  start_at: string;
  end_at: string;
}

export interface TwelveCiLookup {
  has_hour: boolean;
  timezone: string;
  candidates: TwelveCiCandidate[];
  boundary_note: string | null;
  method_note: string;
}

export type ArchiveImportMode = "merge" | "replace";

export interface ProfileDraft {
  name: string;
  date: string;
  hour: string;
}
