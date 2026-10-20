"use client";

import { Orbit, ShieldAlert, Sparkles, Target } from "lucide-react";
import { useEffect, useState } from "react";

interface MobileSectionNavProps {
  hidden?: boolean;
}

const sections = [
  { id: "orbit", label: "星盘", icon: Orbit },
  { id: "summary", label: "摘要", icon: Sparkles },
  { id: "risk-guide", label: "避险", icon: ShieldAlert },
  { id: "long-game", label: "长线", icon: Target },
];

export default function MobileSectionNav({ hidden = false }: MobileSectionNavProps) {
  const [activeId, setActiveId] = useState("orbit");
  useEffect(() => {
    if (hidden || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveId(visible.target.id);
    }, { rootMargin: "-35% 0px -52% 0px", threshold: [0.05, 0.35] });
    sections.forEach(({ id }) => document.getElementById(id) && observer.observe(document.getElementById(id)!));
    return () => observer.disconnect();
  }, [hidden]);

  if (hidden) return null;
  return <nav className="fixed inset-x-4 bottom-3 z-30 flex items-center justify-around rounded-[22px] border border-white/[0.08] bg-[#0d0f13]/95 px-1.5 py-1.5 shadow-[0_18px_55px_rgba(0,0,0,.55)] backdrop-blur-2xl md:hidden" style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }} aria-label="页面快速导航">
    {sections.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })} className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] transition ${activeId === id ? "bg-[#d7ad63]/12 text-[#ebce94]" : "text-stone-600 hover:text-stone-400"}`} aria-label={`跳转至${label}`}><Icon className="h-4 w-4" /><span>{label}</span></button>)}
  </nav>;
}
