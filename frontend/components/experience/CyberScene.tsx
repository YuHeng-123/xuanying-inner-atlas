"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { FineSceneProps } from "./FineTempleScene";
import type { ExperienceObjectId } from "./experienceObjects";

const CENTER: [number, number, number] = [1.25, .15, 0];
const NODES: Record<ExperienceObjectId, [number, number, number]> = {
  disc: [1.25, .15, 0], relationships: [-.95, .35, 1.65],
  divination: [3.1, -1.6, 1.25], archive: [3.6, 1.8, -.4],
};
const COLORS = { disc: "#42d9ff", relationships: "#ed8cce", divination: "#ffc56c", archive: "#69e6b9" };
const STEMS = "甲乙丙丁戊己庚辛壬癸";
const BRANCHES = "子丑寅卯辰巳午未申酉戌亥";

function lineGeometry(points: THREE.Vector3[]) { return new THREE.BufferGeometry().setFromPoints(points); }
function circlePoints(radius: number, count = 160) { return Array.from({ length: count + 1 }, (_, i) => new THREE.Vector3(Math.cos(i / count * Math.PI * 2) * radius, Math.sin(i / count * Math.PI * 2) * radius, 0)); }

function OrbitalLine({ radius, color, opacity = .35 }: { radius: number; color: string; opacity?: number }) {
  const geometry = useMemo(() => lineGeometry(circlePoints(radius)), [radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <lineLoop geometry={geometry}><lineBasicMaterial color={color} transparent opacity={opacity}/></lineLoop>;
}

function EngravedScale() {
  const map = useMemo(() => {
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1024;
    const ctx = canvas.getContext("2d")!; const mid = 512;
    ctx.translate(mid, mid); ctx.strokeStyle = "#6e8995"; ctx.lineWidth = 1.6;
    for (let i = 0; i < 120; i++) {
      const angle = i / 120 * Math.PI * 2; const a = i % 10 === 0 ? 425 : i % 5 === 0 ? 443 : 454;
      ctx.beginPath(); ctx.moveTo(Math.cos(angle) * a, Math.sin(angle) * a); ctx.lineTo(Math.cos(angle) * 472, Math.sin(angle) * 472); ctx.stroke();
    }
    [BRANCHES, STEMS].forEach((text, ring) => {
      ctx.font = `${ring ? 22 : 28}px "Microsoft YaHei", sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = ring ? "#80acc0" : "#bdced5";
      Array.from(text).forEach((char, i) => { const a = i / text.length * Math.PI * 2 - Math.PI / 2; ctx.save(); ctx.translate(Math.cos(a) * (ring ? 357 : 400), Math.sin(a) * (ring ? 357 : 400)); ctx.rotate(a + Math.PI / 2); ctx.fillText(char, 0, 0); ctx.restore(); });
    });
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
  }, []);
  useEffect(() => () => map.dispose(), [map]);
  return <mesh position={[0, 0, .012]}><planeGeometry args={[5.85, 5.85]}/><meshBasicMaterial map={map} transparent opacity={.9} depthWrite={false} side={THREE.DoubleSide}/></mesh>;
}

function Callout({ id, title, position, props }: { id: ExperienceObjectId; title: string; position: [number, number, number]; props: FineSceneProps }) {
  const map = useMemo(() => {
    const canvas = document.createElement("canvas"); canvas.width = 640; canvas.height = 92;
    const ctx = canvas.getContext("2d")!; ctx.fillStyle = "rgba(4,12,19,.94)";
    ctx.beginPath(); ctx.roundRect(1, 1, 638, 90, 22); ctx.fill(); ctx.strokeStyle = COLORS[id]; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = COLORS[id]; ctx.beginPath(); ctx.arc(32, 46, 7, 0, Math.PI * 2); ctx.fill();
    ctx.font = '24px "Microsoft YaHei", sans-serif'; ctx.fillText(title, 54, 54);
    ctx.fillStyle = "#7c919e"; ctx.font = '19px Consolas, monospace'; ctx.fillText("↗", 603, 53);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
  }, [id, title]);
  useEffect(() => () => map.dispose(), [map]);
  return <sprite position={position} scale={[2.05, .295, 1]} onClick={(e) => { e.stopPropagation(); props.onSelect(id); }} onPointerOver={(e) => { e.stopPropagation(); props.onHover(id); }} onPointerOut={() => props.onHover(null)}><spriteMaterial map={map} transparent depthWrite={false} toneMapped={false}/></sprite>;
}

function LunarCore(props: FineSceneProps) {
  const [map, height] = useLoader(THREE.TextureLoader, ["/cyber/lunar-color.jpg", "/cyber/lunar-height.jpg"]);
  const outer = useRef<THREE.Group>(null); const globe = useRef<THREE.Mesh>(null);
  const gl = useThree((s) => s.gl);
  useEffect(() => { map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy()); map.needsUpdate = true; }, [map, gl]);
  const rim = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    uniforms: { rimColor: { value: new THREE.Color("#12b5eb") } },
    vertexShader: "varying vec3 vNormal; varying vec3 vView; void main(){vec4 p=modelViewMatrix*vec4(position,1.);vNormal=normalize(normalMatrix*normal);vView=normalize(-p.xyz);gl_Position=projectionMatrix*p;}",
    fragmentShader: "varying vec3 vNormal; varying vec3 vView; uniform vec3 rimColor; void main(){float edge=pow(1.-abs(dot(normalize(vNormal),normalize(vView))),3.8);gl_FragColor=vec4(rimColor,edge*.38);}",
  }), []);
  useEffect(() => () => rim.dispose(), [rim]);
  useFrame((_, dt) => { if (!props.still) { if (outer.current) outer.current.rotation.z += Math.min(dt, .06) * .035; if (globe.current) globe.current.rotation.y += Math.min(dt, .06) * .025; } });
  return <group position={CENTER} onClick={(e) => { e.stopPropagation(); props.onSelect("disc"); }} onPointerOver={(e) => { e.stopPropagation(); props.onHover("disc"); }} onPointerOut={() => props.onHover(null)}>
    <mesh ref={globe} rotation={[.12, -.95, -.12]}><sphereGeometry args={[2.08, 96, 64]}/><meshStandardMaterial map={map} bumpMap={height} bumpScale={.04} color="#b6c6d2" roughness={.88} metalness={.12}/></mesh>
    <mesh material={rim}><sphereGeometry args={[2.145, 64, 40]}/></mesh>
    <group ref={outer} rotation={[.13, -.3, -.18]}>
      <mesh><torusGeometry args={[2.61, .055, 10, 180]}/><meshStandardMaterial color="#596979" metalness={.92} roughness={.3}/></mesh>
      <mesh position={[0, 0, .022]}><torusGeometry args={[2.665, .009, 6, 180]}/><meshBasicMaterial color="#8bccdf"/></mesh>
      <EngravedScale/>
      {Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2; return <group key={i} position={[Math.cos(a) * 2.61, Math.sin(a) * 2.61, 0]} rotation={[0, 0, a]}><mesh><boxGeometry args={[.15, .11, .15]}/><meshStandardMaterial color="#909da7" metalness={.9} roughness={.25}/></mesh><mesh position={[.045, 0, .082]}><boxGeometry args={[.045, .06, .012]}/><meshBasicMaterial color={i % 3 ? "#3e7d8f" : "#6ee4ff"}/></mesh></group>; })}
    </group>
    <group rotation={[1.13, .12, .15]}><mesh><torusGeometry args={[2.42, .04, 10, 160]}/><meshStandardMaterial color="#667681" metalness={.94} roughness={.24}/></mesh><OrbitalLine radius={2.49} color="#19add1" opacity={.65}/></group>
    <group rotation={[.55, .4, -.3]}><OrbitalLine radius={3.17} color="#386778" opacity={.45}/></group>
    <group rotation={[1.35, -.1, .35]}><OrbitalLine radius={3.6} color="#34616a" opacity={.35}/></group>
  </group>;
}

function Network(props: FineSceneProps) {
  const nodes = useMemo(() => Array.from({ length: 7 }, (_, i) => new THREE.Vector3(Math.sin(i * 2.4) * .5, Math.cos(i * 1.7) * .57, Math.sin(i * .8) * .25)), []);
  const lines = useMemo(() => { const points: THREE.Vector3[] = []; nodes.slice(1).forEach((n, i) => points.push(n, nodes[0], n, nodes[(i + 2) % nodes.length])); return lineGeometry(points); }, [nodes]);
  useEffect(() => () => lines.dispose(), [lines]);
  return <group position={NODES.relationships} onClick={(e) => { e.stopPropagation(); props.onSelect("relationships"); }} onPointerOver={(e) => { e.stopPropagation(); props.onHover("relationships"); }} onPointerOut={() => props.onHover(null)}>
    <lineSegments geometry={lines}><lineBasicMaterial color="#bd7fad" transparent opacity={.6}/></lineSegments>
    {nodes.map((node, i) => <group key={i} position={node}><mesh><sphereGeometry args={[i ? .065 : .12, 18, 12]}/><meshStandardMaterial color={i ? "#bea7ba" : "#f7b4e6"} emissive="#68274c" emissiveIntensity={.6} metalness={.75} roughness={.24}/></mesh><mesh rotation={[Math.PI / 4, .5, 0]}><torusGeometry args={[i ? .095 : .17, .009, 6, 32]}/><meshBasicMaterial color="#be73a8"/></mesh></group>)}
    <group rotation={[.1, -.25, 0]}><OrbitalLine radius={.8} color="#bd70a0" opacity={.3}/></group>
  </group>;
}

function DecisionPods(props: FineSceneProps) {
  const pods = useRef<Array<THREE.Mesh | null>>([]); const started = useRef(0);
  useEffect(() => { if (props.ritual) { const duration = props.ritual.kind === "lot" ? 2800 : 1400; started.current = performance.now() - (props.reducedMotion ? duration : 0); } }, [props.ritual, props.reducedMotion]);
  useFrame(() => {
    if (!props.ritual || !started.current) return;
    const duration = props.ritual.kind === "lot" ? 2800 : 1400;
    const t = Math.min(1, (performance.now() - started.current) / duration);
    if (props.ritual.kind === "lot") {
      pods.current.forEach((pod, i) => { if (!pod) return; const pull = THREE.MathUtils.smoothstep(t, .48, 1); pod.position.set((i - 1) * .24, .12 + Math.sin(t * Math.PI * 24) * (1 - pull) * .08 + pull * .3, .22 + pull * .42); pod.rotation.z = pull * .65; });
      return;
    }
    pods.current.forEach((pod, i) => { if (!pod) return; const outcome = props.ritual?.kind === "coins" ? i < (props.ritual.line ?? 7) - 6 : props.ritual?.faces?.[i] === "平面";
      pod.position.y = .12 + Math.sin(t * Math.PI) * .7; pod.rotation.x = (1 - t) * Math.PI * (5 + i) + (outcome ? 0 : Math.PI) * t; });
  });
  return <group position={NODES.divination} rotation={[.22, -.2, -.1]} onClick={(e) => { e.stopPropagation(); props.onSelect("divination"); }} onPointerOver={(e) => { e.stopPropagation(); props.onHover("divination"); }} onPointerOut={() => props.onHover(null)}>
    <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.59, .59, .12, 64]}/><meshStandardMaterial color="#48515b" metalness={.93} roughness={.2}/></mesh>
    <mesh position={[0, 0, .075]}><torusGeometry args={[.53, .012, 8, 64]}/><meshBasicMaterial color="#e6b76a"/></mesh>
    {[0, 1, 2].map((i) => <mesh key={i} ref={(mesh) => { pods.current[i] = mesh; }} position={[(i - 1) * .24, .12, .22]} rotation={[0, 0, .25]}><octahedronGeometry args={[.14, 0]}/><meshStandardMaterial color={i === 1 ? "#d9ae6b" : "#819eaa"} metalness={.72} roughness={.18}/></mesh>)}
    <group rotation={[.15, .18, 0]}><OrbitalLine radius={.76} color="#d6a75f" opacity={.4}/></group>
  </group>;
}

function Archive(props: FineSceneProps) {
  return <group position={NODES.archive} rotation={[.2, -.38, .1]} onClick={(e) => { e.stopPropagation(); props.onSelect("archive"); }} onPointerOver={(e) => { e.stopPropagation(); props.onHover("archive"); }} onPointerOut={() => props.onHover(null)}>
    {Array.from({ length: 5 }, (_, i) => <group key={i} position={[0, 0, (i - 2) * .13]}><mesh><boxGeometry args={[.78, .95, .05]}/><meshStandardMaterial color={i === 4 ? "#4b656a" : "#28363f"} metalness={.85} roughness={.27}/></mesh><mesh position={[-.30, 0, .029]}><boxGeometry args={[.018, .69, .012]}/><meshBasicMaterial color="#64dcae"/></mesh>{[0, 1, 2, 3].map((row) => <mesh key={row} position={[.015, .22 - row * .13, .029]}><boxGeometry args={[.39 - row * .06, .008, .008]}/><meshBasicMaterial color="#829f9b"/></mesh>)}</group>)}
  </group>;
}

function SceneContents(props: FineSceneProps) {
  const ready = useRef(false);
  useFrame(() => { if (!ready.current) { ready.current = true; props.onReady(); } });
  return <>
    <LunarCore {...props}/><Network {...props}/><DecisionPods {...props}/><Archive {...props}/>
    {!props.opened && !props.selected && props.phase === "hall" && <group>
      <Callout id="disc" title="01 / 天机盘   ·   CHART CORE" position={[1.23, 1.33, 2]} props={props}/>
      <Callout id="relationships" title={`02 / 人际网络   ·   ${props.sceneData.people.length} 位人物`} position={[-1.03, -.54, 1.95]} props={props}/>
      <Callout id="divination" title="03 / 决策实验室   ·   DIVINATION" position={[3.01, -2.1, 1.55]} props={props}/>
      <Callout id="archive" title="04 / 记忆档案   ·   ARCHIVE" position={[3.23, 2.4, .15]} props={props}/>
    </group>}
  </>;
}

function Camera(props: FineSceneProps) {
  const { camera, gl, invalidate, size } = useThree();
  const controls = useRef<OrbitControls | null>(null);
  const goal = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  const mobile = size.width < 650;
  useEffect(() => {
    const orbit = new OrbitControls(camera, gl.domElement); controls.current = orbit;
    orbit.enablePan = false; orbit.enableDamping = true; orbit.dampingFactor = .12; orbit.rotateSpeed = .32; orbit.zoomSpeed = .45;
    orbit.minDistance = 2; orbit.maxDistance = 15; orbit.minAzimuthAngle = -.7; orbit.maxAzimuthAngle = .7; orbit.minPolarAngle = .75; orbit.maxPolarAngle = 1.85;
    const change = () => { if (!goal.current) invalidate(); }; orbit.addEventListener("change", change);
    return () => { orbit.removeEventListener("change", change); orbit.dispose(); controls.current = null; };
  }, [camera, gl, invalidate]);
  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    camera.fov = mobile ? 47 : 40; camera.updateProjectionMatrix();
    let target = mobile ? new THREE.Vector3(1.15, -.35, 0) : new THREE.Vector3(0, .05, 0);
    let position = new THREE.Vector3(target.x, target.y + .45, mobile ? 12.6 : 9.4);
    if (props.selected) { target = new THREE.Vector3(...NODES[props.selected]); target.x += mobile ? 0 : .55; position = target.clone().add(new THREE.Vector3(.35, .4, props.selected === "disc" ? 7.5 : 3.8)); }
    if (props.phase === "intro") position.z += 2;
    if (props.opened && !mobile) { target.x += .9; position.x += .9; }
    goal.current = { target, position }; if (controls.current) controls.current.enabled = false; invalidate();
  }, [camera, mobile, props.selected, props.opened, props.phase, props.reset, invalidate]);
  useFrame((_, dt) => {
    const orbit = controls.current; if (!orbit) return;
    if (goal.current) {
      const alpha = props.reducedMotion ? 1 : 1 - Math.exp(-6 * Math.min(dt, .08)); camera.position.lerp(goal.current.position, alpha); orbit.target.lerp(goal.current.target, alpha);
      if (camera.position.distanceTo(goal.current.position) < .012 && orbit.target.distanceTo(goal.current.target) < .01) { camera.position.copy(goal.current.position); orbit.target.copy(goal.current.target); goal.current = null; }
    }
    orbit.enabled = !goal.current && props.phase === "hall" && !props.opened; orbit.update();
  });
  return null;
}

function Environment({ onFailure }: { onFailure: () => void }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    const generator = new THREE.PMREMGenerator(gl); const room = new RoomEnvironment(); const target = generator.fromScene(room, .04);
    scene.environment = target.texture; scene.environmentIntensity = .85;
    const lost = (e: Event) => { e.preventDefault(); onFailure(); }; gl.domElement.addEventListener("webglcontextlost", lost);
    return () => { gl.domElement.removeEventListener("webglcontextlost", lost); scene.environment = null; target.dispose(); room.dispose(); generator.dispose(); };
  }, [gl, scene, onFailure]);
  return null;
}

function Stars() {
  const positions = useMemo(() => Float32Array.from({ length: 420 * 3 }, (_, i) => i % 3 === 0 ? (((i * 137) % 997) / 997 - .5) * 32 : i % 3 === 1 ? (((i * 211) % 991) / 991 - .5) * 18 : -8 - ((i * 59) % 983) / 983 * 10), []);
  return <points><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]}/></bufferGeometry><pointsMaterial color="#89a1b1" transparent opacity={.48} size={.019} depthWrite={false}/></points>;
}

function MotionClock(props: FineSceneProps) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let interval: number | null = null; let end: number | null = null;
    const stop = () => { if (interval !== null) window.clearInterval(interval); if (end !== null) window.clearTimeout(end); interval = end = null; };
    const begin = () => { stop(); if (document.hidden) return; invalidate(); if (props.reducedMotion) return; interval = window.setInterval(() => { if (!document.hidden) invalidate(); }, 50); if (props.still) end = window.setTimeout(stop, 1800); };
    begin(); document.addEventListener("visibilitychange", begin); return () => { stop(); document.removeEventListener("visibilitychange", begin); };
  }, [props.still, props.selected, props.opened, props.phase, props.reset, props.ritual, props.reducedMotion, invalidate]);
  return null;
}

export default function CyberScene(props: FineSceneProps) {
  return <Canvas frameloop="demand" camera={{ position: [0, .5, 11.4], fov: 40, near: .1, far: 55 }} dpr={1} gl={{ antialias: true, alpha: true, powerPreference: "low-power" }} onCreated={({ gl }) => { gl.setClearColor("#04080d", 0); gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.18; }} style={{ cursor: props.hovered ? "pointer" : "grab" }}>
    <Environment onFailure={props.onFailure}/><Camera {...props}/>
    <ambientLight color="#819fb8" intensity={.16}/><directionalLight position={[-3, 6, 5]} color="#dae8ff" intensity={3.3}/><directionalLight position={[5, 2, -4]} color="#22bfff" intensity={3.4}/><directionalLight position={[-4, -2, 2]} color="#747bbd" intensity={.5}/>
    <Suspense fallback={null}><SceneContents {...props}/></Suspense><Stars/><MotionClock {...props}/>
  </Canvas>;
}
