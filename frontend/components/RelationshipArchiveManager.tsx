"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Archive, ChevronDown, Download, FileUp, Search, SlidersHorizontal, Trash2, Upload, X } from "lucide-react";

import { exportArchive, groupRelationships, loadDivinationHistory, parseArchiveImport } from "@/lib/storage";
import { hasOutdatedProfileBasis } from "@/lib/profileSnapshot";
import type { ArchiveExportData, ArchiveImportMode, MyProfile, RelationshipEvent, RelationshipGroup, RiskLevel, StoredRelationship } from "@/lib/types";

interface RelationshipArchiveManagerProps {
  open: boolean;
  profile: MyProfile | null;
  relationships: StoredRelationship[];
  events: RelationshipEvent[];
  onClose: () => void;
  onSelect: (relationship: StoredRelationship) => void;
  onDeletePerson: (personKey: string) => boolean;
  onDeleteRecord: (id: string) => boolean;
  onClear: () => boolean;
  onImport: (data: ArchiveExportData, mode: ArchiveImportMode, restoreProfile: boolean) => boolean;
}

type SortMode = "updated" | "risk" | "name";
type Confirmation = { kind: "person"; group: RelationshipGroup } | { kind: "record"; relationship: StoredRelationship } | { kind: "clear" } | null;

const riskOrder: Record<RiskLevel, number> = { RED: 0, YELLOW: 1, GREEN: 2 };
const riskCopy: Record<RiskLevel, string> = { RED: "利益设防", YELLOW: "公事公办", GREEN: "深度同盟" };
const riskClass: Record<RiskLevel, string> = {
  RED: "border-rose-400/25 bg-rose-400/10 text-rose-300",
  YELLOW: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  GREEN: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "未知时间" : new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "short", day: "numeric" }).format(date);
}

