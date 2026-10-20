const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function loadTypeScriptModule(relativePath) {
  const filename = path.join(__dirname, "..", relativePath);
  const source = fs.readFileSync(filename, "utf8");
  const { outputText, diagnostics } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  const errors = (diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, `Could not transpile ${relativePath}`);
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded._compile(outputText, filename);
  return loaded.exports;
}

const storage = loadTypeScriptModule("lib/storage.ts");
const profileSnapshots = loadTypeScriptModule("lib/profileSnapshot.ts");
const api = loadTypeScriptModule("lib/api.ts");
const { transformedStars } = loadTypeScriptModule("lib/ziwei.ts");
const divination = loadTypeScriptModule("lib/divination.ts");
const originalModuleLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "@/lib/divination") return divination;
  return originalModuleLoad.call(this, request, parent, isMain);
};
let divinationLots;
try {
  divinationLots = loadTypeScriptModule("lib/divinationLots.ts");
} finally {
  Module._load = originalModuleLoad;
}

function makeReport() {
  return {
    relationship_archetype: "规则协作型",
    one_sentence_verdict: "关键事项先确认边界。",
    risk_situations: ["目标不清"],
    defense_strategies: ["书面确认"],
    dos: ["确认交付"],
    donts: ["不做口头承诺"],
    long_term_strategy: ["定期复盘"],
    social_quotes: ["我先同步一下口径。"],
    disclaimer: "仅作参考。",
  };
}

function makeAnalysis() {
  const dimensions = { trust_cap: 60, synergy: 55, drain_rate: 40, friction: 30, stickiness: 50 };
  const interaction = {
    ten_god: "正官",
    day_stems: { user: "甲", target: "辛" },
    dimensions,
    risk_level: "YELLOW",
    risk_pressure: 39.5,
    branch_relations: [],
    relation_counts: {},
    risk_reasons: [],
    modifiers_applied: [],
  };
  const bazi = { birth: { year: 1992, month: 6, day: 18, hour: 12 } };
  return {
    report_source: "MOCK",
    relationship_type: "直属领导",
    user_bazi: bazi,
    target_bazi: { birth: { year: 1988, month: 2, day: 11 } },
    interaction,
    report: makeReport(),
  };
}

function makeRelationship(overrides = {}) {
  const analysis = makeAnalysis();
  return {
    id: "record-1",
    targetName: "周总",
    relationshipType: "直属领导",
    targetDate: { year: 1988, month: 2, day: 11 },
    risk_level: "YELLOW",
    metrics: analysis.interaction.dimensions,
    report: analysis.report,
    createdAt: "2026-09-28T00:00:00.000Z",
    analysis,
    ...overrides,
  };
}

function installLocalStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  global.window = { localStorage: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  } };
  return values;
}

test.afterEach(() => { delete global.window; });

test("storage denial produces a recoverable message instead of an empty archive", () => {
  global.window = { get localStorage() { throw new Error("SecurityError"); } };
  assert.throws(() => storage.loadProfile(), /无法读取本机档案/);
  assert.throws(() => storage.loadRelationships(), /无法读取本机档案/);
  assert.throws(() => storage.loadRelationshipEvents(), /无法读取本机档案/);
});

test("failed archive writes restore previously written keys", () => {
  const values = installLocalStorage({
    [storage.HISTORY_STORAGE_KEY]: JSON.stringify([makeRelationship()]),
    [storage.EVENTS_STORAGE_KEY]: "[]",
    [storage.PROFILE_STORAGE_KEY]: JSON.stringify({ name: "旧资料", year: 1992, month: 6, day: 18 }),
  });
  const before = [...values.entries()];
  const originalWrite = window.localStorage.setItem;
  window.localStorage.setItem = (key, value) => {
    if (key === storage.PROFILE_STORAGE_KEY) throw new Error("QuotaExceededError");
    originalWrite(key, value);
  };
  assert.throws(() => storage.saveArchiveState([], [], { name: "新资料", year: 1993, month: 6, day: 18 }), /原有档案保持不变/);
  assert.deepEqual([...values.entries()], before);
});

test("invalid records cannot silently erase history on save", () => {
  const values = installLocalStorage({ [storage.HISTORY_STORAGE_KEY]: JSON.stringify([makeRelationship()]) });
  const before = values.get(storage.HISTORY_STORAGE_KEY);
  assert.throws(() => storage.saveRelationships([{ id: "broken" }]), /未保存任何改动/);
  assert.equal(values.get(storage.HISTORY_STORAGE_KEY), before);
  assert.throws(() => storage.saveProfile({ name: "我", year: 1992, month: 2, day: 31 }), /有效/);
});

test("four transformations include minor stars across representative birth years", () => {
  const { astro } = require("iztro");
  for (const year of [1981, 1982, 1986, 1988, 1991, 1992]) {
    const chart = astro.bySolar(`${year}-6-18`, 6, "男", true, "zh-CN");
    const transformed = chart.palaces.flatMap(transformedStars);
    assert.equal(transformed.length, 4, `missing transformations for ${year}`);
    assert.deepEqual(new Set(transformed.map((star) => star.mutagen)), new Set(["禄", "权", "科", "忌"]));
  }
  const chart = astro.bySolar("1991-6-18", 6, "男", true, "zh-CN");
  const transformed = chart.palaces.flatMap(transformedStars);
  assert.ok(transformed.some((star) => star.name === "文昌" && star.mutagen === "忌"));
  assert.ok(transformed.some((star) => star.name === "文曲" && star.mutagen === "科"));
});

