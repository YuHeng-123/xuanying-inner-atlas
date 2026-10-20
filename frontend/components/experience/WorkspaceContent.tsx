"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Archive,
  BookOpenCheck,
  CalendarDays,
  CircleAlert,
  Compass,
  Info,
  LockKeyhole,
  Pencil,
  Plus,
  Radar,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";

import type { NewRelationshipValues } from "@/components/RelationshipEntryModal";
import { combineDivinationHistory, createPersonKey, existingPersonKey, groupRelationships, loadDivinationHistory, loadProfile, loadRelationshipEvents, loadRelationships, reconcilePersonIdentity, saveProfile, saveArchiveState } from "@/lib/storage";
import { hasOutdatedProfileBasis } from "@/lib/profileSnapshot";
import { apiEndpoint } from "@/lib/api";
import type {
  AnalysisResponse,
  ArchiveExportData,
  ArchiveImportMode,
  BirthDate,
  MyProfile,
  RiskLevel,
  RelationshipEvent,
  StoredRelationship,
} from "@/lib/types";
import type { SceneData, WorkspaceTab, RitualEvent } from "./experienceTypes";

interface WorkspaceContentProps {
  embedded?: boolean;
  requestedTab?: WorkspaceTab;
  requestSerial?: number;
  requestedPersonId?: string | null;
  onSceneData?: (data: SceneData) => void;
  onTabChange?: (tab: WorkspaceTab) => void;
  onRitual?: (event: RitualEvent) => void;
  animateRitual?: boolean;
}

function ChunkLoading() {
  return <div className="surface-panel my-6 flex min-h-48 animate-pulse items-center justify-center rounded-3xl text-sm text-slate-500" role="status">正在加载功能模块…</div>;
}

const ProfileSetupModal = dynamic(() => import("@/components/ProfileSetupModal"), { loading: ChunkLoading });
const RadarChart = dynamic(() => import("@/components/RadarChart"), { ssr: false, loading: ChunkLoading });
const ConversationRehearsal = dynamic(() => import("@/components/ConversationRehearsal"), { loading: ChunkLoading });
const RelationshipArchiveManager = dynamic(() => import("@/components/RelationshipArchiveManager"), { loading: ChunkLoading });
const RelationshipEntryModal = dynamic(() => import("@/components/RelationshipEntryModal"), { loading: ChunkLoading });
const RelationshipOrbit = dynamic(() => import("@/components/RelationshipOrbit"), { ssr: false, loading: ChunkLoading });
const RelationshipQuickPanel = dynamic(() => import("@/components/RelationshipQuickPanel"), { loading: ChunkLoading });
const RelationshipTimeline = dynamic(() => import("@/components/RelationshipTimeline"), { loading: ChunkLoading });
const ReportSummary = dynamic(() => import("@/components/ReportSummary"), { loading: ChunkLoading });
const ReportView = dynamic(() => import("@/components/ReportView"), { loading: ChunkLoading });
const ScoreExplanation = dynamic(() => import("@/components/ScoreExplanation"), { loading: ChunkLoading });
const ShareCardModal = dynamic(() => import("@/components/ShareCardModal"), { loading: ChunkLoading });
const TimeScenarioComparison = dynamic(() => import("@/components/TimeScenarioComparison"), { loading: ChunkLoading });
const TwelveCiExplorer = dynamic(() => import("@/components/TwelveCiExplorer"), { loading: ChunkLoading });
const BaziReadingStudio = dynamic(() => import("@/components/BaziReadingStudio"), { loading: ChunkLoading });
const ZiweiReadingStudio = dynamic(() => import("@/components/ZiweiReadingStudio"), { loading: ChunkLoading });
const DecisionDivinationStudio = dynamic(() => import("@/components/DecisionDivinationStudio"), { loading: ChunkLoading });

function toBirth(date: string, hour: string): BirthDate {
  const [year, month, day] = date.split("-").map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (![year, month, day].every(Number.isInteger)
    || calendarDate.getUTCFullYear() !== year
    || calendarDate.getUTCMonth() !== month - 1
    || calendarDate.getUTCDate() !== day) {
    throw new Error("请填写有效的公历出生年月日。");
  }
  return { year, month, day, ...(hour === "" ? {} : { hour: Number(hour) }) };
}

