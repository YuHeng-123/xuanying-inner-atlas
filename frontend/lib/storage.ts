import type { ArchiveExportData, ArchiveImportMode, MyProfile, RelationshipEvent, RelationshipGroup, SavedDivinationReading, StoredRelationship } from "@/lib/types";

export const PROFILE_STORAGE_KEY = "my_bazi_profile";
export const HISTORY_STORAGE_KEY = "relationships_history";
export const EVENTS_STORAGE_KEY = "relationship_events";
export const DIVINATION_STORAGE_KEY = "divination_history_v1";
const MAX_DIVINATION_HISTORY = 12;

const isBrowser = () => typeof window !== "undefined";

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    throw new Error("无法读取本机档案，请允许浏览器访问网站存储后重试。原有档案未被覆盖。");
  }
}

/** Roll back completed writes if a later key fails. Never report a partial save as success. */
function writeStorage(entries: Array<[string, string]>): void {
  const written: Array<[string, string | null]> = [];
  try {
    const storage = window.localStorage;
    const previous = entries.map(([key]) => storage.getItem(key));
    entries.forEach(([key, value], index) => {
      storage.setItem(key, value);
      written.push([key, previous[index]]);
    });
  } catch {
    let rollbackFailed = false;
    for (const [key, value] of written.reverse()) {
      try {
        if (value === null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, value);
      } catch { rollbackFailed = true; }
    }
    throw new Error(rollbackFailed
      ? "保存失败且部分数据未能恢复。请先导出当前页面中的档案备份，暂勿刷新或继续修改。"
      : "未能保存到本机，可能是存储空间不足或浏览器禁止存储。原有档案保持不变；请先导出备份，再检查网站存储设置并重试。");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

function isValidGregorianDate(year: number, month: number, day: number): boolean {
  const value = new Date(Date.UTC(year, month - 1, day));
  return value.getUTCFullYear() === year && value.getUTCMonth() === month - 1 && value.getUTCDate() === day;
}

function isRiskLevel(value: unknown): value is StoredRelationship["risk_level"] {
  return value === "RED" || value === "YELLOW" || value === "GREEN";
}

export function validateProfile(value: unknown): value is MyProfile {
  if (!isRecord(value)) return false;
  return typeof value.name === "string" && value.name.trim().length > 0
    && isIntegerInRange(value.year, 1900, 2100)
    && isIntegerInRange(value.month, 1, 12)
    && isIntegerInRange(value.day, 1, 31)
    && isValidGregorianDate(value.year as number, value.month as number, value.day as number)
    && (value.hour === undefined || value.hour === null || isIntegerInRange(value.hour, 0, 23));
}

function validateBirthDate(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return isIntegerInRange(value.year, 1900, 2100)
    && isIntegerInRange(value.month, 1, 12)
    && isIntegerInRange(value.day, 1, 31)
    && isValidGregorianDate(value.year as number, value.month as number, value.day as number)
    && (value.hour === undefined || value.hour === null || isIntegerInRange(value.hour, 0, 23));
}

function validateDimensions(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return ["trust_cap", "synergy", "drain_rate", "friction", "stickiness"].every((key) =>
    typeof value[key] === "number" && Number.isFinite(value[key]) && value[key] >= 0 && value[key] <= 100);
}

function validateStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function validateReport(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return ["relationship_archetype", "one_sentence_verdict", "disclaimer"].every((key) =>
    typeof value[key] === "string")
    && ["risk_situations", "defense_strategies", "dos", "donts", "long_term_strategy", "social_quotes"].every((key) =>
      validateStringList(value[key]))
    && (value.risk_signals === undefined || validateStringList(value.risk_signals));
}

function validateInteraction(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.day_stems) || !isRecord(value.relation_counts)) return false;
  const relationsValid = Array.isArray(value.branch_relations) && value.branch_relations.every((relation) =>
    isRecord(relation) && ["type", "name", "branches", "scope"].every((key) => typeof relation[key] === "string")
      && Array.isArray(relation.positions) && relation.positions.every((position) => typeof position === "string"));
  const countsValid = Object.values(value.relation_counts).every((count) =>
    typeof count === "number" && Number.isFinite(count) && count >= 0);
  const modifiersValid = Array.isArray(value.modifiers_applied) && value.modifiers_applied.every((modifier) =>
    isRecord(modifier) && typeof modifier.source === "string" && isRecord(modifier.deltas)
      && Object.values(modifier.deltas).every((delta) => typeof delta === "number" && Number.isFinite(delta)));
  return isRiskLevel(value.risk_level)
    && validateDimensions(value.dimensions)
    && typeof value.risk_pressure === "number" && Number.isFinite(value.risk_pressure)
    && typeof value.ten_god === "string"
    && typeof value.day_stems.user === "string" && typeof value.day_stems.target === "string"
    && validateStringList(value.risk_reasons)
    && relationsValid && countsValid && modifiersValid;
}

