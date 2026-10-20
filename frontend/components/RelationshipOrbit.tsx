"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactECharts from "echarts-for-react";
import type { ECharts, EChartsOption } from "echarts";
import { CirclePlus, FastForward, MousePointer2, Orbit, Pause, Play, Rewind } from "lucide-react";

import { createPersonKey } from "@/lib/storage";
import type { MyProfile, RelationshipEvent, RelationshipType, RiskLevel, StoredRelationship } from "@/lib/types";

interface RelationshipOrbitProps {
  profile: MyProfile | null;
  centerDayStem?: string | null;
  relationships: StoredRelationship[];
  events: RelationshipEvent[];
  selectedId: string | null;
  onAdd: () => void;
  onSelect: (id: string) => void;
}

const riskStyle: Record<RiskLevel, { color: string; glow: string; status: string; distance: number }> = {
  GREEN: { color: "#10b981", glow: "rgba(16,185,129,.3)", status: "深度同盟", distance: 128 },
  YELLOW: { color: "#f59e0b", glow: "rgba(245,158,11,.3)", status: "公事公办", distance: 184 },
  RED: { color: "#f43f5e", glow: "rgba(244,63,94,.33)", status: "利益设防", distance: 238 },
};

type GraphData = { id?: string; name?: string; status?: string; risk?: RiskLevel };
type TimelinePoint = { timestamp: number; label: string; kind: "研判" | "互动记录" };

function shortName(name: string) { return name.length > 6 ? `${name.slice(0, 5)}…` : name; }
function hashAngle(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) | 0;
  return ((Math.abs(hash) % 360) - 90) * Math.PI / 180;
}
function graphDataFromEvent(event: unknown): GraphData | null {
  if (!event || typeof event !== "object") return null;
  const data = (event as { data?: unknown }).data;
  return data && typeof data === "object" ? data as GraphData : null;
}

const riskFilters: Array<{ value: "ALL" | RiskLevel; label: string }> = [
  { value: "ALL", label: "全部等级" }, { value: "GREEN", label: "深度同盟" }, { value: "YELLOW", label: "公事公办" }, { value: "RED", label: "利益设防" },
];
const roleFilters: Array<{ value: "ALL" | RelationshipType; label: string }> = [
  { value: "ALL", label: "全部角色" }, { value: "直属领导", label: "直属领导" }, { value: "平级同事", label: "平级同事" }, { value: "合伙人", label: "合伙人" }, { value: "朋友", label: "朋友" }, { value: "相亲对象", label: "相亲对象" },
];

