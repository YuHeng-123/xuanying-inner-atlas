"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { gsap } from "gsap";
import { ArrowLeft, ArrowUpRight, BookOpen, CircleDot, Compass, Home, MousePointer2, Pause, Play, RotateCcw, ScrollText, X } from "lucide-react";
import { EXPERIENCE_OBJECTS, getExperienceObject, type ExperienceObjectId } from "./experienceObjects";
import styles from "./experience.module.css";
import WorkspaceContent from "./WorkspaceContent";
import type { ExperiencePhase, RitualEvent, SceneData, WorkspaceTab } from "./experienceTypes";

const TempleScene = dynamic(() => import("./ObservatoryScene"), { ssr: false, loading: () => null });
const icons = { disc: CircleDot, relationships: BookOpen, divination: Compass, archive: ScrollText };
const tabForObject: Record<ExperienceObjectId, WorkspaceTab> = { disc: "bazi", relationships: "relationships", divination: "decision", archive: "archive" };
const objectForTab: Record<WorkspaceTab, ExperienceObjectId> = { bazi: "disc", ziwei: "disc", "star-ci": "disc", relationships: "relationships", decision: "divination", archive: "archive" };

class SceneBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function TempleExperience() {
  const [selected, setSelected] = useState<ExperienceObjectId | null>(null);
  const [arrived, setArrived] = useState<ExperienceObjectId | null>(null);
  const [hovered, setHovered] = useState<ExperienceObjectId | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [still, setStill] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [reset, setReset] = useState(0);
  const [phase, setPhase] = useState<ExperiencePhase>("intro");
  const [opened, setOpened] = useState(false);
  const [tab, setTab] = useState<WorkspaceTab>("bazi");
  const [requestSerial, setRequestSerial] = useState(0);
  const [personId, setPersonId] = useState<string | null>(null);
  const [sceneData, setSceneData] = useState<SceneData>({ profileName: null, dayStem: null, people: [] });
  const [ritual, setRitual] = useState<RitualEvent | null>(null);
  const doorway = useRef<HTMLDivElement>(null);
  const reader = useRef<HTMLElement>(null);
  const readButton = useRef<HTMLButtonElement>(null);
  const root = useRef<HTMLElement>(null);
  const markerRoot = useRef<HTMLDivElement>(null);
  const enterTimeline = useRef<gsap.core.Timeline | null>(null);
  const active = getExperienceObject(selected);
  const hover = getExperienceObject(hovered);
  const home = useCallback(() => { setOpened(false); setSelected(null); setHovered(null); setReset((value) => value + 1); }, []);
  const closeReader = useCallback(() => { setOpened(false); window.setTimeout(() => readButton.current?.focus(), 0); }, []);
  const openReader = useCallback((id: ExperienceObjectId, person: string | null = null) => { setSelected(id); setTab(tabForObject[id]); setPersonId(person); setRequestSerial((n) => n + 1); setOpened(true); }, []);
  const selectObject = useCallback((id: ExperienceObjectId) => { setSelected(id); setOpened(false); setHovered(null); }, []);
  const nextObject = useCallback((direction: number) => {
    const index = EXPERIENCE_OBJECTS.findIndex((item) => item.id === selected);
    selectObject(EXPERIENCE_OBJECTS[(index + direction + EXPERIENCE_OBJECTS.length) % EXPERIENCE_OBJECTS.length].id);
  }, [selected, selectObject]);
  const changeTab = useCallback((next: WorkspaceTab) => { if (opened) setSelected(objectForTab[next]); }, [opened]);
  const enter = useCallback(() => {
    if (!ready || phase !== "intro") return;
    setPhase("entering");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setPhase("hall"); return; }
    enterTimeline.current = gsap.timeline({ onComplete: () => setPhase("hall") }).to(doorway.current, { opacity: 0, scale: 1.08, duration: 1.1, ease: "power2.inOut" });
  }, [ready, phase]);
  const markReady = useCallback(() => setReady(true), []);
  const markFailure = useCallback(() => { setFailed(true); setReady(true); }, []);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Start quiet on every device; continuous motion is explicitly enabled.
    const updateMotion = () => { setReducedMotion(motion.matches); if (motion.matches) setStill(true); };
    updateMotion();
    motion.addEventListener("change", updateMotion);
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { if (opened) closeReader(); else home(); } };
    window.addEventListener("keydown", escape);
    return () => { window.removeEventListener("keydown", escape); motion.removeEventListener("change", updateMotion); };
  }, [home, opened, closeReader]);
  useEffect(() => () => { enterTimeline.current?.kill(); }, []);
  useEffect(() => {
    if (!opened || !reader.current) return;
    const panel = reader.current;
    panel.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')).filter((el) => el.offsetParent !== null);
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) { event.preventDefault();last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    panel.addEventListener("keydown",trap);
    return () => panel.removeEventListener("keydown",trap);
  }, [opened]);

  useEffect(() => {
    const original = document.body.style.overflow;
    const wasLight = document.body.classList.contains("app-light");
    document.body.style.overflow = "hidden";
    document.body.classList.remove("app-light");
    return () => { document.body.style.overflow = original; if (wasLight) document.body.classList.add("app-light"); };
  }, []);

  return (
    <main ref={root} className={styles.experience} data-preview="interactive-observatory" data-ready={ready} data-selected={selected ?? "home"} data-arrived={arrived ?? "home"} data-phase={phase} data-opened={opened}>
      <div className={styles.scene} aria-label="可探索的三维观测室，拖动环顾，点击物件进入对应空间">
        <SceneBoundary onFailure={markFailure}>
          <TempleScene selected={selected} hovered={hovered} onSelect={selectObject} onHover={setHovered} onReady={markReady} onFailure={markFailure} still={still} reset={reset} phase={phase} opened={opened} sceneData={sceneData} ritual={ritual} reducedMotion={reducedMotion} markerRoot={markerRoot} onArrive={setArrived}/>
        </SceneBoundary>
      </div>
      <div className={styles.vignette} aria-hidden="true" />

      <header className={styles.header}>
        <button className={styles.brand} onClick={home} aria-label="返回主厅"><span className={styles.seal}>玄</span><span>玄境<small>ASTRAL OBSERVATORY</small></span></button>
        <span className={styles.stage}><i /> {active ? active.place : "天机观测室 · 自由探索"}</span>
        <a className={styles.originalLink} href="/classic">简洁阅读 <ArrowUpRight size={14} /></a>
      </header>

      <section className={`${styles.intro} ${active || phase !== "hall" ? styles.introQuiet : ""}`}>
        <p className={styles.eyebrow}>一个空间，四种观察方式</p>
        <h1>在万象之间<span>找到自己的坐标。</span></h1>
        <p className={styles.introNote}>拖动环顾 · 点击物件 · 进入探索</p>
      </section>

      {phase === "hall" && !opened && !active && <aside className={styles.telemetry} aria-label="当前档案状态">
        <dl><div><dt>个人命盘</dt><dd>{sceneData.profileName ?? "等待建立"}</dd></div><div><dt>关系人物</dt><dd>{sceneData.people.length} <small>位</small></dd></div></dl>
      </aside>}

      <div ref={markerRoot} className={styles.markers} aria-label="场景物件入口">
        {EXPERIENCE_OBJECTS.map((item) => <button key={item.id} type="button" data-anchor={item.id} aria-label={`探索${item.name}`} onClick={() => selectObject(item.id)} onMouseEnter={() => setHovered(item.id)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(item.id)} onBlur={() => setHovered(null)} className={`${styles.marker} ${hovered === item.id ? styles.markerHovered : ""}`}><i/><span>{item.name}</span><ArrowUpRight size={12}/></button>)}
      </div>

      <div className={styles.topTools}>
        <button type="button" onClick={home} aria-label="恢复主厅视角" title="恢复主厅视角"><RotateCcw size={17} /></button>
        <button type="button" onClick={() => setStill((value) => !value)} aria-label={still ? "开启环境动画" : "暂停环境动画"} aria-pressed={!still} title={still ? "开启环境动画" : "暂停环境动画"}>{still ? <Play size={17} /> : <Pause size={17} />}</button>
      </div>

      {hover && !active && <div className={styles.hoverName} aria-live="polite"><span>{hover.number}</span>{hover.name}<small>点击靠近</small></div>}

      {active && !opened && phase === "hall" && <aside className={styles.objectPanel} key={active.id} aria-labelledby="object-title">
        <div className={styles.panelTop}><span>探索 / {active.number}</span><button type="button" onClick={home} aria-label="返回观测室"><X size={17} /></button></div>
        <p className={styles.place}>{active.place}</p>
        <h2 id="object-title">{active.name}</h2>
        <div className={styles.panelRule}><i /><span>{active.id === "disc" && sceneData.profileName ? `${sceneData.profileName} · ${sceneData.dayStem ? `${sceneData.dayStem}日主` : "命盘阅读"}` : "连接一个问题，探索一种可能"}</span></div>
        <p className={styles.description}>{active.description}</p>
        {active.id === "relationships" && sceneData.people.length > 0 && <div className={styles.people}>{sceneData.people.slice(0,6).map((person)=><button key={person.id} onClick={()=>openReader("relationships",person.id)}>{person.name}<ArrowUpRight size={12}/></button>)}</div>}
        <button ref={readButton} className={styles.readButton} disabled={arrived !== active.id} onClick={()=>openReader(active.id)}> {arrived !== active.id ? "正在靠近…" : active.id === "relationships" ? "打开人际网络" : active.id === "divination" ? "开始问卦" : active.id === "archive" ? "查阅档案" : "展开命盘"}<ArrowUpRight size={16}/></button>
        <div className={styles.sceneSteps}><button onClick={() => nextObject(-1)} aria-label="上一个空间"><ArrowLeft size={13}/>上一处</button><button onClick={() => nextObject(1)} aria-label="下一个空间">下一处<ArrowUpRight size={13}/></button></div>
        <button type="button" className={styles.homeButton} onClick={home}><ArrowLeft size={15} />返回主厅<span>ESC</span></button>
      </aside>}

      {!ready && <div className={styles.loading} role="status"><span className={styles.loadingSeal}>玄</span><p>正在准备观测室</p><small>载入仪器、空间与材质细节</small></div>}
      {failed && <div className={styles.failure} role="status"><h2>三维画面暂时无法显示</h2><p>可以继续使用命盘、人际关系和占卜功能。</p><a href="/classic">打开简洁阅读</a></div>}

      {!failed && phase !== "hall" && ready && <div ref={doorway} className={styles.doorway}>
        <p className={styles.doorEyebrow}>ASTRAL OBSERVATORY</p><h2>玄境</h2><p className={styles.doorVerse}>万象有迹，观照此刻。<br/>进入空间，寻找属于你的观察方式。</p>
        <button className={styles.enterButton} onClick={enter} disabled={phase === "entering"}>进入观测室<ArrowUpRight size={19}/><span>ENTER THE OBSERVATORY</span></button>
        <button className={styles.skipButton} onClick={()=>{enterTimeline.current?.kill();setPhase("hall");}}>跳过入场</button>
      </div>}

      <section ref={reader} role="dialog" aria-modal={opened ? true : undefined} aria-label="命理与关系阅读" tabIndex={-1} className={`${styles.reader} ${opened ? styles.readerOpen : ""}`} hidden={!opened}>
        <div className={styles.readerBar}><span>玄境 / {getExperienceObject(selected)?.name ?? "观测站"}</span><button onClick={closeReader}><ArrowLeft size={14}/>返回空间<X size={15}/></button></div>
        <div className={styles.readerScroll}><WorkspaceContent embedded requestedTab={tab} requestSerial={requestSerial} requestedPersonId={personId} onSceneData={setSceneData} onTabChange={changeTab} onRitual={setRitual} animateRitual={!reducedMotion && !failed}/></div>
      </section>

      <footer className={styles.footer} style={{visibility:phase === "hall" && !opened ? "visible" : "hidden"}}>
        <div className={styles.navigation} aria-label="观测站功能导航">
          <button type="button" className={`${styles.homeTile} ${!selected ? styles.tileActive : ""}`} onClick={home} aria-label="返回主厅" aria-pressed={!selected}><Home size={17} /><span>全景</span></button>
          {EXPERIENCE_OBJECTS.map((item) => { const Icon = icons[item.id]; return <button key={item.id} type="button" onClick={() => selectObject(item.id)} onMouseEnter={() => setHovered(item.id)} onMouseLeave={() => setHovered(null)} className={`${styles.navTile} ${selected === item.id ? styles.tileActive : ""}`} aria-label={`靠近${item.name}`} aria-pressed={selected === item.id}><span className={styles.tileNumber}>{item.number}</span><Icon size={19} /><span>{item.shortName}</span></button>; })}
        </div>
        <div className={styles.footnotes}><span><MousePointer2 size={12} />拖动环顾 · 点击物件进入 · ESC 返回</span><span>命理与问卦供自我探索</span></div>
      </footer>
    </main>
  );
}