function validateScenarioPoint(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.assumed_hours) || !isRecord(value.assumed_branches)) return false;
  return typeof value.label === "string"
    && isIntegerInRange(value.assumed_hours.user, 0, 23)
    && isIntegerInRange(value.assumed_hours.target, 0, 23)
    && typeof value.assumed_branches.user === "string"
    && typeof value.assumed_branches.target === "string"
    && isRecord(value.user_bazi)
    && isRecord(value.target_bazi)
    && validateInteraction(value.interaction);
}

function validateTimeScenarios(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const allScenariosValid = value.all_scenarios === undefined
    || (Array.isArray(value.all_scenarios) && value.all_scenarios.every((scenario) => {
      if (!isRecord(scenario) || !isRecord(scenario.assumed_hours) || !isRecord(scenario.assumed_branches)) return false;
      return typeof scenario.label === "string"
        && isIntegerInRange(scenario.assumed_hours.user, 0, 23)
        && isIntegerInRange(scenario.assumed_hours.target, 0, 23)
        && typeof scenario.assumed_branches.user === "string"
        && typeof scenario.assumed_branches.target === "string"
        && isRiskLevel(scenario.risk_level)
        && typeof scenario.risk_pressure === "number" && Number.isFinite(scenario.risk_pressure)
        && validateDimensions(scenario.dimensions)
        && validateStringList(scenario.risk_reasons)
        && Array.isArray(scenario.branch_relations) && scenario.branch_relations.every((relation) =>
          isRecord(relation) && typeof relation.name === "string" && typeof relation.branches === "string");
    }));
  const warningsValid = [value.common_warnings, value.time_sensitive_warnings].every((warnings) =>
    warnings === undefined || (Array.isArray(warnings) && warnings.every((warning) =>
      isRecord(warning) && typeof warning.text === "string" && typeof warning.count === "number")));
  return ["target_unknown", "user_unknown", "both_unknown"].includes(String(value.mode))
    && isIntegerInRange(value.candidate_count, 1, 169)
    && isIntegerInRange(value.hour_branch_count, 12, 12)
    && typeof value.day_boundary_note === "string"
    && typeof value.ranking_method === "string"
    && validateScenarioPoint(value.best_case)
    && validateScenarioPoint(value.worst_case)
    && typeof value.extremes_are_distinct === "boolean"
    && allScenariosValid
    && warningsValid;
}

function validateAnalysis(value: unknown): boolean {
  if (!isRecord(value) || !validateInteraction(value.interaction) || !validateReport(value.report)) return false;
  const scenarioValid = !("time_scenarios" in value)
    || value.time_scenarios === null
    || value.time_scenarios === undefined
    || validateTimeScenarios(value.time_scenarios);
  return (value.report_source === "LLM" || value.report_source === "MOCK")
    && typeof value.relationship_type === "string"
    && isRecord(value.user_bazi) && isRecord(value.target_bazi)
    && scenarioValid;
}

export function validateRelationship(value: unknown): value is StoredRelationship {
  if (!isRecord(value)) return false;
  return typeof value.id === "string"
    && typeof value.targetName === "string"
    && typeof value.relationshipType === "string"
    && validateBirthDate(value.targetDate)
    && isRiskLevel(value.risk_level)
    && validateDimensions(value.metrics)
    && validateReport(value.report)
    && typeof value.createdAt === "string"
    && (value.profileSnapshot === undefined || validateProfile(value.profileSnapshot))
    && validateAnalysis(value.analysis);
}