export default function RelationshipOrbit({ profile, centerDayStem, relationships, events, selectedId, onAdd, onSelect }: RelationshipOrbitProps) {
  const chartRef = useRef<ECharts | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const [riskFilter, setRiskFilter] = useState<"ALL" | RiskLevel>("ALL");
  const [roleFilter, setRoleFilter] = useState<"ALL" | RelationshipType>("ALL");
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const timeline = useMemo<TimelinePoint[]>(() => {
    const points = new Map<number, TimelinePoint>();
    relationships.forEach((item) => {
      const timestamp = Date.parse(item.updatedAt || item.createdAt);
      if (Number.isFinite(timestamp)) points.set(timestamp, { timestamp, label: item.updatedAt || item.createdAt, kind: "研判" });
    });
    events.forEach((item) => {
      const timestamp = Date.parse(item.occurredAt);
      if (Number.isFinite(timestamp) && !points.has(timestamp)) points.set(timestamp, { timestamp, label: item.occurredAt, kind: "互动记录" });
    });
    return Array.from(points.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [events, relationships]);

  useEffect(() => { setPlaybackIndex(Math.max(0, timeline.length - 1)); }, [timeline.length]);
  useEffect(() => {
    if (!playing || timeline.length < 2) return;
    const last = timeline.length - 1;
    const timer = window.setInterval(() => setPlaybackIndex((current) => Math.min(last, current + 1)), 1050);
    return () => window.clearInterval(timer);
  }, [playing, timeline.length]);
  useEffect(() => { if (playbackIndex >= timeline.length - 1) setPlaying(false); }, [playbackIndex, timeline.length]);

  const snapshot = useMemo(() => {
    const cutoff = timeline[playbackIndex]?.timestamp ?? Number.POSITIVE_INFINITY;
    const latestByPerson = new Map<string, StoredRelationship>();
    for (const item of relationships) {
      const timestamp = Date.parse(item.updatedAt || item.createdAt);
      if (!Number.isFinite(timestamp) || timestamp > cutoff) continue;
      const key = item.personKey || createPersonKey(item);
      const current = latestByPerson.get(key);
      if (!current || timestamp > Date.parse(current.updatedAt || current.createdAt)) latestByPerson.set(key, item);
    }
    return Array.from(latestByPerson.values()).sort((a, b) => a.targetName.localeCompare(b.targetName, "zh-CN"));
  }, [playbackIndex, relationships, timeline]);

  const filtered = useMemo(() => snapshot.filter((item) =>
    (riskFilter === "ALL" || item.risk_level === riskFilter)
    && (roleFilter === "ALL" || item.relationshipType === roleFilter)), [riskFilter, roleFilter, snapshot]);

  const option = useMemo<EChartsOption>(() => {
    const frameNodes = [[-310, -295], [310, -295], [310, 295], [-310, 295]].map(([x, y], index) => ({ id: `__frame-${index}`, x, y, symbolSize: 1, silent: true, label: { show: false }, itemStyle: { opacity: 0 } }));
    const nodes = [{
      id: "me", name: profile?.name || "我", fixed: true, x: 0, y: 0, symbol: "circle", symbolSize: 96,
      itemStyle: { color: "#eff6ff", borderColor: "#2563eb", borderWidth: 2.5, shadowBlur: 34, shadowColor: "rgba(37,99,235,.34)" },
      label: { show: true, color: "#1e3a8a", fontWeight: 700, fontSize: 13, lineHeight: 19, formatter: `${shortName(profile?.name || "我")}\n日元 ${centerDayStem || "待测"}` },
    }, ...filtered.map((item) => {
      const palette = riskStyle[item.risk_level];
      const angle = hashAngle(item.personKey || createPersonKey(item));
      const active = selectedId === item.id;
      return {
        id: item.id, name: item.targetName, status: palette.status, risk: item.risk_level,
        x: Math.cos(angle) * palette.distance, y: Math.sin(angle) * palette.distance,
        symbolSize: active ? 70 : 59,
        itemStyle: { color: active ? "#fff" : "#ffffff", borderColor: palette.color, borderWidth: active ? 3 : 2, shadowBlur: active ? 30 : 18, shadowColor: palette.glow },
        label: { show: true, color: "#334155", fontWeight: active ? 700 : 600, fontSize: 11, lineHeight: 17, formatter: `${shortName(item.targetName)}\n${item.relationshipType}` },
      };
    }), ...frameNodes];
    const links = filtered.map((item) => ({ source: "me", target: item.id, lineStyle: { color: riskStyle[item.risk_level].color, type: "dotted" as const, opacity: selectedId === item.id ? .84 : .42, width: selectedId === item.id ? 2.3 : 1.5 } }));
    return {
      animationDuration: 850, animationDurationUpdate: 750, animationEasingUpdate: "cubicOut",
      tooltip: { trigger: "item", backgroundColor: "#ffffff", borderColor: "#dbe5f0", borderWidth: 1, extraCssText: "box-shadow:0 12px 32px rgba(15,23,42,.12);border-radius:12px;padding:10px 12px", textStyle: { color: "#334155", fontSize: 12 }, formatter: (params: unknown) => { const node = graphDataFromEvent(params); if (!node?.id || node.id === "me") return "我的基准坐标"; return `${node.name || "关系人"}<br/><span style="color:${node.risk ? riskStyle[node.risk].color : "#64748b"}">${node.status || "已测算"}</span>`; } },
      series: [{ type: "graph", layout: "none", roam: true, draggable: true, data: nodes, links, lineStyle: { curveness: .08 }, emphasis: { focus: "adjacency", scale: 1.08 } }],
    };
  }, [centerDayStem, filtered, profile?.name, selectedId]);

  const onReady = useCallback((chart: ECharts) => {
    chartRef.current = chart;
    chart.off("click");
    chart.on("click", (event: unknown) => { const node = graphDataFromEvent(event); if (node?.id && node.id !== "me") onSelect(node.id); });
  }, [onSelect]);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const resize = () => chartRef.current?.resize();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    observer?.observe(shell); window.addEventListener("resize", resize);
    return () => { observer?.disconnect(); window.removeEventListener("resize", resize); chartRef.current?.off("click"); chartRef.current = null; };
  }, []);

  const selectedPoint = timeline[playbackIndex];
  const movePlayback = (direction: -1 | 1) => setPlaybackIndex((current) => Math.max(0, Math.min(timeline.length - 1, current + direction)));

  return <section className="orbit-shell relative min-h-[600px] overflow-hidden rounded-[30px]" aria-labelledby="orbit-title">
    <div className="relative z-10 flex items-start justify-between gap-4 px-5 pb-0 pt-5 sm:px-7 sm:pt-6">
      <div><p className="section-kicker flex items-center gap-2"><Orbit className="h-3.5 w-3.5" />关系星盘</p><h2 id="orbit-title" className="mt-2 font-display text-xl font-medium text-stone-100 sm:text-2xl">以我为圆心的关系网</h2><p className="mt-1 max-w-xl text-[10px] leading-5 text-stone-500">节点颜色反映存档中的参考盘等级；出生时辰未知时，请结合下方报告查看时辰推演范围。</p></div>
      <button onClick={onAdd} className="gold-button inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2.5 text-xs font-semibold"><CirclePlus className="h-4 w-4" /><span className="hidden sm:inline">新增关系</span><span className="sm:hidden">新增</span></button>
    </div>
    <div className="relative z-10 flex flex-wrap items-center gap-2 px-5 pt-4 sm:px-7">
      <label className="sr-only" htmlFor="orbit-role-filter">按关系类型筛选</label><select id="orbit-role-filter" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as "ALL" | RelationshipType)} className="form-input rounded-lg px-2.5 py-2 text-[10px]">{roleFilters.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
      <label className="sr-only" htmlFor="orbit-risk-filter">按避险等级筛选</label><select id="orbit-risk-filter" value={riskFilter} onChange={(event) => setRiskFilter(event.target.value as "ALL" | RiskLevel)} className="form-input rounded-lg px-2.5 py-2 text-[10px]">{riskFilters.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
      <span className="ml-auto text-[10px] text-slate-500">显示 {filtered.length} / {snapshot.length} 人</span>
    </div>
    <div ref={shellRef} className="relative z-[1] h-[390px] sm:h-[450px] md:h-[510px]" aria-label="以我为中心的人际关系网">
      <ReactECharts option={option} onChartReady={onReady} notMerge lazyUpdate autoResize style={{ width: "100%", height: "100%" }} opts={{ renderer: "canvas" }} />
      {relationships.length === 0 && <div className="pointer-events-none absolute inset-x-6 bottom-12 text-center text-xs text-slate-500">暂无星盘数据，添加第一个关系人后星点会从中心向外展开</div>}
      {relationships.length > 0 && filtered.length === 0 && <div className="pointer-events-none absolute inset-x-6 bottom-12 text-center text-xs text-slate-500">当前筛选没有匹配关系，试试切换筛选条件</div>}
    </div>
    <div className="relative z-10 px-5 pb-5 sm:px-7">
      <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500"><MousePointer2 className="h-3.5 w-3.5" /><span>点状连线只表示“我”与关系人；点击节点看报告</span><span className="ml-auto hidden items-center gap-3 sm:flex"><span><i className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />同盟</span><span><i className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />观察</span><span><i className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-rose-500" />设防</span></span></div>
      {timeline.length > 1 && <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white/75 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2"><span className="mr-auto flex items-center gap-2 text-xs font-semibold text-slate-700"><Orbit className="h-3.5 w-3.5 text-blue-600" />星图时间回放</span><button type="button" onClick={() => { setPlaying(false); setPlaybackIndex(0); }} aria-label="回到最早记录" className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"><Rewind className="h-3.5 w-3.5" /></button><button type="button" onClick={() => { if (playbackIndex >= timeline.length - 1) setPlaybackIndex(0); setPlaying((value) => !value); }} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-semibold text-white hover:bg-blue-700">{playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}{playing ? "暂停" : "播放"}</button><button type="button" onClick={() => { setPlaying(false); setPlaybackIndex(timeline.length - 1); }} aria-label="跳到最新记录" className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"><FastForward className="h-3.5 w-3.5" /></button></div>
        <input aria-label="选择星图回放时点" type="range" min={0} max={timeline.length - 1} value={playbackIndex} onChange={(event) => { setPlaying(false); setPlaybackIndex(Number(event.target.value)); }} className="mt-3 w-full accent-blue-600" />
        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500"><span>{selectedPoint ? new Date(selectedPoint.timestamp).toLocaleString("zh-CN", { dateStyle: "medium", timeStyle: "short" }) : "当前"} · {selectedPoint?.kind ?? "最新"}</span><span>{playbackIndex + 1} / {timeline.length} 个时间点</span></div>
      </div>}
    </div>
  </section>;
}
