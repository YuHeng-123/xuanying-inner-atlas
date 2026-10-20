"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { DecisionMode, RitualEvent, ScenePerson } from "../experience/experienceTypes";

export type ExploreModule = "bazi" | "relationships" | "decision";
type Props = { entered: boolean; reading: boolean; reduced: boolean; module: ExploreModule; people: ScenePerson[]; selectedPersonId: string | null; ritual: RitualEvent | null; ritualMode: DecisionMode; onReady: () => void; onEnter: () => void; onActivate: () => void; onSelectPerson: (id: string) => void };

function engravedDial(labels: string, innerRatio: number) {
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 2048;
  const c = canvas.getContext("2d")!;
  c.translate(1024, 1024); c.strokeStyle = "#8fbfdf"; c.fillStyle = "#e0edff";
  c.textAlign = "center"; c.textBaseline = "middle";
  const count = labels.length * 10;
  const inner = 1024 * innerRatio;
  const textRadius = inner + (1024 - inner) * .42;
  for (let i = 0; i < count; i++) {
    c.save(); c.rotate(i / count * Math.PI * 2);
    const long = i % 10 === 0;
    c.lineWidth = long ? 3 : 1.5;
    c.globalAlpha = long ? .9 : .48;
    c.beginPath(); c.moveTo(0, -1000); c.lineTo(0, long ? -972 : -985); c.stroke();
    c.restore();
  }
  for (let i = 0; i < labels.length; i++) {
    const angle = i / labels.length * Math.PI * 2;
    c.save(); c.translate(Math.sin(angle) * textRadius, -Math.cos(angle) * textRadius);
    // Keep the lower half readable when the instrument faces the viewer.
    c.rotate(angle > Math.PI / 2 && angle < Math.PI * 1.5 ? angle + Math.PI : angle);
    c.font = "500 62px Microsoft YaHei"; c.globalAlpha = 1;
    c.shadowColor = "#030606"; c.shadowOffsetY = 2; c.shadowBlur = 2;
    c.fillText(labels[i], 0, 0); c.restore();
  }
  c.globalAlpha = .32; c.lineWidth = 1.5;
  for (const r of [inner + 5, 1012]) { c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke(); }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function brushedSurface() {
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 256;
  const c = canvas.getContext("2d")!;
  const image = c.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const grain = 128 + Math.sin(y * 91.7) * 17 + Math.sin(x * 47.1 + y * 71.2) * 6;
    const p = (y * 256 + x) * 4;
    image.data[p] = image.data[p + 1] = image.data[p + 2] = grain; image.data[p + 3] = 255;
  }
  c.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas); texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3); return texture;
}

function metalRing(outer: number, inner: number, depth: number) {
  const shape = new THREE.Shape(); shape.absarc(0, 0, outer, 0, Math.PI * 2, false);
  const hole = new THREE.Path(); hole.absarc(0, 0, inner, 0, Math.PI * 2, true); shape.holes.push(hole);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: .012, bevelSize: .009, bevelSegments: 3, curveSegments: 112, steps: 1 });
  geometry.translate(0, 0, -depth / 2); return geometry;
}

function studioEnvironment() {
  const studio = new THREE.Scene(); studio.background = new THREE.Color("#050a14");
  const cards: [number[], number[], string, number][] = [
    [[0, 1, 5], [6, 2], "#314b68", .85],
    [[-3, 1.5, 4], [2, 5], "#dbeaff", 3.2],
    [[3, .5, 2], [.45, 4], "#70dfff", 2.6],
    [[0, 4, .5], [3, .8], "#e7e3ff", 3.5],
    [[0, -2, -4], [3, 2], "#192a44", 1.35],
  ];
  for (const [position, dimensions, color, brightness] of cards) {
    const card = new THREE.Mesh(new THREE.PlaneGeometry(dimensions[0], dimensions[1]), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(brightness), side: THREE.DoubleSide }));
    card.position.fromArray(position); card.lookAt(0, 0, 0); studio.add(card);
  }
  return studio;
}