export function validateRelationshipEvent(value: unknown): value is RelationshipEvent {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && value.id.length > 0
    && typeof value.personKey === "string" && value.personKey.length > 0
    && typeof value.targetName === "string" && value.targetName.trim().length > 0
    && ["直属领导", "平级同事", "合伙人", "朋友", "相亲对象"].includes(String(value.relationshipType))
    && typeof value.occurredAt === "string" && Number.isFinite(Date.parse(value.occurredAt))
    && typeof value.summary === "string" && value.summary.trim().length > 0 && value.summary.length <= 1000
    && (value.respect === "yes" || value.respect === "mixed" || value.respect === "no")
    && (value.reflection === undefined || (typeof value.reflection === "string" && value.reflection.length <= 1000));
}

function validateDivinationDetail(value: unknown, mode: unknown): boolean {
  if (!isRecord(value) || value.mode !== mode) return false;
  if (mode === "choice") {
    return Array.isArray(value.options)
      && value.options.length >= 2 && value.options.length <= 4
      && value.options.every((option) => typeof option === "string" && option.trim().length > 0 && option.length <= 40)
      && typeof value.selection === "string" && value.options.includes(value.selection);
  }
  if (mode === "cups") {
    if (!Array.isArray(value.faces) || value.faces.length !== 2
      || !value.faces.every((face) => face === "平面" || face === "凸面")) return false;
    const expected = value.faces[0] !== value.faces[1] ? "圣筊" : value.faces[0] === "平面" ? "笑筊" : "阴筊";
    return value.outcome === expected;
  }
  if (mode === "lot") {
    return typeof value.number === "number" && Number.isInteger(value.number) && value.number >= 1 && value.number <= 24
      && ["上签", "吉签", "中平", "下签"].includes(String(value.rank))
      && typeof value.title === "string" && value.title.trim().length > 0 && value.title.length <= 80
      && typeof value.reflection === "string" && value.reflection.trim().length > 0 && value.reflection.length <= 500;
  }
  return mode === "hexagram"
    && Array.isArray(value.lines) && value.lines.length === 6
    && value.lines.every((line) => line === 6 || line === 7 || line === 8 || line === 9);
}

export function validateDivinationReading(value: unknown): value is SavedDivinationReading {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && value.id.length > 0
    && (value.mode === "choice" || value.mode === "cups" || value.mode === "lot" || value.mode === "hexagram")
    && typeof value.question === "string" && typeof value.result === "string"
    && typeof value.createdAt === "string" && Number.isFinite(Date.parse(value.createdAt))
    && (value.detail === undefined || validateDivinationDetail(value.detail, value.mode));
}

