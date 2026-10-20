"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[Relationship Compass] route error", error);
  }, [error]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-5 py-12 text-slate-100">
      <div className="data-grid pointer-events-none absolute inset-0 opacity-60" />
      <section className="glass-panel relative w-full max-w-lg rounded-3xl border border-rose-500/20 p-7 text-center shadow-[0_0_70px_rgba(244,63,94,0.12)] sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <p className="eyebrow mt-6 text-rose-400">ROUTE RECOVERY / 容错模式</p>
        <h1 className="mt-2 font-display text-2xl font-semibold">关系罗盘暂时偏航</h1>
        <p className="mt-3 text-sm leading-7 text-slate-500">当前页面遇到了一次可恢复错误。本地档案不会因此被清除，请重试加载。</p>
        <button onClick={reset} className="shine-button mt-7 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-slate-950">
          <RotateCcw className="h-4 w-4" />重新校准页面
        </button>
      </section>
    </main>
  );
}
