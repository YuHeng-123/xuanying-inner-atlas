"use client";

import { useCallback, useEffect, useState } from "react";
import { apiEndpoint } from "@/lib/api";
import { loadProfile, PROFILE_STORAGE_KEY, saveProfile } from "@/lib/storage";
import type { MyProfile } from "@/lib/types";
import type { BaziResult } from "@/components/BaziReadingStudio";

export const PILLARS = [{ key: "year", label: "年柱" }, { key: "month", label: "月柱" }, { key: "day", label: "日柱" }, { key: "hour", label: "时柱" }] as const;
export type PillarKey = typeof PILLARS[number]["key"];
export type PlateData = { key: PillarKey; label: string; value: string | null; uncertain: boolean };

function isChart(value: unknown): value is BaziResult {
  if (!value || typeof value !== "object") return false;
  const chart = value as BaziResult;
  return Boolean(chart.user_bazi?.pillars && typeof chart.user_bazi.has_hour === "boolean"
    && PILLARS.every(({ key }) => key === "hour" && chart.user_bazi.pillars[key] === null || typeof chart.user_bazi.pillars[key] === "string" && /^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/.test(chart.user_bazi.pillars[key]!))
    && typeof chart.user_reading?.day_master === "string" && typeof chart.user_reading.day_master_element === "string"
    && Array.isArray(chart.user_reading.positions) && chart.user_reading.positions.every((position) => typeof position.position === "string" && typeof position.explanation === "string" && typeof position.ten_god === "string" && typeof position.stem_element === "string" && typeof position.branch_element === "string")
    && Array.isArray(chart.user_reading.hidden_stems));
}

export default function usePersonalChart() {
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [result, setResult] = useState<{ owner: string; chart: BaziResult } | null>(null);
  const [loading, setLoading] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const refresh = useCallback(() => {
    try {
      const next = loadProfile();
      setProfile((previous) => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
      setStorageError("");
    } catch (reason) { setProfile(null); setStorageError(reason instanceof Error ? reason.message : "无法读取出生资料，请检查浏览器存储。"); }
  }, []);
  const saveBirthProfile = useCallback((next: MyProfile) => {
    try {
      saveProfile(next);
      setProfile(next);
      setStorageError("");
      setError("");
      return true;
    } catch (reason) {
      setStorageError(reason instanceof Error ? reason.message : "出生资料保存失败，请检查浏览器存储后重试。");
      return false;
    }
  }, []);
  useEffect(() => {
    refresh();
    const changed = (event: StorageEvent) => { if (event.key === null || event.key === PROFILE_STORAGE_KEY) refresh(); };
    window.addEventListener("storage", changed); window.addEventListener("focus", refresh);
    return () => { window.removeEventListener("storage", changed); window.removeEventListener("focus", refresh); };
  }, [refresh]);
  useEffect(() => {
    setResult(null); setError(""); setLoading(false);
    if (!profile) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 15_000);
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const response = await fetch(apiEndpoint("/api/v1/reading/bazi"), { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
          body: JSON.stringify({ user_birth: { year: profile.year, month: profile.month, day: profile.day, ...(profile.hour === null || profile.hour === undefined ? {} : { hour: profile.hour }) } }) });
        const data: unknown = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data && typeof data === "object" && "detail" in data && typeof data.detail === "string" ? data.detail : "排盘服务暂时不可用，请稍后重试。");
        if (!isChart(data)) throw new Error("排盘结果不完整，暂不显示四柱，请重试。");
        if (!cancelled) setResult({ owner: JSON.stringify(profile), chart: data });
      } catch (reason) {
        const networkFailure = reason instanceof TypeError || reason instanceof Error && /failed to fetch|networkerror|load failed/i.test(reason.message);
        if (!cancelled) setError(controller.signal.aborted ? "排盘请求超时，请检查服务后重试。" : networkFailure ? "无法连接排盘服务，请确认服务已启动后重试。" : reason instanceof Error ? reason.message : "连接排盘服务失败，请检查服务后重试。");
      } finally { window.clearTimeout(timer); if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; controller.abort(); window.clearTimeout(timer); };
  }, [profile, attempt]);
  const chart = result?.owner === JSON.stringify(profile) ? result.chart : null;
  return { profile, chart, loading, error: storageError || error, refresh, saveBirthProfile, retry: () => { refresh(); setAttempt((value) => value + 1); } };
}

export function chartPlates(chart: BaziResult | null): PlateData[] {
  return PILLARS.map(({ key, label }) => {
    const options = key === "hour" ? [] : chart?.user_time_uncertainty?.pillar_options[key] ?? [];
    return { key, label, value: chart?.user_bazi.pillars[key] ?? null, uncertain: options.length > 1 };
  });
}