test("archive export/import preserves records and profile snapshots", () => {
  const profile = { name: "我", year: 1992, month: 6, day: 18, hour: 12 };
  const record = makeRelationship({ profileSnapshot: profile });
  const reading = { id: "reading-1", mode: "cups", question: "要不要出发？", result: "一正一反", createdAt: "2026-09-28T01:00:00.000Z" };
  const archive = storage.exportArchive(profile, [record], [], [reading]);
  const imported = storage.parseArchiveImport(JSON.parse(JSON.stringify(archive)));

  assert.equal(imported.version, 2);
  assert.equal(imported.profile?.name, "我");
  assert.equal(imported.relationships[0].profileSnapshot.year, 1992);
  assert.equal(imported.relationships[0].report.one_sentence_verdict, "关键事项先确认边界。");
  assert.deepEqual(imported.divinationHistory, [reading]);
});

test("detailed divination records survive backup and reject inconsistent detail", () => {
  const readings = [
    { id: "choice-detail", mode: "choice", question: "午饭吃什么？", result: "随机抽到「吃饭」", createdAt: "2026-09-28T01:00:00.000Z", detail: { mode: "choice", options: ["吃面", "吃饭"], selection: "吃饭" } },
    { id: "cups-detail", mode: "cups", question: "今天适合出发吗？", result: "圣筊", createdAt: "2026-09-28T02:00:00.000Z", detail: { mode: "cups", faces: ["平面", "凸面"], outcome: "圣筊" } },
    { id: "lot-detail", mode: "lot", question: "先做哪一步？", result: "第 03 签 · 上签「积累见效」", createdAt: "2026-09-28T03:00:00.000Z", detail: { mode: "lot", number: 3, rank: "上签", title: "积累见效", reflection: "沿着可验证的进展继续。" } },
    { id: "hexagram-detail", mode: "hexagram", question: "先做哪一步？", result: "第六卦", createdAt: "2026-09-28T04:00:00.000Z", detail: { mode: "hexagram", lines: [7, 8, 9, 6, 7, 8] } },
  ];
  const imported = storage.parseArchiveImport(JSON.parse(JSON.stringify(storage.exportArchive(null, [], [], readings))));

  assert.deepEqual(imported.divinationHistory, readings);
  assert.equal(storage.validateDivinationReading({ ...readings[0], detail: { ...readings[0].detail, selection: "没在选项里" } }), false);
  assert.equal(storage.validateDivinationReading({ ...readings[1], detail: { ...readings[1].detail, outcome: "阴筊" } }), false);
  assert.equal(storage.validateDivinationReading({ ...readings[2], detail: { ...readings[2].detail, rank: "大吉" } }), false);
  assert.equal(storage.validateDivinationReading({ ...readings[3], detail: { ...readings[3].detail, lines: [7, 8, 9] } }), false);
});

test("version 1 archives remain readable and do not claim divination records", () => {
  const archive = { version: 1, exportedAt: "2026-09-28T00:00:00.000Z", profile: null, relationships: [makeRelationship()] };
  const imported = storage.parseArchiveImport(archive);

  assert.equal(imported.version, 1);
  assert.equal(imported.divinationHistory, undefined);
  const current = [{ id: "local", mode: "choice", question: "现存问题", result: "饭", createdAt: "2026-09-28T01:00:00.000Z" }];
  assert.equal(storage.combineDivinationHistory(current, imported.divinationHistory, "replace"), undefined);
});

test("v2 divination merge keeps local entries and avoids duplicate readings", () => {
  const local = { id: "local", mode: "choice", question: "本地问题", result: "面", createdAt: "2026-09-28T02:00:00.000Z" };
  const shared = { id: "shared", mode: "cups", question: "共同记录", result: "圣筊", createdAt: "2026-09-28T01:00:00.000Z" };
  const imported = { id: "imported", mode: "hexagram", question: "旧备份", result: "第六卦", createdAt: "2026-09-27T01:00:00.000Z" };

  assert.deepEqual(storage.combineDivinationHistory([local, shared], [shared, imported], "merge"), [local, shared, imported]);
  assert.deepEqual(storage.combineDivinationHistory([local], [shared], "replace"), [shared]);
});

test("archive import rejects corrupt v2 divination entries", () => {
  const archive = { version: 2, exportedAt: "2026-09-28T00:00:00.000Z", profile: null, relationships: [], events: [], divinationHistory: [{ id: "broken" }] };

  assert.throws(() => storage.parseArchiveImport(archive), /损坏的占卜记录/);
});

test("coin animation data and calculated line always describe the same three coins", () => {
  for (let index = 0; index < 40; index += 1) {
    const thrown = divination.tossCoinThrow();
    const total = thrown.coins.reduce((sum, heads) => sum + (heads ? 3 : 2), 0);
    assert.equal(thrown.line, total);
    assert.ok([6, 7, 8, 9].includes(thrown.line));
  }
});