function Sculpture({ entered, reduced, onEnter }: Pick<Props, "entered" | "reduced" | "onEnter">) {
  const whole = useRef<THREE.Group>(null); const outer = useRef<THREE.Group>(null); const middle = useRef<THREE.Group>(null); const inner = useRef<THREE.Group>(null);
  const progress = useRef(0); const hover = useRef(false);
  const { pointer, gl } = useThree();
  const resources = useMemo(() => ({ first: metalRing(1.46, 1.24, .09), second: metalRing(1.15, 1.01, .075), branches: engravedDial("子丑寅卯辰巳午未申酉戌亥", 1.246 / 1.454), stems: engravedDial("甲乙丙丁戊己庚辛壬癸", 1.016 / 1.148), brush: brushedSurface() }), []);
  useEffect(() => () => { Object.values(resources).forEach((resource) => resource.dispose()); }, [resources]);
  useFrame((_, dt) => {
    progress.current = reduced ? Number(entered) : THREE.MathUtils.damp(progress.current, Number(entered), 3, Math.min(dt, .05));
    const p = progress.current;
    whole.current!.scale.setScalar(1 - p * .16);
    whole.current!.position.y = p * .2;
    whole.current!.rotation.y = reduced || entered ? 0 : THREE.MathUtils.damp(whole.current!.rotation.y, pointer.x * .14, 4, Math.min(dt, .05));
    whole.current!.rotation.x = reduced || entered ? 0 : THREE.MathUtils.damp(whole.current!.rotation.x, pointer.y * -.08, 4, Math.min(dt, .05));
    outer.current!.rotation.set(-.6 + p * .55, .45 - p * .45, -.18 - p * .25);
    middle.current!.rotation.set(.4 - p * .3, -.55 + p * .5, .42 - p * .7);
    inner.current!.rotation.set(.15 + p * .85, .7 - p * .4, -.2 + p * .35);
    outer.current!.position.z = p * -.42; middle.current!.position.z = p * .25;
  });
  const over = () => { hover.current = true; gl.domElement.style.cursor = entered ? "grab" : "pointer"; };
  const out = () => { hover.current = false; gl.domElement.style.cursor = "default"; };
  const click = (event: ThreeEvent<MouseEvent>) => { if (event.delta < 5) { event.stopPropagation(); onEnter(); } };
  return <group ref={whole} rotation={[0, 0, 0]} onPointerOver={over} onPointerOut={out} onClick={click}>
    <group ref={outer}>
      <mesh geometry={resources.first}><meshPhysicalMaterial color="#526e87" metalness={1} roughness={.2} bumpMap={resources.brush} bumpScale={.0017} envMapIntensity={1.65} clearcoat={.42} /></mesh>
      <mesh position={[0, 0, .064]}><ringGeometry args={[1.246, 1.454, 192]} /><meshBasicMaterial map={resources.branches} transparent opacity={.94} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} /></mesh>
      <mesh position={[0, 0, .049]}><torusGeometry args={[1.455, .012, 8, 192]} /><meshStandardMaterial color="#c1deef" metalness={1} roughness={.15} emissive="#4c91b8" emissiveIntensity={.08} /></mesh>
      <mesh position={[0, 0, -.049]}><torusGeometry args={[1.25, .018, 10, 192]} /><meshStandardMaterial color="#26394f" metalness={.95} roughness={.18} /></mesh>
      {[0, 1, 2, 3].map((i) => <group key={i} rotation={[0, 0, i * Math.PI / 2]}><mesh position={[0, 1.36, -.12]}><boxGeometry args={[.13, .065, .14]} /><meshStandardMaterial color="#272d2c" metalness={.9} roughness={.27} /></mesh><mesh position={[0, 1.36, -.21]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.032, .032, .02, 24]} /><meshStandardMaterial color="#b0b7ae" metalness={1} roughness={.24} /></mesh></group>)}
    </group>
    <group ref={middle}>
      <mesh geometry={resources.second}><meshPhysicalMaterial color="#263c55" metalness={.98} roughness={.19} bumpMap={resources.brush} bumpScale={.0012} clearcoat={.5} envMapIntensity={2.1} /></mesh>
      <mesh position={[0, 0, .057]}><ringGeometry args={[1.016, 1.148, 192]} /><meshBasicMaterial map={resources.stems} transparent opacity={.94} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} /></mesh>
      <mesh position={[0, 0, .057]}><torusGeometry args={[1.016, .007, 8, 160]} /><meshBasicMaterial color="#d5f1ff" /></mesh>
      <mesh position={[0, 0, -.057]}><torusGeometry args={[1.145, .009, 8, 160]} /><meshStandardMaterial color="#87bad6" metalness={1} roughness={.16} /></mesh>
    </group>
    <group ref={inner}>
      <mesh><torusGeometry args={[.89, .026, 12, 160]} /><meshStandardMaterial color="#c7e5f6" metalness={1} roughness={.13} envMapIntensity={2} /></mesh>
      <mesh rotation={[Math.PI / 2, .13, 0]}><torusGeometry args={[.865, .006, 8, 160]} /><meshBasicMaterial color="#6ee3ff" transparent opacity={.68} /></mesh>
      {[0, Math.PI].map((a) => <group key={a} rotation={[0, 0, a]}><mesh position={[0, .87, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.061, .061, .11, 32]} /><meshStandardMaterial color="#646e66" metalness={1} roughness={.2} /></mesh></group>)}
    </group>
    <mesh><sphereGeometry args={[.615, 64, 48]} /><meshPhysicalMaterial color="#a8bad3" metalness={.025} roughness={.07} transmission={.88} thickness={.48} ior={1.48} attenuationColor="#565486" attenuationDistance={.92} envMapIntensity={1.08} clearcoat={1} clearcoatRoughness={.045} /></mesh>
    <mesh rotation={[.35, .2, .1]}><icosahedronGeometry args={[.255, 0]} /><meshStandardMaterial color="#d1d2ef" metalness={.66} roughness={.14} envMapIntensity={1.9} emissive="#7868d8" emissiveIntensity={.3} /></mesh>
    <mesh rotation={[.4, .25, -.1]}><torusGeometry args={[.39, .006, 8, 120]} /><meshBasicMaterial color="#e0f5ff" /></mesh>
    <mesh rotation={[-.7, .4, .2]}><torusGeometry args={[.455, .004, 8, 120]} /><meshBasicMaterial color="#9fe2ff" /></mesh>
    {[0, 1, 2, 3, 4, 5].map((i) => { const a = i * Math.PI / 3; return <mesh key={i} position={[Math.cos(a) * .74, Math.sin(a) * .74, 0]}><sphereGeometry args={[.016, 12, 8]} /><meshBasicMaterial color="#c7eeff" /></mesh>; })}
  </group>;
}

