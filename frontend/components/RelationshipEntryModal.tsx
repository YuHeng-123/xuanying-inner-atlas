"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Clock3, LoaderCircle, MessageSquareText, Send, UserRound, X } from "lucide-react";

import type { RelationshipType } from "@/lib/types";

export interface NewRelationshipValues {
  targetName: string;
  targetDate: string;
  targetHour: string;
  relationshipType: RelationshipType;
  concern: string;
}

interface RelationshipEntryModalProps {
  open: boolean;
  isLoading: boolean;
  error: string | null;
  initialValues?: Partial<NewRelationshipValues> | null;
  onClose: () => void;
  onSubmit: (values: NewRelationshipValues) => void | Promise<void>;
}

const relationshipOptions: RelationshipType[] = ["直属领导", "平级同事", "合伙人", "朋友", "相亲对象"];
const hourOptions = Array.from({ length: 24 }, (_, hour) => hour);
const emptyValues: NewRelationshipValues = { targetName: "", targetDate: "", targetHour: "", relationshipType: "直属领导", concern: "" };

export default function RelationshipEntryModal({ open, isLoading, error, initialValues, onClose, onSubmit }: RelationshipEntryModalProps) {
  const [values, setValues] = useState<NewRelationshipValues>(emptyValues);

  useEffect(() => {
    if (open) setValues({ ...emptyValues, ...initialValues });
  }, [initialValues, open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isLoading) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLoading, onClose, open]);

  if (!open) return null;

  const update = <K extends keyof NewRelationshipValues>(key: K, value: NewRelationshipValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-xl" role="dialog" aria-modal="true" aria-labelledby="relationship-entry-title" onClick={() => { if (!isLoading) onClose(); }}>
      <div className="decision-panel w-full max-w-xl rounded-[30px] p-5 sm:p-7" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">NEW NODE / 新关系</p><h2 id="relationship-entry-title" className="mt-2 text-xl font-semibold text-slate-100">向我的关系档案加入一人</h2><p className="mt-2 text-xs leading-5 text-slate-500">出生日期按身份证或出生记录上的公历填写；系统会自动带入你的底牌。</p></div><button onClick={onClose} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-800 hover:text-slate-200" aria-label="关闭新关系弹窗"><X className="h-5 w-5" /></button></div>
        <form onSubmit={(event) => { event.preventDefault(); void onSubmit(values); }} className="mt-7 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="mb-2 block text-xs font-medium text-slate-400">对方称呼 <span className="text-rose-400">*</span></span><div className="input-shell"><UserRound className="h-4 w-4 shrink-0 text-rose-400" /><input required autoFocus value={values.targetName} onChange={(event) => update("targetName", event.target.value)} placeholder="例如：周总 / Alex" maxLength={30} /></div></label>
            <label className="block"><span className="mb-2 block text-xs font-medium text-slate-400">关系角色 <span className="text-rose-400">*</span></span><div className="input-shell"><Send className="h-4 w-4 shrink-0 text-rose-400" /><select value={values.relationshipType} onChange={(event) => update("relationshipType", event.target.value as RelationshipType)}>{relationshipOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></div></label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-2 block text-xs font-medium text-slate-400">对方出生年月日 <span className="text-rose-400">*</span></span><div className="input-shell"><CalendarDays className="h-4 w-4 shrink-0 text-rose-400" /><input required type="date" value={values.targetDate} onChange={(event) => update("targetDate", event.target.value)} /></div></label><label className="block"><span className="mb-2 block text-xs font-medium text-slate-400">出生时辰 <span className="text-slate-600">· 选填</span></span><div className="input-shell"><Clock3 className="h-4 w-4 shrink-0 text-slate-500" /><select value={values.targetHour} onChange={(event) => update("targetHour", event.target.value)}><option value="">时辰未知 · 推演可能范围</option>{hourOptions.map((hour) => <option key={hour} value={hour}>{String(hour).padStart(2, "0")} : 00</option>)}</select></div></label></div>
          <label className="block"><span className="mb-2 block text-xs font-medium text-slate-400">相处困惑 / 备注 <span className="text-slate-600">· 选填</span></span><div className="input-shell items-start"><MessageSquareText className="mt-3 h-4 w-4 shrink-0 text-slate-500" /><textarea value={values.concern} onChange={(event) => update("concern", event.target.value)} placeholder="最近发生了什么？你最想看清哪一个局面？" rows={4} maxLength={4000} className="resize-none" /></div><p className="mt-2 text-[10px] leading-5 text-slate-500">隐私提醒：若后端配置了 LLM 密钥，这段备注会发送给所配置的模型服务；未配置则使用本地 Mock。请勿填写身份证号、电话、住址、单位等可识别隐私。</p></label>
          {error && <p className="rounded-xl border border-rose-500/20 bg-rose-500/[0.08] px-3 py-2 text-xs leading-5 text-rose-200" role="alert">{error}</p>}
          <div className="flex justify-end border-t border-slate-800 pt-5"><button type="submit" disabled={isLoading} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-wait disabled:opacity-70">{isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{isLoading ? "正在合盘…" : "加入我的关系星盘"}</button></div>
        </form>
      </div>
    </div>
  );
}