test("lot pool has balanced original ranks and draws a complete local prompt", () => {
  const { DIVINATION_LOTS, drawDivinationLot } = divinationLots;
  assert.equal(DIVINATION_LOTS.length, 24);
  assert.deepEqual([...new Set(DIVINATION_LOTS.map((lot) => lot.number))].sort((a, b) => a - b), Array.from({ length: 24 }, (_, index) => index + 1));
  for (const rank of ["上签", "吉签", "中平", "下签"]) {
    assert.equal(DIVINATION_LOTS.filter((lot) => lot.rank === rank).length, 6);
  }
  const draw = drawDivinationLot();
  assert.ok(DIVINATION_LOTS.some((lot) => lot.number === draw.number && lot.title === draw.title && lot.reflection === draw.reflection));
});

test("archive state restores divination history in the same transactional write", () => {
  const reading = { id: "reading-1", mode: "hexagram", question: "是否继续？", result: "第六卦", createdAt: "2026-09-28T01:00:00.000Z" };
  const values = installLocalStorage({ [storage.DIVINATION_STORAGE_KEY]: "[]" });

  storage.saveArchiveState([], [], undefined, [reading]);
  assert.deepEqual(storage.loadDivinationHistory(), [reading]);

  const before = [...values.entries()];
  const originalWrite = window.localStorage.setItem;
  window.localStorage.setItem = (key, value) => {
    if (key === storage.DIVINATION_STORAGE_KEY) throw new Error("QuotaExceededError");
    originalWrite(key, value);
  };
  assert.throws(() => storage.saveArchiveState([], [], undefined, []), /原有档案保持不变/);
  assert.deepEqual([...values.entries()], before);
});

test("archive import rejects incomplete report arrays", () => {
  const record = makeRelationship();
  record.report.defense_strategies = "not-an-array";
  const archive = { version: 1, exportedAt: "2026-09-28T00:00:00.000Z", profile: null, relationships: [record] };

  assert.throws(() => storage.parseArchiveImport(archive), /损坏的关系记录/);
});

test("hour added later keeps one person and migrates event references", () => {
  const unknown = makeRelationship({ personKey: "周总|直属领导|1988-2-11-unknown" });
  const known = makeRelationship({
    id: "record-2",
    personKey: "周总|直属领导|1988-2-11-8",
    targetDate: { year: 1988, month: 2, day: 11, hour: 8 },
    createdAt: "2026-09-29T00:00:00.000Z",
  });
  const events = [
    { id: "event-1", personKey: unknown.personKey, occurredAt: "2026-09-28T00:00:00.000Z", content: "首次沟通" },
    { id: "event-2", personKey: known.personKey, occurredAt: "2026-09-29T00:00:00.000Z", content: "确认时辰" },
  ];
  const normalized = storage.reconcilePersonIdentity([unknown, known], events);
  assert.equal(storage.groupRelationships(normalized.relationships).length, 1);
  assert.equal(normalized.relationships[0].personKey, normalized.relationships[1].personKey);
  assert.ok(normalized.events.every((event) => event.personKey === normalized.relationships[0].personKey));
  assert.equal(storage.existingPersonKey(normalized.relationships, known), normalized.relationships[0].personKey);
  assert.equal(normalized.relationships[0].report.one_sentence_verdict, unknown.report.one_sentence_verdict);
});

test("legacy records derive their chart snapshot and flag changed birth inputs", () => {
  const record = makeRelationship();
  const current = { name: "我", year: 1993, month: 6, day: 18, hour: 12 };

  assert.equal(profileSnapshots.getAnalysisProfileSnapshot(record).year, 1992);
  assert.equal(profileSnapshots.hasOutdatedProfileBasis(record, current), true);
  assert.equal(profileSnapshots.hasOutdatedProfileBasis(record, { ...current, year: 1992 }), false);
});

test("history loading skips corrupt entries but retains valid archive records", () => {
  const values = installLocalStorage({
    [storage.HISTORY_STORAGE_KEY]: JSON.stringify([makeRelationship(), { id: "broken", report: {} }]),
  });

  const loaded = storage.loadRelationships();
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].id, "record-1");
  assert.equal(JSON.parse(values.get(storage.HISTORY_STORAGE_KEY)).length, 2);
});

test("API endpoint uses the configured host and blocks localhost in production", () => {
  const previousBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  const previousMode = process.env.NODE_ENV;
  try {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.test/";
    process.env.NODE_ENV = "production";
    assert.equal(api.apiEndpoint("/api/v1/twelve-ci"), "https://api.example.test/api/v1/twelve-ci");
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    assert.throws(() => api.apiEndpoint("/healthz"), /NEXT_PUBLIC_API_BASE_URL/);
    process.env.NODE_ENV = "development";
    assert.equal(api.apiEndpoint("/healthz"), "http://127.0.0.1:8000/healthz");
  } finally {
    if (previousBase === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = previousBase;
    if (previousMode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousMode;
  }
});