function relationshipPoint(index: number, count: number): [number, number, number] {
  const angle = Math.PI * 2 * index / Math.max(count, 1) - Math.PI / 2;
  return [Math.cos(angle) * 1.48, Math.sin(angle) * .96, Math.sin(angle * 2) * .09];
}

function textTexture(text: string, color = "#e5edfa") {
  const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 144;
  const c = canvas.getContext("2d")!;
  c.clearRect(0, 0, canvas.width, canvas.height);
  c.fillStyle = "rgba(5,12,23,.9)"; c.strokeStyle = "rgba(111,202,235,.68)"; c.lineWidth = 2;
  c.beginPath(); c.roundRect(3, 3, 506, 138, 28); c.fill(); c.stroke();
  c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = color;
  c.font = "500 48px Microsoft YaHei, sans-serif"; c.fillText(text.slice(0, 8), 256, 72);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
  return texture;
}

function LabelSprite({ text, position, scale, color }: { text: string; position: [number, number, number]; scale: [number, number, number]; color?: string }) {
  const label = useMemo(() => textTexture(text, color), [text, color]);
  useEffect(() => () => label.dispose(), [label]);
  return <sprite position={position} scale={scale}><spriteMaterial map={label} transparent depthTest={false} /></sprite>;
}

function Beam({ start, end, color, opacity = .52 }: { start: [number, number, number]; end: [number, number, number]; color: string; opacity?: number }) {
  const vector = useMemo(() => new THREE.Vector3(...end).sub(new THREE.Vector3(...start)), [end, start]);
  const midpoint = useMemo(() => new THREE.Vector3(...start).add(new THREE.Vector3(...end)).multiplyScalar(.5), [end, start]);
  const quaternion = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vector.clone().normalize()), [vector]);
  return <mesh position={midpoint} quaternion={quaternion}><cylinderGeometry args={[.007, .007, vector.length(), 8]} /><meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} /></mesh>;
}

function RelationshipNode({ person, position, selected, onSelect }: { person: ScenePerson; position: [number, number, number]; selected: boolean; onSelect: () => void }) {
  const group = useRef<THREE.Group>(null); const { gl } = useThree();
  const color = person.risk === "RED" ? "#e592b6" : person.risk === "GREEN" ? "#69dff2" : "#b5b2ff";
  const label = useMemo(() => textTexture(person.name, selected ? "#f0fbff" : "#cedef0"), [person.name, selected]);
  useEffect(() => () => label.dispose(), [label]);
  useFrame((_, dt) => { if (group.current) group.current.scale.lerp(new THREE.Vector3(selected ? 1.18 : 1, selected ? 1.18 : 1, selected ? 1.18 : 1), 1 - Math.exp(-dt * 8)); });
  return <group ref={group} position={position} onClick={(event) => { event.stopPropagation(); onSelect(); }} onPointerOver={() => { gl.domElement.style.cursor = "pointer"; }} onPointerOut={() => { gl.domElement.style.cursor = "grab"; }}>
    <mesh><sphereGeometry args={[selected ? .105 : .078, 28, 20]} /><meshPhysicalMaterial color={color} emissive={color} emissiveIntensity={selected ? .8 : .24} metalness={.26} roughness={.18} clearcoat={1} /></mesh>
    <mesh rotation={[0, 0, .12]}><torusGeometry args={[.16, .008, 8, 48]} /><meshBasicMaterial color={selected ? "#e5d6af" : color} transparent opacity={selected ? .9 : .48} /></mesh>
    <sprite position={[0, -.28, .02]} scale={[.68, .19, 1]}><spriteMaterial map={label} transparent depthTest={false} /></sprite>
  </group>;
}