function profileBirth(profile: MyProfile): BirthDate {
  return { year: profile.year, month: profile.month, day: profile.day, ...(profile.hour === undefined || profile.hour === null ? {} : { hour: profile.hour }) };
}

function formatBirth(date: BirthDate): string {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

function makeId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isAnalysis(value: unknown): value is AnalysisResponse {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<AnalysisResponse>;
  return Boolean(item.interaction && item.report && item.user_bazi && item.target_bazi)
    && (item.report_source === "LLM" || item.report_source === "MOCK");
}

const riskLabel: Record<RiskLevel, string> = { RED: "需设边界", YELLOW: "保持观察", GREEN: "稳态协作" };
const riskClass: Record<RiskLevel, string> = {
  RED: "border-rose-200 bg-rose-50 text-rose-700",
  YELLOW: "border-amber-200 bg-amber-50 text-amber-800",
  GREEN: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

function EmptyProfileCard({ onSetup }: { onSetup: () => void }) {
  return (
    <section className="surface-panel mx-auto max-w-2xl rounded-3xl p-7 text-center sm:p-10">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700"><Radar className="h-5 w-5" /></span>
      <p className="section-kicker mt-5">PERSONAL BASELINE / 首次设置</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">先建立你的基准坐标</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">填写一次姓名和公历生日，后续合盘会自动带入。时辰不确定也可以留空。</p>
      <button onClick={onSetup} className="primary-button mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold"><Sparkles className="h-4 w-4" />设置我的信息</button>
      <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-500"><LockKeyhole className="h-3.5 w-3.5" />信息保存在当前浏览器</p>
    </section>
  );
}

function ArchiveLanding({
  groups,
  onOpenManager,
  onSelect,
  onAdd,
}: {
  groups: ReturnType<typeof groupRelationships>;
  onOpenManager: () => void;
  onSelect: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <section className="mx-auto w-full max-w-6xl" aria-labelledby="archive-landing-title">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div><p className="section-kicker">LOCAL RELATIONSHIP CRM / 本地档案</p><h1 id="archive-landing-title" className="mt-1.5 text-2xl font-semibold text-slate-900">关系档案库</h1><p className="mt-1 text-sm text-slate-600">每个人保留最近结论和完整历史记录。</p></div>
        <button onClick={onOpenManager} className="secondary-button rounded-xl text-xs font-semibold"><Archive className="h-4 w-4" />导入、导出与管理</button>
      </div>
      {groups.length === 0 ? (
        <div className="surface-panel rounded-3xl px-6 py-14 text-center">
          <UsersRound className="mx-auto h-8 w-8 text-slate-400" />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">档案库还是空的</h2>
          <p className="mt-2 text-sm text-slate-600">完成第一次关系分析后，记录会自动保存在这里。</p>
          <button onClick={onAdd} className="primary-button mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"><Plus className="h-4 w-4" />测算新关系</button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => {
            const record = group.latest;
            return (
              <button key={group.personKey} onClick={() => onSelect(record.id)} className="surface-panel rounded-2xl p-4 text-left transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-lg">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate text-base font-semibold text-slate-900">{record.targetName}</h2><p className="mt-1 text-xs text-slate-500">{record.relationshipType} · {group.history.length} 次记录</p></div><span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${riskClass[record.risk_level]}`}>{riskLabel[record.risk_level]}</span></div>
                <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-700">{record.report.one_sentence_verdict}</p>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] text-slate-500"><span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{new Date(record.updatedAt || record.createdAt).toLocaleDateString("zh-CN")}</span><span>打开报告 →</span></div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function WorkspaceContent({ embedded = false, requestedTab = "bazi", requestSerial = 0, requestedPersonId = null, onSceneData, onTabChange, onRitual, animateRitual = false }: WorkspaceContentProps) {
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [centerDayStem, setCenterDayStem] = useState<string | null>(null);
  const [relationships, setRelationships] = useState<StoredRelationship[]>([]);
  const [relationshipEvents, setRelationshipEvents] = useState<RelationshipEvent[]>([]);
  const [mounted, setMounted] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(requestedTab);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [entryInitial, setEntryInitial] = useState<Partial<NewRelationshipValues> | null>(null);
  const [entryLoading, setEntryLoading] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deepOpen, setDeepOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<StoredRelationship | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ personKey: string; name: string; count: number } | null>(null);

  const loadLocalArchive = useCallback(() => {
    try {
      const loadedProfile = loadProfile();
      const archive = reconcilePersonIdentity(loadRelationships(), loadRelationshipEvents());
      setProfile(loadedProfile);
      setRelationships(archive.relationships);
      setRelationshipEvents(archive.events);
      setSelectedId(groupRelationships(archive.relationships)[0]?.latest.id ?? null);
      setStorageReady(true);
      setStorageError(null);
    } catch (error) {
      setStorageReady(false);
      setStorageError(error instanceof Error ? error.message : "无法读取本机档案，请检查浏览器存储设置。");
    } finally { setMounted(true); }
  }, []);

  useEffect(() => { loadLocalArchive(); }, [loadLocalArchive]);

  const commitStorage = useCallback((write: () => void, update: () => void): boolean => {
    if (!storageReady) {
      setStorageError("本机档案尚未成功读取，暂不能保存修改。请先重试读取，避免覆盖已有档案。");
      return false;
    }
    try {
      write();
      update();
      setStorageError(null);
      return true;
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : "保存失败，请先导出备份并检查浏览器存储设置。");
      return false;
    }
  }, [storageReady]);
  const persistProfile = useCallback((next: MyProfile) => commitStorage(() => saveProfile(next), () => setProfile(next)), [commitStorage]);
  const persistArchive = useCallback((next: StoredRelationship[], events: RelationshipEvent[], restoredProfile?: MyProfile) => commitStorage(
    () => saveArchiveState(next, events, restoredProfile),
    () => { setRelationships(next); setRelationshipEvents(events); if (restoredProfile) setProfile(restoredProfile); },
  ), [commitStorage]);
  const persistRelationships = useCallback((next: StoredRelationship[]) => persistArchive(next, relationshipEvents), [persistArchive, relationshipEvents]);
  const persistEvents = useCallback((next: RelationshipEvent[]) => persistArchive(relationships, next), [persistArchive, relationships]);
  const groups = useMemo(() => groupRelationships(relationships), [relationships]);
  useEffect(() => { setActiveTab(requestedTab); if (requestedPersonId) { setSelectedId(requestedPersonId); setDeepOpen(false); } }, [requestedTab, requestSerial, requestedPersonId]);
  useEffect(() => { onTabChange?.(activeTab); }, [activeTab, onTabChange]);
  useEffect(() => {
    onSceneData?.({ profileName: profile?.name ?? null, dayStem: centerDayStem, people: groups.map(({ latest }) => ({ id: latest.id, name: latest.targetName, risk: latest.risk_level })) });
  }, [profile, centerDayStem, groups, onSceneData]);
  const selected = useMemo(() => relationships.find((item) => item.id === selectedId) ?? groups[0]?.latest ?? null, [groups, relationships, selectedId]);
  const selectedGroup = useMemo(() => selected ? groups.find((group) => group.personKey === (selected.personKey || createPersonKey(selected))) ?? null : null, [groups, selected]);
  const selectedProfileBasisOutdated = useMemo(() => selected ? hasOutdatedProfileBasis(selected, profile) : false, [profile, selected]);

  useEffect(() => {
    setCenterDayStem(null);
    if (!profile || !mounted) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(apiEndpoint("/api/v1/reading/bazi"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_birth: profileBirth(profile) }),
          signal: controller.signal,
        });
        if (!response.ok) return;
        const result: unknown = await response.json();
        if (result && typeof result === "object" && "user_bazi" in result) {
          const bazi = result.user_bazi;
          if (bazi && typeof bazi === "object" && "day_stem" in bazi && typeof bazi.day_stem === "string") {
            setCenterDayStem(bazi.day_stem);
          }
        }
      } catch {
        // 网络或排盘失败时保持“待测”，不回填旧档案里的日元。
      }
    })();
    return () => controller.abort();
  }, [mounted, profile]);

  const addRelationshipEvent = useCallback((event: RelationshipEvent) => {
    return persistEvents([...relationshipEvents, event].sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt)));
  }, [persistEvents, relationshipEvents]);

  const openNewRelationship = useCallback(() => {
    if (!profile) { setProfileModalOpen(true); return; }
    setEntryError(null);
    setEntryInitial(null);
    setEntryModalOpen(true);
  }, [profile]);

  const selectRelationship = useCallback((id: string) => {
    setSelectedId(id);
    setDeepOpen(false);
    setActiveTab("relationships");
  }, []);

  const reanalyze = useCallback(() => {
    if (!selected) return;
    setEntryError(null);
    setEntryInitial({
      targetName: selected.targetName,
      targetDate: formatBirth(selected.targetDate),
      targetHour: selected.targetDate.hour === undefined || selected.targetDate.hour === null ? "" : String(selected.targetDate.hour),
      relationshipType: selected.relationshipType,
      concern: "",
    });
    setEntryModalOpen(true);
  }, [selected]);

  const analyze = async (values: NewRelationshipValues) => {
    if (!profile) { setEntryModalOpen(false); setProfileModalOpen(true); return; }
    setEntryLoading(true);
    setEntryError(null);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 45_000);
    try {
      const targetDate = toBirth(values.targetDate, values.targetHour);
      const response = await fetch(apiEndpoint("/api/v1/analyze-relationship"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          user_birth: profileBirth(profile),
          target_birth: targetDate,
          relationship_type: values.relationshipType,
          concern: values.concern.trim(),
        }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const detail = body && typeof body === "object" && "detail" in body && typeof body.detail === "string" ? body.detail : null;
        throw new Error(detail ?? "后端研判暂时不可用，请确认服务已启动。");
      }
      if (!isAnalysis(body)) throw new Error("服务返回的数据结构不完整，请稍后重试。");

      const now = new Date().toISOString();
      const record: StoredRelationship = {
        id: makeId(),
        targetName: values.targetName.trim(),
        relationshipType: values.relationshipType,
        targetDate,
        risk_level: body.interaction.risk_level,
        metrics: body.interaction.dimensions,
        report: body.report,
        createdAt: now,
        updatedAt: now,
        profileSnapshot: { ...profile },
        analysis: body,
      };
      record.personKey = existingPersonKey(relationships, record) ?? `person:${record.id}`;
      if (!persistRelationships([...relationships, record])) {
        setEntryError("报告已生成，但未能保存到本机。表单已保留，请先检查存储提示后重试。");
        return;
      }
      setSelectedId(record.id);
      setDeepOpen(false);
      setActiveTab("relationships");
      setEntryModalOpen(false);
      window.setTimeout(() => document.getElementById("analysis-results")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    } catch (error) {
      setEntryError(error instanceof DOMException && error.name === "AbortError"
        ? "请求超时。未知时辰需要比较多种假设，请稍后重试或检查后端服务。"
        : error instanceof Error ? error.message : "连接研判服务失败，请稍后再试。");
    } finally {
      window.clearTimeout(timeout);
      setEntryLoading(false);
    }
  };

  const deletePerson = useCallback((personKey: string) => {
    const next = relationships.filter((item) => (item.personKey || createPersonKey(item)) !== personKey);
    if (!persistArchive(next, relationshipEvents.filter((event) => event.personKey !== personKey))) return false;
    setSelectedId(groupRelationships(next)[0]?.latest.id ?? null);
    setDeepOpen(false);
    setDeleteTarget(null);
    return true;
  }, [persistArchive, relationshipEvents, relationships]);

  const deleteRecord = useCallback((id: string) => {
    const next = relationships.filter((item) => item.id !== id);
    const remainingPeople = new Set(next.map((item) => item.personKey || createPersonKey(item)));
    if (!persistArchive(next, relationshipEvents.filter((event) => remainingPeople.has(event.personKey)))) return false;
    setSelectedId(groupRelationships(next)[0]?.latest.id ?? null);
    setDeepOpen(false);
    return true;
  }, [persistArchive, relationshipEvents, relationships]);

  const clearRelationships = useCallback(() => {
    if (!persistArchive([], [])) return false;
    setSelectedId(null);
    setDeepOpen(false);
    return true;
  }, [persistArchive]);

  const importArchive = useCallback((data: ArchiveExportData, mode: ArchiveImportMode, restoreProfile: boolean) => {
    const merged = mode === "replace"
      ? data.relationships
      : [...relationships, ...data.relationships.filter((incoming) => !relationships.some((current) => current.id === incoming.id))];
    const incomingEvents = data.events ?? [];
    const mergedEvents = mode === "replace"
      ? incomingEvents
      : [...relationshipEvents, ...incomingEvents.filter((incoming) => !relationshipEvents.some((current) => current.id === incoming.id))];
    const currentDivination = loadDivinationHistory();
    const mergedDivination = combineDivinationHistory(currentDivination, data.divinationHistory, mode);
    const normalized = reconcilePersonIdentity(merged, mergedEvents);
    if (!commitStorage(
      () => saveArchiveState(normalized.relationships, normalized.events, restoreProfile && data.profile ? data.profile : undefined, mergedDivination),
      () => {
        setRelationships(normalized.relationships);
        setRelationshipEvents(normalized.events);
        if (restoreProfile && data.profile) setProfile(data.profile);
      },
    )) return false;
    setSelectedId(groupRelationships(normalized.relationships)[0]?.latest.id ?? null);
    setDeepOpen(false);
    setArchiveOpen(false);
    return true;
  }, [commitStorage, relationshipEvents, relationships]);

  const openDeep = () => {
    setDeepOpen(true);
    window.setTimeout(() => document.getElementById("summary")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  const tabs: Array<{ id: WorkspaceTab; label: string; icon: typeof Radar }> = [
    { id: "bazi", label: "八字解读", icon: Radar },
    { id: "ziwei", label: "紫微斗数", icon: Sparkles },
    { id: "star-ci", label: "十二星次", icon: BookOpenCheck },
    { id: "relationships", label: "人际关系", icon: UsersRound },
    { id: "decision", label: "灵感决策", icon: Compass },
    { id: "archive", label: "档案管理", icon: Archive },
  ];

  return (
    <div data-workspace="true" data-embedded={embedded} className="relative min-h-screen pb-10">
      <div className="data-grid pointer-events-none absolute inset-x-0 top-0 h-[520px] opacity-70" />
      <div className="relative mx-auto max-w-[1440px] px-4 pb-10 pt-3 sm:px-6 lg:px-8">
        <header className="app-header sticky top-0 z-30 -mx-4 border-b px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700"><Radar className="h-4 w-4" /></span>
              <div className="min-w-0"><p className="truncate text-sm font-semibold tracking-wide text-slate-900">{embedded ? "玄境 · 命理与关系" : "命理三式解读"}</p><p className="hidden text-[10px] text-slate-500 sm:block">八字 · 紫微斗数 · 十二星次</p></div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {mounted && profile && <span className="hidden text-xs text-slate-500 sm:inline">我 · <b className="font-semibold text-slate-800">{profile.name}</b></span>}
              {mounted && profile && <button onClick={() => setProfileModalOpen(true)} className="secondary-button rounded-xl px-2.5 py-2 text-xs sm:px-3"><Pencil className="h-3.5 w-3.5" /><span className="hidden sm:inline">我的信息</span></button>}
              {mounted && profile && activeTab === "relationships" && <button onClick={openNewRelationship} className="gold-button rounded-xl px-3 py-2 text-xs font-semibold sm:px-4"><Plus className="h-3.5 w-3.5" /><span className="hidden sm:inline">测算新关系</span><span className="sm:hidden">新增</span></button>}
            </div>
          </div>
          {mounted && <div className="relative mt-3">
            <nav className="no-scrollbar flex min-w-0 gap-1 overflow-x-auto scroll-smooth border-t border-slate-200/80 pb-1 pt-2 pr-7" aria-label="主要功能，可左右滑动">
              {tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setActiveTab(id)} className="nav-tab" aria-current={activeTab === id ? "page" : undefined}><Icon className="h-4 w-4" />{label}{id === "archive" && groups.length > 0 && <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-600">{groups.length}</span>}</button>)}
            </nav>
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-2 right-0 flex items-center bg-gradient-to-l from-slate-50 via-slate-50/95 to-transparent pl-4 pr-1 text-base text-slate-500 md:hidden">›</span>
          </div>}
        </header>

        {!mounted ? (
          <div className="surface-panel mt-8 h-64 animate-pulse rounded-3xl" aria-label="正在读取本地档案" />
        ) : !storageReady ? (
          <div className="surface-panel mt-8 rounded-3xl p-6"><h1 className="text-lg font-semibold">暂时无法读取本机档案</h1><p className="mt-2 text-sm text-slate-600">请检查浏览器的网站存储权限，再重试读取。尚未覆盖任何已有档案。</p><button className="primary-button mt-4 rounded-xl px-4 py-2" onClick={loadLocalArchive}>重试读取档案</button></div>
        ) : (
          <>
            {!profile && activeTab !== "archive" && activeTab !== "decision" && <div className="py-12 sm:py-16"><EmptyProfileCard onSetup={() => setProfileModalOpen(true)} /></div>}

            {activeTab === "bazi" && profile && <div className="py-7"><BaziReadingStudio profile={profile} relationships={relationships} /></div>}

            {activeTab === "ziwei" && profile && <div className="py-7"><ZiweiReadingStudio profile={profile} relationships={relationships} /></div>}

            {activeTab === "relationships" && profile && <>
              <section className="flex flex-col gap-3 pb-5 pt-7 sm:flex-row sm:items-end sm:justify-between">
                <div><p className="section-kicker">PERSONAL RELATIONSHIP WORKSPACE</p><h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">看清关系，也守住边界</h1><p className="mt-1.5 text-sm text-slate-600">基于出生信息的传统结构参考，重点落在可以执行的相处策略。</p></div>
                <div className="flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-xs text-slate-600"><UsersRound className="h-4 w-4 text-blue-600" />{groups.length} 位关系人 · {relationships.length} 次记录</div>
              </section>

              <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl border border-sky-100 bg-sky-50/80 px-4 py-3 text-[11px] leading-5 text-sky-950">
                <Info className="h-4 w-4 shrink-0 text-sky-700" />
                <span className="font-semibold">公开排盘口径</span>
                <span>公历输入 · 立春换年 · 节气换月 · 23:00 换日 · 中国标准时间 UTC+8</span>
                <span className="text-sky-800/70">默认不校正真太阳时；这是传统计算约定，不是科学预测。</span>
              </div>

              <div id="orbit" className="grid scroll-mt-28 items-stretch gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(330px,.72fr)]">
                <RelationshipOrbit profile={profile} centerDayStem={centerDayStem} relationships={relationships} events={relationshipEvents} selectedId={selected?.id ?? null} onAdd={openNewRelationship} onSelect={(id) => { setSelectedId(id); setDeepOpen(false); }} />
                {selected && selectedGroup ? (
                  <RelationshipQuickPanel group={selectedGroup} selected={selected} profileBasisOutdated={selectedProfileBasisOutdated} onViewDeep={openDeep} onReanalyze={reanalyze} onShare={() => setShareTarget(selected)} onDelete={() => setDeleteTarget({ personKey: selectedGroup.personKey, name: selected.targetName, count: selectedGroup.history.length })} />
                ) : (
                  <aside className="decision-panel flex min-h-[360px] flex-col items-center justify-center rounded-3xl p-7 text-center xl:min-h-[520px]">
                    <Sparkles className="h-5 w-5 text-blue-600" /><h2 className="mt-4 text-lg font-semibold text-slate-900">关系图谱已就绪</h2>
                    <p className="mt-2 max-w-xs text-sm leading-6 text-slate-600">添加第一个关系人后，这里会显示五维指标和当前可采取的行动。</p>
                    <button onClick={openNewRelationship} className="primary-button mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"><Plus className="h-4 w-4" />测算新关系</button>
                  </aside>
                )}
              </div>

              {selected && <div className="mt-5 grid items-start gap-4 xl:grid-cols-2">
                <RelationshipTimeline key={selected.personKey || createPersonKey(selected)} relationship={selected} events={relationshipEvents} onAdd={addRelationshipEvent} />
                <ConversationRehearsal relationshipType={selected.relationshipType} />
              </div>}

              {entryError && !entryModalOpen && <div className="mt-4 flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="font-semibold">研判没有完成</p><p className="mt-1">{entryError}</p></div></div>}

              {selected && <div id="analysis-results" className="mt-5 scroll-mt-28 space-y-4">
                {selected.analysis.time_scenarios && <TimeScenarioComparison comparison={selected.analysis.time_scenarios} />}
                {!deepOpen && <ReportSummary analysis={selected.analysis} profileBasisOutdated={selectedProfileBasisOutdated} onExpand={openDeep} />}
                {deepOpen && <section id="summary" className="scroll-mt-28">
                  <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="section-kicker">FULL READOUT / 完整判断</p><h2 className="mt-1 text-xl font-semibold text-slate-900">{selected.targetName} · 深度报告</h2></div><button onClick={() => setDeepOpen(false)} className="quiet-button">收起报告</button></div>
                  <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(280px,.62fr)_minmax(0,1.38fr)]"><div className="min-w-0 space-y-4"><div className="surface-panel min-w-0 rounded-3xl p-4 sm:p-5"><RadarChart interaction={selected.analysis.interaction} /></div><ScoreExplanation interaction={selected.analysis.interaction} /></div><ReportView analysis={selected.analysis} userName={profile.name} targetName={selected.targetName} profileBasisOutdated={selectedProfileBasisOutdated} onShare={() => setShareTarget(selected)} onCollapse={() => setDeepOpen(false)} /></div>
                </section>}
              </div>}
            </>}

            {activeTab === "star-ci" && <div className="py-7"><TwelveCiExplorer profile={profile} /></div>}

            {activeTab === "decision" && <div className="py-7"><DecisionDivinationStudio onRitual={onRitual} animateRitual={animateRitual} /></div>}

            {activeTab === "archive" && <div className="py-7"><ArchiveLanding groups={groups} onOpenManager={() => setArchiveOpen(true)} onSelect={selectRelationship} onAdd={openNewRelationship} /></div>}
          </>
        )}

        <footer className="mt-10 flex flex-col gap-2 border-t border-slate-200 pt-4 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>出生日期按公历录入；本地关系档案可在档案页导入或导出。</p>
          <p className="flex items-center gap-1.5"><LockKeyhole className="h-3.5 w-3.5" />分享海报不展示出生日期</p>
        </footer>
      </div>

      {storageError && <div role="alert" className="fixed inset-x-4 bottom-4 z-[80] mx-auto flex max-w-2xl items-start gap-3 rounded-2xl border border-rose-200 bg-white p-4 text-sm text-rose-800 shadow-xl"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /><p className="flex-1">{storageError}</p><button aria-label="关闭存储提示" className="shrink-0 p-1" onClick={() => setStorageError(null)}><X className="h-4 w-4" /></button></div>}
      {mounted && storageReady && profileModalOpen && <ProfileSetupModal open initialProfile={profile} required={!profile} onClose={() => setProfileModalOpen(false)} onSave={persistProfile} />}
      {entryModalOpen && <RelationshipEntryModal open isLoading={entryLoading} error={entryError} initialValues={entryInitial} onClose={() => { if (!entryLoading) setEntryModalOpen(false); }} onSubmit={analyze} />}
      {shareTarget && <ShareCardModal analysis={shareTarget.analysis} open userName={profile?.name ?? "我"} targetName={shareTarget.targetName} onClose={() => setShareTarget(null)} />}
      {archiveOpen && <RelationshipArchiveManager open profile={profile} relationships={relationships} events={relationshipEvents} onClose={() => setArchiveOpen(false)} onSelect={(record) => { setSelectedId(record.id); setDeepOpen(false); setActiveTab("relationships"); }} onDeletePerson={deletePerson} onDeleteRecord={deleteRecord} onClear={clearRelationships} onImport={importArchive} />}
      {deleteTarget && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 p-4"><div className="surface-panel w-full max-w-sm rounded-2xl p-5"><div className="flex items-center justify-between"><h2 className="text-base font-semibold text-slate-900">确认删除档案？</h2><button onClick={() => setDeleteTarget(null)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100" aria-label="关闭确认框"><X className="h-4 w-4" /></button></div><p className="mt-3 text-sm leading-6 text-slate-600">将删除“{deleteTarget.name}”的全部 {deleteTarget.count} 次研判记录，无法恢复。</p><div className="mt-6 flex justify-end gap-2"><button onClick={() => setDeleteTarget(null)} className="quiet-button">取消</button><button onClick={() => deletePerson(deleteTarget.personKey)} className="rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white">确认删除</button></div></div></div>}
    </div>
  );
}