function safelyParse(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function normalizeIdentity(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

export function createPersonKey(relationship: Pick<StoredRelationship, "targetName" | "relationshipType" | "targetDate">): string {
  const { targetDate } = relationship;
  const dateKey = [targetDate.year, targetDate.month, targetDate.day].join("-");
  return `${normalizeIdentity(relationship.targetName)}|${normalizeIdentity(relationship.relationshipType)}|${dateKey}`;
}

function legacyPersonKey(relationship: Pick<StoredRelationship, "targetName" | "relationshipType" | "targetDate">): string {
  return `${createPersonKey(relationship)}-${relationship.targetDate.hour ?? "unknown"}`;
}

export function existingPersonKey(relationships: StoredRelationship[], candidate: Pick<StoredRelationship, "targetName" | "relationshipType" | "targetDate">): string | null {
  const identity = createPersonKey(candidate);
  const existing = relationships.find((item) => createPersonKey(item) === identity);
  return existing?.personKey ?? null;
}

/** Reconcile legacy hour-dependent keys in memory; callers persist on the next user save. */
export function reconcilePersonIdentity(relationships: StoredRelationship[], events: RelationshipEvent[]): {
  relationships: StoredRelationship[]; events: RelationshipEvent[];
} {
  const byIdentity = new Map<string, StoredRelationship[]>();
  relationships.forEach((item) => {
    const identity = createPersonKey(item);
    byIdentity.set(identity, [...(byIdentity.get(identity) ?? []), item]);
  });
  const stableKeys = new Map<string, string>();
  byIdentity.forEach((records, identity) => {
    const existing = records.find((item) => item.personKey?.startsWith("person:"));
    stableKeys.set(identity, existing?.personKey ?? `person:${records[0].id}`);
  });
  const oldToStable = new Map<string, string>();
  const normalizedRelationships = relationships.map((item) => {
    const stable = stableKeys.get(createPersonKey(item))!;
    oldToStable.set(item.personKey || createPersonKey(item), stable);
    oldToStable.set(createPersonKey(item), stable);
    oldToStable.set(legacyPersonKey(item), stable);
    return item.personKey === stable ? item : { ...item, personKey: stable };
  });
  const normalizedEvents = events.map((event) => {
    const stable = oldToStable.get(event.personKey);
    return stable && stable !== event.personKey ? { ...event, personKey: stable } : event;
  });
  return { relationships: normalizedRelationships, events: normalizedEvents };
}

export function relationshipWithKey(relationship: StoredRelationship): StoredRelationship {
  return relationship.personKey ? relationship : { ...relationship, personKey: createPersonKey(relationship) };
}

export function loadProfile(): MyProfile | null {
  if (!isBrowser()) return null;
  const parsed = safelyParse(readStorage(PROFILE_STORAGE_KEY));
  return validateProfile(parsed) ? parsed : null;
}

export function saveProfile(profile: MyProfile): void {
  if (!isBrowser()) return;
  if (!validateProfile(profile)) throw new Error("请填写有效的姓名和公历生日（1900—2100 年）。");
  writeStorage([[PROFILE_STORAGE_KEY, JSON.stringify(profile)]]);
}

export function loadRelationships(): StoredRelationship[] {
  if (!isBrowser()) return [];
  const parsed = safelyParse(readStorage(HISTORY_STORAGE_KEY));
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(validateRelationship).map(relationshipWithKey);
}

export function saveRelationships(relationships: StoredRelationship[]): void {
  if (!isBrowser()) return;
  if (!relationships.every(validateRelationship)) throw new Error("关系记录不完整，未保存任何改动。");
  writeStorage([[HISTORY_STORAGE_KEY, JSON.stringify(relationships.map(relationshipWithKey))]]);
}

export function loadRelationshipEvents(): RelationshipEvent[] {
  if (!isBrowser()) return [];
  const parsed = safelyParse(readStorage(EVENTS_STORAGE_KEY));
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(validateRelationshipEvent).sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt));
}

export function saveRelationshipEvents(events: RelationshipEvent[]): void {
  if (!isBrowser()) return;
  if (!events.every(validateRelationshipEvent)) throw new Error("互动记录不完整，未保存任何改动。");
  writeStorage([[EVENTS_STORAGE_KEY, JSON.stringify(events)]]);
}

export function loadDivinationHistory(): SavedDivinationReading[] {
  if (!isBrowser()) return [];
  const parsed = safelyParse(readStorage(DIVINATION_STORAGE_KEY));
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(validateDivinationReading).slice(0, MAX_DIVINATION_HISTORY);
}

export function saveDivinationHistory(history: SavedDivinationReading[]): void {
  if (!isBrowser()) return;
  if (!Array.isArray(history) || !history.every(validateDivinationReading)) throw new Error("占卜记录不完整，未保存任何改动。");
  writeStorage([[DIVINATION_STORAGE_KEY, JSON.stringify(history.slice(0, MAX_DIVINATION_HISTORY))]]);
}

/** v1 backups omit divination; returning undefined preserves the current browser history. */
export function combineDivinationHistory(current: SavedDivinationReading[], incoming: SavedDivinationReading[] | undefined, mode: ArchiveImportMode): SavedDivinationReading[] | undefined {
  if (incoming === undefined) return undefined;
  if (mode === "replace") return incoming.slice(0, MAX_DIVINATION_HISTORY);
  const merged = [...current, ...incoming.filter((item) => !current.some((saved) => saved.id === item.id))];
  return merged.slice(0, MAX_DIVINATION_HISTORY);
}