function RelationshipWorld({ people, selectedPersonId, onSelectPerson }: Pick<Props, "people" | "selectedPersonId" | "onSelectPerson">) {
  const orbit = useRef<THREE.Group>(null);
  const points = useMemo(() => people.map((_, index) => relationshipPoint(index, people.length)), [people]);
  useFrame((_, dt) => { if (orbit.current) orbit.current.rotation.z = THREE.MathUtils.damp(orbit.current.rotation.z, 0, 2, dt); });
  return <group position={[0, .06, 0]}>
    <mesh rotation={[0, 0, 0]}><ringGeometry args={[1.16, 1.18, 160]} /><meshBasicMaterial color="#83c8e9" transparent opacity={.15} side={THREE.DoubleSide} /></mesh>
    <mesh rotation={[0, 0, .2]}><torusGeometry args={[1.52, .008, 8, 160]} /><meshStandardMaterial color="#7d9db8" metalness={.94} roughness={.19} transparent opacity={.62} /></mesh>
    <mesh rotation={[.06, .15, -.12]}><torusGeometry args={[1.74, .004, 8, 180]} /><meshBasicMaterial color="#6edfff" transparent opacity={.42} /></mesh>
    <group ref={orbit}>
      {people.map((person, index) => <Beam key={`beam-${person.id}`} start={[0, 0, 0]} end={points[index]} color={person.risk === "RED" ? "#e592b6" : person.risk === "GREEN" ? "#69dff2" : "#b5b2ff"} opacity={selectedPersonId === person.id ? .9 : .42} />)}
      {people.map((person, index) => <RelationshipNode key={person.id} person={person} position={points[index]} selected={selectedPersonId === person.id} onSelect={() => onSelectPerson(person.id)} />)}
    </group>
    <mesh><sphereGeometry args={[.37, 48, 32]} /><meshPhysicalMaterial color="#a7d6f4" metalness={.08} roughness={.06} transmission={.9} thickness={.4} ior={1.42} clearcoat={1} /></mesh>
    <mesh rotation={[.3, .4, .2]}><torusGeometry args={[.53, .012, 10, 96]} /><meshStandardMaterial color="#d4e8f7" metalness={1} roughness={.14} /></mesh>
    <mesh rotation={[-.2, .1, -.25]}><torusGeometry args={[.69, .005, 8, 120]} /><meshBasicMaterial color="#70e2ff" transparent opacity={.66} /></mesh>
    <mesh rotation={[0, 0, Math.PI / 4]}><torusGeometry args={[.93, .003, 8, 120]} /><meshBasicMaterial color="#b8c8ff" transparent opacity={.34} /></mesh>
    {people.length === 0 && Array.from({ length: 12 }, (_, index) => { const position = relationshipPoint(index, 12); return <mesh key={index} position={position}><sphereGeometry args={[.018, 12, 8]} /><meshBasicMaterial color="#a9e5fa" transparent opacity={.56} /></mesh>; })}
  </group>;
}

function createJiaoBeiGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-.48, -.09);
  shape.bezierCurveTo(-.62, .12, -.4, .39, 0, .42);
  shape.bezierCurveTo(.4, .39, .62, .12, .48, -.09);
  shape.bezierCurveTo(.31, .04, .14, .14, 0, .095);
  shape.bezierCurveTo(-.14, .14, -.31, .04, -.48, -.09);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: .2, bevelEnabled: true, bevelThickness: .032, bevelSize: .026, bevelSegments: 5, curveSegments: 32 });
  geometry.translate(0, 0, -.085);
  return geometry;
}

function createCopperCoinGeometry() {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, .29, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.moveTo(-.08, -.08); hole.lineTo(-.08, .08); hole.lineTo(.08, .08); hole.lineTo(.08, -.08); hole.closePath();
  shape.holes.push(hole);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: .075, bevelEnabled: true, bevelThickness: .012, bevelSize: .01, bevelSegments: 4, curveSegments: 56 });
  geometry.translate(0, 0, -.0325);
  return geometry;
}