export default function RelationshipArchiveManager({ open, profile, relationships, events, onClose, onSelect, onDeletePerson, onDeleteRecord, onClear, onImport }: RelationshipArchiveManagerProps) {
  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<"ALL" | RiskLevel>("ALL");
  const [sortMode, setSortMode] = useState<SortMode>("updated");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [divinationCount, setDivinationCount] = useState(0);
  const [pendingImport, setPendingImport] = useState<ArchiveExportData | null>(null);
  const [importMode, setImportMode] = useState<ArchiveImportMode>("merge");
  const [restoreProfile, setRestoreProfile] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    try { setDivinationCount(loadDivinationHistory().length); }
    catch (error) { setDownloadError(error instanceof Error ? error.message : "无法读取占卜记录。"); }
  }, [open]);

  const groups = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase();
    return groupRelationships(relationships)
      .filter((group) => riskFilter === "ALL" || group.latest.risk_level === riskFilter)
      .filter((group) => !keyword || `${group.latest.targetName} ${group.latest.relationshipType}`.toLocaleLowerCase().includes(keyword))
      .sort((a, b) => {
        if (sortMode === "risk") return riskOrder[a.latest.risk_level] - riskOrder[b.latest.risk_level];
        if (sortMode === "name") return a.latest.targetName.localeCompare(b.latest.targetName, "zh-CN");
        return new Date(b.latest.updatedAt ?? b.latest.createdAt).getTime() - new Date(a.latest.updatedAt ?? a.latest.createdAt).getTime();
      });
  }, [query, relationships, riskFilter, sortMode]);

  if (!open) return null;

  const downloadArchive = async () => {
    setDownloadMessage(null);
    setDownloadError(null);
    try {
      const readings = loadDivinationHistory();
      setDivinationCount(readings.length);
      const data = exportArchive(profile, relationships, events, readings);
      const filename = `xuanjing-archive-${new Date().toISOString().slice(0, 10)}.json`;
      const contents = JSON.stringify(data, null, 2);
      const pickerWindow = window as Window & {
        showSaveFilePicker?: (options: { suggestedName: string; types: Array<{ description: string; accept: Record<string, string[]> }> }) => Promise<{
          createWritable: () => Promise<{ write: (value: string) => Promise<void>; close: () => Promise<void> }>;
        }>;
      };
      if (pickerWindow.showSaveFilePicker) {
        const file = await pickerWindow.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: "玄境档案 JSON", accept: { "application/json": [".json"] } }],
        });
        const writable = await file.createWritable();
        await writable.write(contents);
        await writable.close();
        setDownloadMessage("备份文件已保存，包含个人资料、人际档案、互动记录和占卜记录。");
        return;
      }
      const blob = new Blob([contents], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      // Keep the object URL alive while the browser starts receiving the download.
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setDownloadMessage("已请求下载 v2 JSON 备份；请在浏览器下载栏或下载文件夹中查看。");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setDownloadError(error instanceof Error ? error.message : "备份下载失败，请检查浏览器下载权限后重试。");
    }
  };

  const readImport = async (file: File | undefined) => {
    if (!file) return;
    setImportError(null);
    setPendingImport(null);
    try {
      const data = parseArchiveImport(JSON.parse(await file.text()));
      setPendingImport(data);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "导入文件无法识别。");
    }
  };

  const confirm = () => {
    if (!confirmation) return;
    if (confirmation.kind === "person" && !onDeletePerson(confirmation.group.personKey)) return;
    if (confirmation.kind === "record" && !onDeleteRecord(confirmation.relationship.id)) return;
    if (confirmation.kind === "clear" && !onClear()) return;
    setConfirmation(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-3 backdrop-blur-xl sm:p-6" role="dialog" aria-modal="true" aria-labelledby="archive-title" onMouseDown={(event) => { if (event.target === event.currentTarget && !confirmation) onClose(); }}>
      <div className="decision-panel mx-auto my-4 w-full max-w-5xl rounded-[30px]">
        <header className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-5 sm:px-7">
          <div><div className="flex items-center gap-2"><Archive className="h-4 w-4 text-amber-400" /><p className="eyebrow">LOCAL ARCHIVE / 本地档案库</p></div><h2 id="archive-title" className="mt-2 text-xl font-semibold text-slate-100">关系记录管理</h2><p className="mt-2 text-xs leading-5 text-slate-500">数据仅保存在当前浏览器。按同一人归档，星盘只呈现每人的最新研判。</p></div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-800 hover:text-slate-100" aria-label="关闭档案管理"><X className="h-5 w-5" /></button>
        </header>

        <div className="grid gap-4 border-b border-slate-800 px-5 py-4 md:grid-cols-[1fr_auto_auto] sm:px-7">
          <label className="input-shell"><Search className="h-4 w-4 text-slate-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索姓名或关系角色" aria-label="搜索档案" /></label>
          <label className="input-shell min-w-[160px]"><SlidersHorizontal className="h-4 w-4 text-slate-500" /><select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value as "ALL" | RiskLevel)} aria-label="按风险等级筛选"><option value="ALL">全部风险等级</option><option value="RED">利益设防</option><option value="YELLOW">公事公办</option><option value="GREEN">深度同盟</option></select></label>
          <label className="input-shell min-w-[150px]"><ChevronDown className="h-4 w-4 text-slate-500" /><select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} aria-label="档案排序"><option value="updated">最近更新</option><option value="risk">风险等级</option><option value="name">姓名排序</option></select></label>
        </div>

        <div className="max-h-[52vh] overflow-y-auto px-5 py-5 sm:px-7">
          {groups.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/30 px-5 py-12 text-center text-sm text-slate-500">没有符合条件的关系档案。</div> : <div className="space-y-3">{groups.map((group) => {
            const latest = group.latest;
            const expanded = expandedKey === group.personKey;
            const latestUsesOldProfile = hasOutdatedProfileBasis(latest, profile);
            return <article key={group.personKey} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/35">
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <button className="min-w-0 text-left" onClick={() => { onSelect(latest); onClose(); }}><p className="truncate text-sm font-semibold text-slate-100">{latest.targetName} <span className="font-normal text-slate-500">· {latest.relationshipType}</span></p><p className="mt-1 text-xs text-slate-600">最近研判：{formatDate(latest.updatedAt ?? latest.createdAt)} · 历史 {group.history.length} 次</p></button>
                <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${riskClass[latest.risk_level]}`}>{riskCopy[latest.risk_level]}</span>{latestUsesOldProfile && <span className="rounded-full border border-amber-400/20 bg-amber-400/[0.06] px-2.5 py-1 text-[10px] text-amber-200">旧底牌</span>}<button onClick={() => setExpandedKey(expanded ? null : group.personKey)} className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-400 transition hover:border-slate-500 hover:text-slate-100">{expanded ? "收起记录" : "查看记录"}</button><button onClick={() => setConfirmation({ kind: "person", group })} className="rounded-lg border border-rose-400/20 px-2.5 py-1.5 text-xs text-rose-300 transition hover:bg-rose-400/10">删除此人</button></div>
              </div>
              {expanded && <div className="border-t border-slate-800 px-4 py-3"><div className="space-y-2">{group.history.map((item) => <div key={item.id} className="flex flex-col gap-2 rounded-xl bg-slate-900/70 p-3 sm:flex-row sm:items-center sm:justify-between"><button onClick={() => { onSelect(item); onClose(); }} className="text-left text-xs text-slate-400 transition hover:text-amber-300">{formatDate(item.updatedAt ?? item.createdAt)} · {riskCopy[item.risk_level]} · 打开本次报告{hasOutdatedProfileBasis(item, profile) ? <span className="ml-2 rounded-full border border-amber-400/20 px-2 py-0.5 text-[9px] text-amber-200">旧底牌</span> : null}</button><button onClick={() => setConfirmation({ kind: "record", relationship: item })} className="w-fit text-xs text-rose-400/80 transition hover:text-rose-300">删除本次</button></div>)}</div></div>}
            </article>;
          })}</div>}
        </div>

        <footer className="space-y-4 border-t border-slate-800 bg-slate-950/30 px-5 py-5 sm:px-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-slate-600">当前共 {relationships.length} 条研判记录、{groupRelationships(relationships).length} 位关系人、{events.length} 条互动笔记、{divinationCount} 条占卜记录。</p><div className="flex flex-wrap gap-2"><button onClick={() => { void downloadArchive(); }} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-amber-400/40 hover:text-amber-300"><Download className="h-3.5 w-3.5" />导出 JSON</button><button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-emerald-400/40 hover:text-emerald-300"><Upload className="h-3.5 w-3.5" />导入 JSON</button><button onClick={() => setConfirmation({ kind: "clear" })} className="inline-flex items-center gap-2 rounded-xl border border-rose-400/20 px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-400/10"><Trash2 className="h-3.5 w-3.5" />清空关系档案</button></div></div>
          {downloadMessage && <p role="status" className="text-xs text-emerald-200">{downloadMessage}</p>}{downloadError && <p role="alert" className="text-xs text-rose-200">下载失败：{downloadError}</p>}
          <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => { void readImport(event.target.files?.[0]); event.currentTarget.value = ""; }} />
          {(importError || pendingImport) && <div className={`rounded-2xl border p-4 ${importError ? "border-rose-400/20 bg-rose-400/[0.06]" : "border-emerald-400/20 bg-emerald-400/[0.05]"}`}>{importError ? <p className="text-xs leading-5 text-rose-200">导入失败：{importError}</p> : pendingImport && <div className="space-y-3"><p className="text-xs leading-5 text-emerald-100/80">已读取 v{pendingImport.version} 备份：{pendingImport.relationships.length} 条合盘记录、{pendingImport.events?.length ?? 0} 条互动记录、{pendingImport.divinationHistory?.length ?? 0} 条占卜记录。{pendingImport.version === 1 && "旧版备份没有占卜记录；导入时会保留本机现有占卜记录。"}选择导入方式后确认写入本地档案。</p><div className="flex flex-wrap items-center gap-3 text-xs text-slate-300"><label className="flex items-center gap-2"><input type="radio" checked={importMode === "merge"} onChange={() => setImportMode("merge")} />合并（保留现有）</label><label className="flex items-center gap-2"><input type="radio" checked={importMode === "replace"} onChange={() => setImportMode("replace")} />替换档案</label><label className="flex items-center gap-2"><input type="checkbox" checked={restoreProfile} onChange={(event) => setRestoreProfile(event.target.checked)} />同时恢复我的底牌</label><button onClick={() => { if (onImport(pendingImport, importMode, restoreProfile)) { setPendingImport(null); setDivinationCount(loadDivinationHistory().length); } }} className="ml-auto inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-3 py-2 text-xs font-bold text-slate-950"><FileUp className="h-3.5 w-3.5" />执行导入</button></div></div>}</div>}
        </footer>
      </div>

      {confirmation && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 p-4"><div className="w-full max-w-sm rounded-2xl border border-rose-200 bg-white p-5 shadow-2xl"><h3 className="text-base font-semibold text-slate-900">确认删除？</h3><p className="mt-3 text-sm leading-6 text-slate-600">{confirmation.kind === "person" ? `将删除“${confirmation.group.latest.targetName}”的全部 ${confirmation.group.history.length} 次研判记录及其互动笔记。` : confirmation.kind === "record" ? `将删除“${confirmation.relationship.targetName}”这一次研判记录；若这是此人的最后一条档案，也会删除其互动笔记。` : "将清空全部关系研判记录和互动笔记，但会保留你的底牌。"}此操作无法撤销。</p><div className="mt-6 flex justify-end gap-2"><button onClick={() => setConfirmation(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600">取消</button><button onClick={confirm} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white">确认删除</button></div></div></div>}
    </div>
  );
}