export function saveArchiveState(relationships: StoredRelationship[], events: RelationshipEvent[], profile?: MyProfile, divinationHistory?: SavedDivinationReading[]): void {
  if (!isBrowser()) return;
  if (!relationships.every(validateRelationship) || !events.every(validateRelationshipEvent)
    || (profile !== undefined && !validateProfile(profile))
    || (divinationHistory !== undefined && (!Array.isArray(divinationHistory) || !divinationHistory.every(validateDivinationReading)))) throw new Error("档案数据不完整，未保存任何改动。");
  const entries: Array<[string, string]> = [
    [HISTORY_STORAGE_KEY, JSON.stringify(relationships.map(relationshipWithKey))],
    [EVENTS_STORAGE_KEY, JSON.stringify(events)],
  ];
  if (profile !== undefined) entries.push([PROFILE_STORAGE_KEY, JSON.stringify(profile)]);
  if (divinationHistory !== undefined) entries.push([DIVINATION_STORAGE_KEY, JSON.stringify(divinationHistory.slice(0, MAX_DIVINATION_HISTORY))]);
  writeStorage(entries);
}

function asTimestamp(value: StoredRelationship): number {
  const parsed = Date.parse(value.updatedAt || value.createdAt);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function groupRelationships(relationships: StoredRelationship[]): RelationshipGroup[] {
  const groups = new Map<string, StoredRelationship[]>();
  relationships.map(relationshipWithKey).forEach((relationship) => {
    const key = relationship.personKey || createPersonKey(relationship);
    groups.set(key, [...(groups.get(key) ?? []), relationship]);
  });
  return Array.from(groups.entries())
    .map(([personKey, history]) => {
      const sortedHistory = [...history].sort((a, b) => asTimestamp(a) - asTimestamp(b));
      return { personKey, history: sortedHistory, latest: sortedHistory[sortedHistory.length - 1] };
    })
    .sort((a, b) => asTimestamp(b.latest) - asTimestamp(a.latest));
}

export function exportArchive(profile: MyProfile | null, relationships: StoredRelationship[], events: RelationshipEvent[] = [], divinationHistory: SavedDivinationReading[] = []): ArchiveExportData {
  if (!divinationHistory.every(validateDivinationReading)) throw new Error("占卜记录不完整，无法导出备份。");
  return { version: 2, exportedAt: new Date().toISOString(), profile, relationships: relationships.map(relationshipWithKey), events, divinationHistory: divinationHistory.slice(0, MAX_DIVINATION_HISTORY) };
}

export function parseArchiveImport(value: unknown): ArchiveExportData {
  if (!isRecord(value) || (value.version !== 1 && value.version !== 2) || typeof value.exportedAt !== "string" || !Array.isArray(value.relationships)) {
    throw new Error("导入文件格式不正确，无法识别档案版本。");
  }
  if (value.profile !== null && value.profile !== undefined && !validateProfile(value.profile)) {
    throw new Error("导入文件中的我的底牌数据无效。");
  }
  const invalidRelationship = value.relationships.some((relationship) => !validateRelationship(relationship));
  if (invalidRelationship) throw new Error("导入文件包含损坏的关系记录，未执行任何覆盖操作。");
  const events = value.events === undefined ? [] : value.events;
  if (!Array.isArray(events) || events.some((event) => !validateRelationshipEvent(event))) {
    throw new Error("导入文件包含损坏的关系事件，未执行任何覆盖操作。");
  }
  const divinationHistory = value.version === 1 ? undefined : value.divinationHistory;
  if (value.version === 2 && (!Array.isArray(divinationHistory) || divinationHistory.some((item) => !validateDivinationReading(item)))) {
    throw new Error("导入文件包含损坏的占卜记录，未执行任何覆盖操作。");
  }
  return {
    version: value.version,
    exportedAt: value.exportedAt,
    profile: value.profile === null || value.profile === undefined ? null : value.profile,
    relationships: value.relationships.map((relationship) => relationshipWithKey(relationship as StoredRelationship)),
    events: events as RelationshipEvent[],
    ...(divinationHistory === undefined ? {} : { divinationHistory: divinationHistory as SavedDivinationReading[] }),
  };
}