function RitualWorld({ ritual, ritualMode, onActivate }: Pick<Props, "ritual" | "ritualMode" | "onActivate">) {
  const table = useRef<THREE.Group>(null);
  const started = useRef(0);
  const coinGroups = useRef<Array<THREE.Group | null>>([]);
  const cupGroups = useRef<Array<THREE.Group | null>>([]);
  const lotBucket = useRef<THREE.Group>(null);
  const lotStick = useRef<THREE.Group>(null);
  const { gl, size } = useThree();
  const compact = size.width < 480;
  const geometry = useMemo(() => ({ cups: createJiaoBeiGeometry(), coin: createCopperCoinGeometry(), base: new THREE.CylinderGeometry(1.72, 1.84, .34, 112), surface: new THREE.CylinderGeometry(1.61, 1.61, .12, 112) }), []);
  useEffect(() => () => { geometry.cups.dispose(); geometry.coin.dispose(); geometry.base.dispose(); geometry.surface.dispose(); }, [geometry]);
  const eventMatchesMode = ritualMode === "hexagram" ? ritual?.kind === "coins" : ritual?.kind === ritualMode;
  useEffect(() => { started.current = eventMatchesMode ? performance.now() : 0; }, [ritual, eventMatchesMode]);
  useFrame((_, dt) => {
    if (table.current) table.current.rotation.y = THREE.MathUtils.damp(table.current.rotation.y, eventMatchesMode ? .025 : 0, 3, dt);
    const duration = ritualMode === "lot" ? 2800 : 1500;
    const elapsed = started.current ? (performance.now() - started.current) / duration : 1;
    const progress = THREE.MathUtils.clamp(elapsed, 0, 1);
    coinGroups.current.forEach((group, index) => {
      if (!group) return;
      const activeCoins = ritualMode === "hexagram" && ritual?.kind === "coins" ? ritual.coins : null;
      const heads = activeCoins?.[index] ?? false;
      const targetFlip = activeCoins ? (heads ? 0 : Math.PI) : 0;
      const spins = activeCoins && progress < 1 ? Math.sin(progress * Math.PI * 4 + index * .3) * (1 - progress) * 5 : 0;
      group.rotation.x = targetFlip * progress;
      group.rotation.z = spins;
      group.position.y = -.59 + (activeCoins && progress < 1 ? Math.sin(progress * Math.PI) * .48 : 0);
    });
    cupGroups.current.forEach((group, index) => {
      if (!group) return;
      const faces = ritualMode === "cups" && ritual?.kind === "cups" ? ritual.faces : null;
      const flip = faces?.[index] === "凸面" ? Math.PI : 0;
      const tumble = faces && progress < 1 ? Math.sin(progress * Math.PI * 5 + index) * (1 - progress) * 1.8 : 0;
      group.rotation.x = flip * progress + tumble;
    });
    if (lotBucket.current) {
      const activeLot = ritualMode === "lot" && ritual?.kind === "lot";
      const shake = activeLot && progress < .78 ? 1 - progress / .78 : 0;
      lotBucket.current.rotation.z = Math.sin(progress * Math.PI * 24) * shake * .12;
      lotBucket.current.rotation.x = Math.cos(progress * Math.PI * 19) * shake * .07;
    }
    if (lotStick.current) {
      const activeLot = ritualMode === "lot" && ritual?.kind === "lot";
      lotStick.current.visible = Boolean(activeLot);
      const pull = activeLot ? THREE.MathUtils.smoothstep(progress, .48, 1) : 0;
      lotStick.current.position.set(Math.sin(progress * Math.PI * 8) * .025 * (1 - pull), .18 + pull * .34, .36 + pull * .34);
      lotStick.current.rotation.set(.12 * (1 - pull), 0, .72 * pull);
    }
  });
  const activeCoins = ritualMode === "hexagram" && ritual?.kind === "coins" ? ritual.coins : null;
  const activeLines = ritualMode === "hexagram" && ritual?.kind === "coins" ? ritual.lines ?? [] : [];
  const cupFaces = ritualMode === "cups" && ritual?.kind === "cups" ? ritual.faces : null;
  const choiceOptions = ritualMode === "choice" && ritual?.kind === "choice" ? ritual.options ?? [] : ["选项 A", "选项 B"];
  const selectedChoice = ritualMode === "choice" && ritual?.kind === "choice" ? ritual.selection : "";
  return <group position={[0, compact ? .3 : -.05, 0]} scale={compact ? .83 : .91} rotation={[-.3, 0, 0]} onClick={(event) => { event.stopPropagation(); onActivate(); }} onPointerOver={() => { gl.domElement.style.cursor = "pointer"; }} onPointerOut={() => { gl.domElement.style.cursor = "grab"; }}>
    <group ref={table}>
      <mesh geometry={geometry.base} position={[0, -1.01, -.04]}><meshPhysicalMaterial color="#111b2c" metalness={.9} roughness={.2} clearcoat={1} clearcoatRoughness={.12} /></mesh>
      <mesh geometry={geometry.surface} position={[0, -.785, -.04]}><meshPhysicalMaterial color="#1d3048" metalness={.92} roughness={.16} clearcoat={1} clearcoatRoughness={.1} /></mesh>
      <mesh position={[0, -.716, -.04]}><boxGeometry args={[3.25, .018, 1.7]} /><meshStandardMaterial color="#0b1321" metalness={.58} roughness={.32} /></mesh>
      <mesh position={[0, -.704, -.04]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.48, .012, 10, 112]} /><meshStandardMaterial color="#73d9f4" metalness={1} roughness={.16} emissive="#3ea6d4" emissiveIntensity={.12} /></mesh>
      <mesh position={[0, -.701, -.04]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.28, .006, 8, 112]} /><meshBasicMaterial color="#9c9bff" transparent opacity={.76} /></mesh>

      {ritualMode === "cups" && <>
        {[-1, 1].map((side, index) => <group key={`jiaobei-${index}`} ref={(node) => { cupGroups.current[index] = node; }} position={[side * .62, -.39, .2]} rotation={[0, 0, side * .16]} scale={.88}>
          <mesh geometry={geometry.cups}><meshPhysicalMaterial color={index === 0 ? "#315c7d" : "#263d65"} metalness={.5} roughness={.22} clearcoat={.94} clearcoatRoughness={.12} /></mesh>
          <mesh position={[-.35, .01, .105]}><sphereGeometry args={[.026, 16, 12]} /><meshStandardMaterial color="#a5e9fb" metalness={.9} roughness={.16} emissive="#3dbada" emissiveIntensity={.16} /></mesh>
          <mesh position={[.35, .01, .105]}><sphereGeometry args={[.026, 16, 12]} /><meshStandardMaterial color="#a5e9fb" metalness={.9} roughness={.16} emissive="#3dbada" emissiveIntensity={.16} /></mesh>
          <LabelSprite text={cupFaces ? cupFaces[index] === "平面" ? "平" : "凸" : index === 0 ? "平" : "凸"} position={[0, -.045, .116]} scale={[.14, .09, 1]} color="#eef8ff" />
        </group>)}
        <mesh position={[0, -.61, .08]}><boxGeometry args={[2.12, .045, 1.02]} /><meshPhysicalMaterial color="#14243b" metalness={.7} roughness={.22} clearcoat={.92} /></mesh>
        <mesh position={[0, -.584, .08]}><boxGeometry args={[1.96, .008, .86]} /><meshStandardMaterial color="#0a111d" metalness={.4} roughness={.35} /></mesh>
        {[-.9, .9].map((x) => <mesh key={`cup-rest-${x}`} position={[x, -.59, .08]}><boxGeometry args={[.035, .08, .72]} /><meshStandardMaterial color="#6acfe9" metalness={.96} roughness={.16} /></mesh>)}
        <LabelSprite text="圣杯 · 掷筊" position={[0, -.48, .63]} scale={[.55, .12, 1]} color="#dff5ff" />
      </>}

      {ritualMode === "lot" && <>
        <group ref={lotBucket} position={[0, -.16, .08]}>
          <mesh><cylinderGeometry args={[.39, .48, .98, 64, 1, true]} /><meshPhysicalMaterial color="#1e4c6b" metalness={.78} roughness={.18} clearcoat={1} clearcoatRoughness={.1} side={THREE.DoubleSide} /></mesh>
          <mesh position={[0, -.48, 0]}><cylinderGeometry args={[.47, .47, .055, 64]} /><meshPhysicalMaterial color="#3b6387" metalness={.98} roughness={.16} /></mesh>
          <mesh position={[0, -.36, 0]}><torusGeometry args={[.466, .018, 10, 64]} /><meshStandardMaterial color="#90d8f0" metalness={.98} roughness={.15} /></mesh>
          <mesh position={[0, .36, 0]}><torusGeometry args={[.414, .014, 10, 64]} /><meshStandardMaterial color="#71cbe6" metalness={.9} roughness={.18} /></mesh>
          <mesh position={[0, .48, 0]}><torusGeometry args={[.405, .035, 14, 64]} /><meshPhysicalMaterial color="#c9e6f6" metalness={1} roughness={.13} clearcoat={1} emissive="#4eabcf" emissiveIntensity={.08} /></mesh>
          <mesh position={[0, .475, 0]}><circleGeometry args={[.36, 64]} /><meshBasicMaterial color="#0a111d" side={THREE.DoubleSide} /></mesh>
          {Array.from({ length: 10 }, (_, index) => {
            const angle = index * Math.PI * 2 / 10;
            return <mesh key={`lot-rib-${index}`} position={[Math.sin(angle) * .414, -.015, Math.cos(angle) * .414]} rotation={[0, angle, 0]}>
              <boxGeometry args={[.014, .65, .018]} />
              <meshStandardMaterial color="#72b9d6" metalness={.86} roughness={.21} />
            </mesh>;
          })}
          {Array.from({ length: 15 }, (_, index) => {
            const angle = index * 2.399;
            const radius = .06 + (index % 4) * .064;
            const height = .76 + (index % 3) * .075;
            return <mesh key={`lot-stick-${index}`} position={[Math.cos(angle) * radius, .34 + (index % 4) * .025, Math.sin(angle) * radius]} rotation={[Math.sin(angle) * .18, 0, Math.cos(angle) * .16]}>
              <boxGeometry args={[.024, height, .024]} />
              <meshStandardMaterial color={index % 4 === 0 ? "#d5efff" : "#70b7dc"} metalness={.62} roughness={.24} />
            </mesh>;
          })}
          <mesh position={[0, -.18, .485]}><boxGeometry args={[.16, .22, .022]} /><meshPhysicalMaterial color="#476b91" metalness={.9} roughness={.18} /></mesh>
          <LabelSprite text="签" position={[0, -.18, .505]} scale={[.095, .1, 1]} color="#e5f6ff" />
        </group>
        <group ref={lotStick} position={[0, .18, .36]} visible={false}>
          <mesh><boxGeometry args={[.035, .88, .026]} /><meshStandardMaterial color="#c7eaff" metalness={.58} roughness={.2} /></mesh>
          <mesh position={[0, .08, .022]}><boxGeometry args={[.19, .23, .014]} /><meshPhysicalMaterial color="#1b3552" metalness={.86} roughness={.18} /></mesh>
          <LabelSprite text={`第${ritual?.kind === "lot" ? ritual.lotNumber ?? "—" : "—"}签`} position={[0, .08, .033]} scale={[.17, .07, 1]} color="#f2f8ff" />
        </group>
        <LabelSprite text="签筒抽签" position={[0, -.53, .67]} scale={[.52, .12, 1]} color="#dff5ff" />
      </>}

      {ritualMode === "hexagram" && <>
        {[-.78, -.05, .68].map((x, index) => {
          const heads = activeCoins?.[index] ?? false;
          return <group key={`copper-coin-${index}`} ref={(node) => { coinGroups.current[index] = node; }} position={[x, -.59, .2]}>
            <group rotation={[-Math.PI / 2, 0, 0]}>
              <mesh geometry={geometry.coin}><meshPhysicalMaterial color="#a67a43" metalness={.9} roughness={.22} clearcoat={1} clearcoatRoughness={.13} /></mesh>
              <mesh position={[0, 0, .042]}><torusGeometry args={[.25, .014, 8, 56]} /><meshStandardMaterial color="#e0c483" metalness={1} roughness={.16} /></mesh>
              <LabelSprite text={activeCoins ? heads ? "花" : "字" : "卦"} position={[0, 0, .044]} scale={[.16, .13, 1]} color="#f1e3bb" />
            </group>
          </group>;
        })}
        <group position={[1.18, -.13, -.24]}>
          <mesh><boxGeometry args={[.82, 1.04, .085]} /><meshPhysicalMaterial color="#26382f" metalness={.68} roughness={.27} clearcoat={.9} /></mesh>
          <mesh position={[0, 0, .05]}><boxGeometry args={[.7, .91, .012]} /><meshStandardMaterial color="#111a16" metalness={.38} roughness={.32} /></mesh>
          <LabelSprite text="六爻" position={[0, .39, .06]} scale={[.22, .11, 1]} color="#e0c483" />
          {Array.from({ length: 6 }, (_, index) => {
            const line = activeLines[5 - index];
            const yang = line === 7 || line === 9;
            const moving = line === 6 || line === 9;
            const color = line ? moving ? "#e0c57e" : "#a8b8a8" : "#48564c";
            return <group key={`hex-line-${index}`} position={[0, .22 - index * .115, .058]}>
              {yang ? <mesh><boxGeometry args={[.42, .028, .014]} /><meshStandardMaterial color={color} emissive={moving ? color : "#000000"} emissiveIntensity={moving ? .18 : 0} /></mesh> : <>
                <mesh position={[-.125, 0, 0]}><boxGeometry args={[.17, .028, .014]} /><meshStandardMaterial color={color} emissive={moving ? color : "#000000"} emissiveIntensity={moving ? .18 : 0} /></mesh>
                <mesh position={[.125, 0, 0]}><boxGeometry args={[.17, .028, .014]} /><meshStandardMaterial color={color} emissive={moving ? color : "#000000"} emissiveIntensity={moving ? .18 : 0} /></mesh>
              </>}
            </group>;
          })}
        </group>
        <LabelSprite text="三枚铜钱 · 六爻" position={[.2, -.57, .63]} scale={[.68, .12, 1]} color="#d9cfb1" />
      </>}

      {ritualMode === "choice" && choiceOptions.map((option, index) => {
        const x = (index - (choiceOptions.length - 1) / 2) * .62;
        const chosen = option === selectedChoice;
        return <group key={`${option}-${index}`} position={[x, -.56, .18]}>
          <mesh><cylinderGeometry args={[.22, .22, .08, 48]} /><meshPhysicalMaterial color={chosen ? "#c2a66c" : "#38463f"} metalness={.9} roughness={.2} clearcoat={.9} emissive={chosen ? "#74603a" : "#07110e"} emissiveIntensity={chosen ? .35 : .05} /></mesh>
          <LabelSprite text={option} position={[0, .16, .02]} scale={[.42, .11, 1]} color={chosen ? "#f4e6c4" : "#c2c8bb"} />
        </group>;
      })}
    </group>
  </group>;
}
function Stage(props: Props) {
  const { camera, gl, scene, invalidate, size } = useThree();
  const compact = size.width < 480;
  const controls = useRef<OrbitControls>(); const sceneRoot = useRef<THREE.Group>(null); const duration = useRef(0); const settleUntil = useRef(0);
  const target = useRef(new THREE.Vector3(0, .06, 6.1));
  useEffect(() => {
    const generator = new THREE.PMREMGenerator(gl); const studio = studioEnvironment();
    const texture = generator.fromScene(studio, .025); scene.environment = texture.texture; scene.environmentIntensity = .85;
    studio.traverse((node) => { if (node instanceof THREE.Mesh) { node.geometry.dispose(); (node.material as THREE.Material).dispose(); } }); generator.dispose();
    const orbit = new OrbitControls(camera, gl.domElement); controls.current = orbit;
    orbit.enablePan = false; orbit.enableDamping = true; orbit.dampingFactor = .13;
    orbit.enableZoom = false; orbit.rotateSpeed = .45; orbit.minPolarAngle = .8; orbit.maxPolarAngle = 2.2;
    const changed = () => invalidate();
    orbit.addEventListener("change", changed); props.onReady(); invalidate();
    return () => { orbit.removeEventListener("change", changed); orbit.dispose(); texture.dispose(); scene.environment = null; };
    // The stage owns these resources for the lifetime of this canvas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, gl, scene, invalidate]);
  useEffect(() => {
    if (controls.current) { controls.current.enabled = false; controls.current.reset(); }
    const cameraTarget = props.entered && props.module === "decision" ? [0, compact ? 1.35 : 1.8, 5.55] : [0, props.entered ? .05 : .06, props.entered ? 5.3 : 6.1];
    target.current.set(cameraTarget[0], cameraTarget[1], cameraTarget[2]);
    if (compact && !(props.entered && props.module === "decision")) target.current.z += .6;
    if (props.reduced) camera.position.copy(target.current);
    settleUntil.current = props.reduced ? 0 : performance.now() + 1800;
    duration.current = performance.now() + 2800;
    invalidate();
  }, [props.entered, props.reading, props.reduced, props.module, compact, camera, invalidate]);
  useEffect(() => {
    if (!sceneRoot.current) return;
    if (props.reduced) { sceneRoot.current.scale.setScalar(1); invalidate(); return; }
    const tween = gsap.fromTo(sceneRoot.current.scale, { x: .94, y: .94, z: .94 }, {
      x: 1, y: 1, z: 1, duration: .85, ease: "power3.out", overwrite: true, onUpdate: invalidate,
    });
    return () => { tween.kill(); };
  }, [props.entered, props.module, props.reduced, invalidate]);
  useEffect(() => { duration.current = performance.now() + (props.ritual?.kind === "lot" ? 3000 : 2200); invalidate(); }, [props.module, props.people, props.selectedPersonId, props.ritual, props.ritualMode, invalidate]);
  useEffect(() => {
    let id = 0, timer: ReturnType<typeof setTimeout>;
    const wake = () => { duration.current = performance.now() + 1300; };
    const render = () => {
      if (!document.hidden && performance.now() < duration.current) invalidate();
      timer = setTimeout(() => { id = requestAnimationFrame(render); }, 33);
    };
    gl.domElement.addEventListener("pointermove", wake); gl.domElement.addEventListener("pointerdown", wake); gl.domElement.addEventListener("pointerup", wake);
    render(); return () => { clearTimeout(timer); cancelAnimationFrame(id); gl.domElement.removeEventListener("pointermove", wake); gl.domElement.removeEventListener("pointerdown", wake); gl.domElement.removeEventListener("pointerup", wake); };
  }, [gl, invalidate]);
  useFrame((_, dt) => {
    if (performance.now() < settleUntil.current) camera.position.lerp(target.current, 1 - Math.exp(-dt * 4));
    if (controls.current) controls.current.enabled = props.entered && !props.reading && performance.now() >= settleUntil.current;
    controls.current?.update();
    gl.domElement.dataset.view = camera.position.toArray().map((n) => n.toFixed(3)).join(",");
  });
  return <>
    <ambientLight intensity={.13} />
    <directionalLight position={[-3, 5, 4]} intensity={1.45} color="#dceaff" />
    <directionalLight position={[4, 1, -2]} intensity={1.8} color="#70cfff" />
    <pointLight position={[-2, -1, 2]} intensity={4.3} distance={7} color="#cbaaff" />
    <group ref={sceneRoot}>
      {!props.entered ? <Sculpture entered={false} reduced={props.reduced} onEnter={props.onEnter} /> : props.module === "relationships"
        ? <RelationshipWorld people={props.people} selectedPersonId={props.selectedPersonId} onSelectPerson={props.onSelectPerson} />
        : props.module === "decision"
          ? <RitualWorld ritual={props.ritual} ritualMode={props.ritualMode} onActivate={props.onActivate} />
          : <Sculpture entered={props.entered} reduced={props.reduced} onEnter={props.onActivate} />}
    </group>
  </>;
}

export default function Instrument(props: Props) {
  return <Canvas frameloop="demand" dpr={1} camera={{ position: [0, .06, 6.1], fov: 38, near: .1, far: 30 }} gl={{ antialias: true, alpha: true, powerPreference: "low-power" }} onCreated={({ gl }) => { gl.setClearColor("#050913", 0); gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.14; }}><Stage {...props} /></Canvas>;
}
