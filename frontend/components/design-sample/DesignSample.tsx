"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowUpRight, Archive, ArrowRight, CalendarDays, MoveUpRight, UsersRound, WandSparkles, X } from "lucide-react";
import styles from "./sample.module.css";
import usePersonalChart, { chartPlates, PILLARS, type PillarKey } from "./usePersonalChart";
import { groupRelationships, loadRelationships } from "@/lib/storage";
import type { DecisionMode, RitualEvent, SceneData, ScenePerson, WorkspaceTab } from "../experience/experienceTypes";
import type { ExploreModule } from "./Instrument";

const Instrument = dynamic(() => import("./Instrument"), { ssr: false });
const Workspace = dynamic(() => import("../experience/WorkspaceContent"), { ssr: false });
const DecisionQuick = dynamic(() => import("../DecisionDivinationStudio"), { ssr: false });

class SceneBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function DesignSample() {
  const [entered, setEntered] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reading, setReading] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [skipAnimation, setSkipAnimation] = useState(false);
  const [activeModule, setActiveModule] = useState<ExploreModule>("bazi");
  const [people, setPeople] = useState<ScenePerson[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [peopleError, setPeopleError] = useState("");
  const [ritual, setRitual] = useState<RitualEvent | null>(null);
  const [decisionMode, setDecisionMode] = useState<DecisionMode>("lot");
  const [workspaceSerial, setWorkspaceSerial] = useState(1);
  const [readerTab, setReaderTab] = useState<WorkspaceTab>("bazi");
  const [selectedPillar, setSelectedPillar] = useState<PillarKey>("day");
  const [birthDate, setBirthDate] = useState("");
  const [birthHour, setBirthHour] = useState("");
  const personal = usePersonalChart();
  const refreshPersonal = personal.refresh;
  const savedBirthDate = personal.profile ? `${personal.profile.year}-${String(personal.profile.month).padStart(2, "0")}-${String(personal.profile.day).padStart(2, "0")}` : "";
  const savedBirthHour = personal.profile?.hour === null || personal.profile?.hour === undefined ? "" : String(personal.profile.hour);
  const birthDraftChanged = Boolean(personal.profile) && (birthDate !== savedBirthDate || birthHour !== savedBirthHour);
  const currentChart = birthDraftChanged ? null : personal.chart;
  const plates = useMemo(() => chartPlates(currentChart), [currentChart]);
  const currentPlate = plates.find((plate) => plate.key === selectedPillar)!;
  const position = currentChart?.user_reading.positions.find((item) => item.position === selectedPillar);
  const hidden = currentChart?.user_reading.hidden_stems.find((item) => item.position === selectedPillar);
  const options = selectedPillar === "hour" ? [] : currentChart?.user_time_uncertainty?.pillar_options[selectedPillar] ?? [];
  const dayUncertain = plates.find((plate) => plate.key === "day")!.uncertain;
  const dialog = useRef<HTMLDialogElement>(null);
  const readButton = useRef<HTMLButtonElement>(null);
  const selectedPerson = people.find((person) => person.id === selectedPersonId) ?? null;
  const tabByModule: Record<ExploreModule, WorkspaceTab> = { bazi: "bazi", relationships: "relationships", decision: "decision" };
  const moduleCopy: Record<ExploreModule, { label: string; short: string; title: string; description: string; action: string }> = {
    bazi: { label: "命盘", short: "认识天性", title: "我的命盘", description: "查看实际排盘结果与出生时间说明。", action: "完整解读与设置" },
    relationships: { label: "人际", short: "理解彼此", title: selectedPerson ? selectedPerson.name : "关系 · 脉络", description: selectedPerson ? "已选中人物，可继续查看关系报告与互动记录。" : `人物档案形成关系星图 · 当前 ${people.length} 位`, action: selectedPerson ? "查看此人关系档案" : "打开人际档案" },
    decision: { label: "问卦", short: "回应此刻", title: "此刻 · 灵感决策", description: ritual?.kind === "choice" && ritual.selection ? `刚刚抽到「${ritual.selection}」` : ritual?.kind === "cups" ? `刚刚模拟掷筊：${ritual.faces?.join(" / ")}` : ritual?.kind === "lot" ? `刚刚抽到第 ${ritual.lotNumber} 签 · ${ritual.lotRank}` : ritual?.kind === "coins" && ritual.line ? `最近一爻：${ritual.line} · ${ritual.line === 7 || ritual.line === 9 ? "阳" : "阴"}` : "签筒抽签、圣杯掷筊与铜钱六爻；日常帮选单独提供。", action: "查看记录与完整说明" },
  };
  const currentCopy = moduleCopy[activeModule];
  const enter = () => { if (ready) setEntered(true); };
  const openReader = (tab: WorkspaceTab = tabByModule[activeModule]) => { setReaderTab(tab); setWorkspaceSerial((value) => value + 1); setReading(true); };
  const close = () => { dialog.current?.close(); setReading(false); refreshPersonal(); readButton.current?.focus(); };
  const handleSceneData = useCallback((data: SceneData) => { setPeople(data.people); setPeopleError(""); refreshPersonal(); }, [refreshPersonal]);
  const handleRitual = useCallback((event: RitualEvent) => setRitual(event), []);
  const handleDecisionModeChange = useCallback((mode: DecisionMode) => { setDecisionMode(mode); setRitual(null); }, []);
  const loadPeopleIntoScene = useCallback(() => {
    try {
      const groups = groupRelationships(loadRelationships());
      setPeople(groups.map(({ latest }) => ({ id: latest.id, name: latest.targetName, risk: latest.risk_level })));
      setPeopleError("");
    } catch (error) { setPeopleError(error instanceof Error ? error.message : "无法读取关系档案。"); }
  }, []);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && !reading) setEntered(false); };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [reading]);
  useEffect(() => { if (reading) dialog.current?.showModal(); }, [reading]);
  useEffect(() => { loadPeopleIntoScene(); }, [loadPeopleIntoScene]);
  useEffect(() => {
    if (!personal.profile) { setBirthDate(""); setBirthHour(""); return; }
    const { year, month, day, hour } = personal.profile;
    setBirthDate(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    setBirthHour(hour === null || hour === undefined ? "" : String(hour));
  }, [personal.profile]);

  const openCurrentModule = () => {
    if (activeModule === "relationships") loadPeopleIntoScene();
    openReader();
  };
  const openArchive = () => openReader("archive");
  const saveBirthDate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const [year, month, day] = birthDate.split("-").map(Number);
    if (!year || !month || !day) return;
    personal.saveBirthProfile({
      name: personal.profile?.name?.trim() || "我",
      year,
      month,
      day,
      hour: birthHour === "" ? null : Number(birthHour),
    });
  };

  return <main className={styles.sample} data-mode={entered ? "explore" : "welcome"} data-module={activeModule} data-selected-person={selectedPersonId ?? ""} data-ready={ready} data-failed={failed} data-reading={reading} data-reduced-motion={reduced || skipAnimation} data-chart={personal.loading ? "loading" : personal.error ? "error" : currentChart ? "ready" : "empty"} data-pillar={selectedPillar}>
    <div className={styles.halo} aria-hidden="true" />
    <header className={styles.header}>
      <button className={styles.brand} aria-label="返回样板首页" onClick={() => setEntered(false)}>
        <svg viewBox="0 0 42 42" aria-hidden="true"><ellipse cx="21" cy="21" rx="17" ry="9" transform="rotate(-40 21 21)" /><ellipse cx="21" cy="21" rx="17" ry="9" transform="rotate(40 21 21)" /><circle cx="21" cy="21" r="3" /></svg>
        <span>玄境<small>INNER ATLAS</small></span>
      </button>
      {!entered ? <nav className={styles.welcomeNav} aria-label="选择探索空间">
        {(["bazi", "relationships", "decision"] as ExploreModule[]).map((module) => <button key={module} type="button" aria-current={activeModule === module ? "page" : undefined} onClick={() => setActiveModule(module)}>{moduleCopy[module].label}</button>)}
      </nav> : <span className={styles.headerNote}>关于自己，也关于未知。</span>}
      <button type="button" className={styles.textLink} onClick={() => openArchive()}><Archive size={14} />档案 <ArrowUpRight size={14} /></button>
    </header>

    <div className={styles.scene}>
      <SceneBoundary onFailure={() => setFailed(true)}><Instrument entered={entered} reading={reading} reduced={reduced || skipAnimation} module={activeModule} people={people} selectedPersonId={selectedPersonId} ritual={ritual} ritualMode={decisionMode} onReady={() => setReady(true)} onEnter={enter} onActivate={openCurrentModule} onSelectPerson={setSelectedPersonId} /></SceneBoundary>
    </div>

    {!entered && <section className={styles.intro}>
      <p className={styles.kicker}><span /> INNER ATLAS <i /> 自我观测系统</p>
      <h1>万象有迹，<br /><span>观照此刻。</span></h1>
      <p className={styles.description}>探索你与自身、与他人、与此刻的连接。</p>
      <div className={styles.heroActions}>
        {failed ? <a href="/classic" className={styles.primary}>进入命盘阅读 <ArrowUpRight size={18} /></a> : <button className={styles.primary} onClick={enter} disabled={!ready}>{activeModule === "decision" ? "开始问卦" : activeModule === "relationships" ? "探索人际" : "进入命盘"}<ArrowUpRight size={18} /></button>}
        <button type="button" className={styles.secondaryHero} onClick={() => { setActiveModule("decision"); if (failed) openReader("decision"); else setEntered(true); }}>此刻的选择 <ArrowRight size={16} /></button>
      </div>
      {!failed && <button type="button" className={styles.motionSkip} onClick={() => { setSkipAnimation(true); setEntered(true); }}>跳过入场动画</button>}
      <p className={styles.enterHint}>{failed ? "当前设备无法显示三维装置，可使用文字版功能" : ready ? `观测链路已就绪 · 即将进入「${moduleCopy[activeModule].label}」空间` : "正在准备你的探索空间…"}</p>
    </section>}

    {!entered && <div className={styles.objectCaption} aria-hidden="true"><span className={styles.captionLine} /><div><small>OBJECT / 001</small><p>天地之间 · 自我之境</p></div></div>}

    {entered && <>
      <button className={styles.back} onClick={() => setEntered(false)}><ArrowLeft size={16} /> 返回全景</button>
      <nav className={styles.moduleNav} aria-label="玄境空间">
        {(["bazi", "relationships", "decision"] as ExploreModule[]).map((module) => <button key={module} type="button" aria-current={activeModule === module ? "page" : undefined} onClick={() => { setActiveModule(module); if (module === "relationships") loadPeopleIntoScene(); }}><span>{moduleCopy[module].label}</span><small>{moduleCopy[module].short}</small></button>)}
      </nav>
      {activeModule === "bazi" && <section className={styles.chartInfo} aria-label="个人四柱信息">
        <span className={styles.kicker}>01 / SELF · {personal.profile?.name || "我的命盘"}</span>
        <h1>{currentChart ? dayUncertain ? "日主待确认" : `${currentChart.user_reading.day_master} · ${currentChart.user_reading.day_master_element}` : "从出生时刻开始"}</h1>
        <form className={styles.birthForm} onSubmit={saveBirthDate} aria-label="填写出生资料并排盘">
          <label className={styles.birthField}><span>公历出生日期</span><input required type="date" min="1900-01-01" max="2100-12-31" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} /></label>
          <label className={styles.birthField}><span>时辰 · 选填</span><select value={birthHour} onChange={(event) => setBirthHour(event.target.value)}><option value="">未知</option>{Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{String(hour).padStart(2, "0")}:00</option>)}</select></label>
          <button className={styles.birthSubmit} type="submit" disabled={!birthDate || personal.loading}>{personal.loading ? <span className={styles.loadingMark} aria-hidden="true" /> : <CalendarDays size={15} />}<span>{personal.loading ? "正在排盘" : currentChart && !birthDraftChanged ? "更新四柱" : "生成四柱"}</span><ArrowRight size={15} aria-hidden="true" /></button>
        </form>
        <p className={styles.birthHint} aria-live="polite">{personal.loading ? "正在计算四柱…" : birthDraftChanged ? "出生资料已修改，原结果已暂时收起；点击生成四柱后更新。" : personal.error || "个人资料仅保存在本机。时辰未知时，时柱会明确标注。"}</p>
        <div className={styles.pillarGrid} role="group" aria-label="四柱结果">
          {plates.map((plate) => <button key={plate.key} type="button" disabled={!currentChart} aria-pressed={Boolean(currentChart) && selectedPillar === plate.key} onClick={() => setSelectedPillar(plate.key)}>
            <span>{plate.label}</span>
            <strong>{!currentChart ? personal.error ? "暂不可用" : "待排" : plate.uncertain ? "待确认" : plate.value || "未知"}</strong>
            <small>{!currentChart ? personal.error ? "检查排盘服务" : "填写生日" : plate.uncertain ? "时间交界" : plate.key === "hour" && !plate.value ? "时辰未知" : "查看详情"}</small>
          </button>)}
        </div>
        <div className={styles.pillarDetails} aria-live="polite" data-pillar-value={currentPlate.uncertain ? "未定" : currentPlate.value || "待补"}>
          {currentChart ? <>
            <h2>{currentPlate.label}<span>{currentPlate.uncertain ? "未定" : currentPlate.value || "时辰未知"}</span></h2>
            {currentPlate.uncertain ? <p>可能为 {options.join(" / ")}。出生时刻未知，此柱暂不确定。</p> : position ? <>
              <p className={styles.pillarBasis}>天干属{position.stem_element} · 地支属{position.branch_element}</p>
              <p>十神：{position.ten_god}{dayUncertain ? "（按参考日柱计算）" : ""}</p>
              <p>{position.explanation}</p>
              <p className={styles.hiddenStems}>藏干：{hidden?.stems.map((stem) => `${stem.stem} · ${stem.element}`).join("、") || "未提供"}</p>
            </> : <p>尚未填写出生时辰，时柱留空。可以在命盘阅读中补充资料。</p>}
            {currentChart.user_time_uncertainty && <p className={styles.chartNote}>{currentChart.user_time_uncertainty.note}</p>}
            {currentChart.user_reading.minute_sensitive_note && <p className={styles.chartNote}>{currentChart.user_reading.minute_sensitive_note}</p>}
          </> : <p role="status">{personal.loading ? "正在读取你的排盘结果…" : birthDraftChanged ? "资料已更改，生成新排盘后这里会显示对应说明。" : personal.error || "填写出生日期并生成四柱后，可点选四柱查看说明。"}</p>}
          {personal.error && <button className={styles.retry} onClick={personal.retry}>重新读取命盘</button>}
        </div>
      </section>}
      {activeModule === "relationships" && <section className={styles.moduleInfo} aria-live="polite">
        <span className={styles.kicker}>02 / RELATIONSHIPS · 人际星图</span>
        <h1>{currentCopy.title}</h1><p>{peopleError || currentCopy.description}</p>
        {selectedPerson && <span className={styles.personRisk}>风险参考 · {selectedPerson.risk === "RED" ? "利益设防" : selectedPerson.risk === "GREEN" ? "深度同盟" : "公事公办"}</span>}
        {!selectedPerson && people.length === 0 && <span className={styles.personRisk}>星图节点仅代表已保存档案 · 当前尚无关系人</span>}
        {people.length > 0 && <div className={styles.personChoices} role="group" aria-label="选择星图人物">{people.map((person) => <button key={person.id} type="button" aria-pressed={selectedPersonId === person.id} onClick={() => setSelectedPersonId(person.id)}>{person.name}</button>)}</div>}
        {selectedPerson && <button type="button" className={styles.nodeAction} onClick={() => openReader()}>查看 {selectedPerson.name} 的关系档案 <ArrowUpRight size={15} /></button>}
      </section>}
      {activeModule === "decision" && <div className={styles.decisionQuick}>
        <DecisionQuick presentation="scene" initialMode={decisionMode} onModeChange={handleDecisionModeChange} onRitual={handleRitual} animateRitual={!reduced && !skipAnimation && !failed} onOpenDetails={() => openReader("decision")} />
      </div>}
      <div className={`${styles.openReading} ${activeModule === "decision" ? styles.decisionDetails : ""}`}><span>{activeModule === "bazi" ? "天地人 · 命盘" : activeModule === "relationships" ? <><UsersRound size={15} /> 关系脉络 · 人物星图</> : <><WandSparkles size={15} /> 灵感决策 · 本机记录</>}</span><button ref={readButton} className={styles.primary} onClick={activeModule === "decision" ? () => openReader("decision") : openCurrentModule}>{currentCopy.action} <MoveUpRight size={18} /></button><small>{activeModule === "relationships" ? "选择人物节点 · 拖动观察 · 按 ESC 返回" : activeModule === "decision" ? "本机记录、规则说明与完整阅读面板" : "拖动装置观察 · 按 ESC 返回"}</small></div>
    </>}

    <footer className={styles.footer}>
      {!entered ? <span className={styles.footerNote}>命盘 · 人际脉络 · 此刻选择</span> : <span className={styles.footerNote}>每一种解读，都是认识自己的另一种角度。</span>}
      <span className={styles.footerRight}>EXPLORE WITHIN <span>↗</span></span>
    </footer>

    <dialog ref={dialog} className={styles.reader} aria-labelledby="sample-reader-title" onCancel={(event) => { event.preventDefault(); close(); }} onClose={() => setReading(false)}>
      <header className={styles.readerHeader}><div><small>INNER ATLAS / {readerTab.toUpperCase()}</small><h2 id="sample-reader-title">{readerTab === "bazi" ? "命盘阅读" : readerTab === "relationships" ? "人际关系" : readerTab === "decision" ? "问卦与选择" : "我的档案"}</h2></div><button autoFocus aria-label="关闭阅读面板" onClick={close}><X size={20} /></button></header>
      <div className={styles.readerBody}>{reading && <Workspace embedded requestedTab={readerTab} requestSerial={workspaceSerial} requestedPersonId={readerTab === "relationships" ? selectedPersonId : null} onSceneData={handleSceneData} onRitual={handleRitual} animateRitual={!reduced && !failed} />}</div>
    </dialog>
  </main>;
}
