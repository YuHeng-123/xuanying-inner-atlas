"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Clock3, Info, LockKeyhole, Save, UserRound, X } from "lucide-react";

import type { MyProfile, ProfileDraft } from "@/lib/types";

interface ProfileSetupModalProps {
  open: boolean;
  initialProfile: MyProfile | null;
  required?: boolean;
  onClose: () => void;
  onSave: (profile: MyProfile) => boolean;
}

const emptyDraft: ProfileDraft = { name: "", date: "", hour: "" };
const hourOptions = Array.from({ length: 24 }, (_, hour) => hour);

function toDraft(profile: MyProfile | null): ProfileDraft {
  if (!profile) return emptyDraft;
  const month = String(profile.month).padStart(2, "0");
  const day = String(profile.day).padStart(2, "0");
  return { name: profile.name, date: `${profile.year}-${month}-${day}`, hour: profile.hour === undefined || profile.hour === null ? "" : String(profile.hour) };
}

function toProfile(draft: ProfileDraft): MyProfile | null {
  const [year, month, day] = draft.date.split("-").map(Number);
  if (!draft.name.trim() || ![year, month, day].every(Number.isInteger)) return null;
  return { name: draft.name.trim(), year, month, day, ...(draft.hour === "" ? {} : { hour: Number(draft.hour) }) };
}

export default function ProfileSetupModal({ open, initialProfile, required = false, onClose, onSave }: ProfileSetupModalProps) {
  const [draft, setDraft] = useState<ProfileDraft>(() => toDraft(initialProfile));

  useEffect(() => {
    if (open) setDraft(toDraft(initialProfile));
  }, [initialProfile, open]);

  if (!open) return null;

  const update = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-xl" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
      <div className="decision-panel w-full max-w-md rounded-[30px] p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">MY CORE / 我的底牌</p><h2 id="profile-modal-title" className="mt-2 text-xl font-semibold text-slate-100">初始化我的基准坐标</h2><p className="mt-2 text-xs leading-5 text-slate-500">出生日期按身份证上的公历填写。保存到此设备，只用于后续测算，不会写入分享海报。</p></div>{!required && <button onClick={onClose} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-800 hover:text-slate-200" aria-label="关闭我的底牌设置"><X className="h-5 w-5" /></button>}</div>
        <form onSubmit={(event) => { event.preventDefault(); const nextProfile = toProfile(draft); if (nextProfile && onSave(nextProfile)) onClose(); }} className="mt-7 space-y-5">
          <label className="block"><span className="mb-2 block text-xs font-medium text-slate-400">你的称呼 <span className="text-rose-400">*</span></span><div className="input-shell"><UserRound className="h-4 w-4 shrink-0 text-amber-400" /><input required autoFocus value={draft.name} onChange={(event) => update("name", event.target.value)} placeholder="例如：林默" maxLength={30} /></div></label>
          <label className="block"><span className="mb-2 block text-xs font-medium text-slate-400">出生年月日 <span className="text-rose-400">*</span></span><div className="input-shell"><CalendarDays className="h-4 w-4 shrink-0 text-amber-400" /><input required type="date" value={draft.date} onChange={(event) => update("date", event.target.value)} /></div></label>
          <label className="block"><span className="mb-2 block text-xs font-medium text-slate-400">出生时辰 <span className="text-slate-600">· 选填</span></span><div className="input-shell"><Clock3 className="h-4 w-4 shrink-0 text-slate-500" /><select value={draft.hour} onChange={(event) => update("hour", event.target.value)}><option value="">时辰未知</option>{hourOptions.map((hour) => <option key={hour} value={hour}>{String(hour).padStart(2, "0")} : 00</option>)}</select></div></label>
          <div className="flex gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] leading-5 text-slate-600"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600" />点击“保存我的底牌”后生效，关闭弹窗会放弃未保存的修改；时辰未知时会比较可能范围。历史关系档案会保留。</div>
          <div className="flex items-center justify-between gap-3 pt-2"><span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-emerald-400"><LockKeyhole className="h-3.5 w-3.5" />local only</span><button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300"><Save className="h-4 w-4" />保存我的底牌</button></div>
        </form>
      </div>
    </div>
  );
}
