"use client";

import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

export function WorkbenchTabs<T extends string>({ label, value, onChange, items }: {
  label: string; value: T; onChange: (value: T) => void; items: ReadonlyArray<{ id: T; label: string }>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return <div ref={ref} className="workbench-tabs" role="group" aria-label={label}>
    {items.map((item, index) => <button key={item.id} type="button" aria-pressed={value === item.id} onClick={() => onChange(item.id)} onKeyDown={(event) => {
      let next: number | undefined;
      if (event.key === "ArrowRight") next = (index + 1) % items.length;
      if (event.key === "ArrowLeft") next = (index + items.length - 1) % items.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = items.length - 1;
      if (next === undefined) return;
      event.preventDefault(); onChange(items[next].id); ref.current?.querySelectorAll("button")[next]?.focus();
    }}>{item.label}</button>)}
  </div>;
}

/** Native dialog supplies focus trapping and makes the background inert on mobile. */
export function WorkbenchInspector({ title, open, onClose, children }: {
  title: string; open: boolean; onClose: () => void; children: ReactNode;
}) {
  const id = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const media = window.matchMedia("(min-width: 768px)");
    const sync = () => {
      if (open && !media.matches && !dialog.open) dialog.showModal();
      if ((!open || media.matches) && dialog.open) dialog.close();
    };
    sync(); media.addEventListener("change", sync);
    if (open && !media.matches) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { media.removeEventListener("change", sync); dialog.close(); document.body.style.overflow = previous; };
    }
    return () => { media.removeEventListener("change", sync); dialog.close(); };
  }, [open]);
  return <>
    <aside className="workbench-inspector hidden md:block"><h3 className="mb-4 text-base font-semibold text-slate-900">{title}</h3>{children}</aside>
    <dialog ref={ref} aria-labelledby={id} className="workbench-sheet" onCancel={() => closeRef.current()} onClick={(event) => { if (event.target === event.currentTarget) closeRef.current(); }}>
      <div className="p-5" onClick={(event) => event.stopPropagation()}><div className="mb-4 flex items-center justify-between gap-3"><h3 id={id} className="text-lg font-semibold text-slate-900">{title}</h3><button type="button" autoFocus onClick={onClose} aria-label="关闭详情" className="rounded-xl border border-slate-200 p-2"><X className="h-4 w-4" /></button></div>{children}</div>
    </dialog>
  </>;
}
