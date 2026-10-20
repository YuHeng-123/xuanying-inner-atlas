"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { getExperienceObject, type ExperienceObjectId } from "./experienceObjects";

export interface TempleSceneProps {
  selected: ExperienceObjectId | null;
  hovered: ExperienceObjectId | null;
  onSelect: (id: ExperienceObjectId) => void;
  onHover: (id: ExperienceObjectId | null) => void;
  onReady: () => void;
  onFailure: () => void;
  still: boolean;
  reset: number;
}

const BRONZE = "#ac8250";
const EDGE = "#d2ad70";
const STONE = "#303434";
const BronzeTexture = createContext<THREE.Texture | null>(null);

function canvasTexture(size: number, paint: (context: CanvasRenderingContext2D, size: number) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("无法准备器物文字贴图");
  paint(context, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function usePaintedTexture(size: number, paint: (context: CanvasRenderingContext2D, size: number) => void, key: string) {
  // Each caller owns its texture, so scene reloads release the matching GPU resource.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const texture = useMemo(() => canvasTexture(size, paint), [size, key]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function PaintedFace({ text, size = 1, color = "#d4b27b" }: { text: string; size?: number; color?: string }) {
  const texture = usePaintedTexture(512, (ctx, n) => {
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = color;
    ctx.font = `${text.length > 2 ? 104 : 210}px SimSun, serif`;
    ctx.fillText(text, n / 2, n / 2);
  }, `${text}:${color}`);
  return <mesh><planeGeometry args={[size, size]} /><meshBasicMaterial map={texture} transparent depthWrite={false} /></mesh>;
}

function Brass({ bright = false, opacity = 1 }: { bright?: boolean; opacity?: number }) {
  const texture = useContext(BronzeTexture);
  return <meshStandardMaterial map={texture} color={bright ? EDGE : BRONZE} metalness={0.93} roughness={bright ? 0.23 : 0.36} transparent={opacity < 1} opacity={opacity} />;
}

function Materials({ children }: { children: ReactNode }) {
  const texture = usePaintedTexture(1024, (ctx, n) => {
    ctx.fillStyle = "#d9c6a0"; ctx.fillRect(0, 0, n, n);
    let seed = 971;
    const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 17000; i++) { const shade = Math.floor(125 + random() * 95); ctx.fillStyle = `rgba(${shade},${shade - 4},${shade - 15},.18)`; ctx.fillRect(random() * n, random() * n, 1 + random() * 4, .5); }
    ctx.strokeStyle = "rgba(80,66,42,.14)"; ctx.lineWidth = .6;
    for (let i = 0; i < 90; i++) { const x = random() * n; const y = random() * n; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 10 + random() * 60, y + random() * 3); ctx.stroke(); }
  }, "aged-bronze");
  return <BronzeTexture.Provider value={texture}>{children}</BronzeTexture.Provider>;
}

function SolidRing({ outer, inner, depth = 0.07 }: { outer: number; inner: number; depth?: number }) {
  const shape = useMemo(() => {
    const outline = new THREE.Shape(); outline.absarc(0, 0, outer, 0, Math.PI * 2, false);
    const hole = new THREE.Path(); hole.absarc(0, 0, inner, 0, Math.PI * 2, true); outline.holes.push(hole);
    return outline;
  }, [outer, inner]);
  return <mesh castShadow receiveShadow><extrudeGeometry args={[shape, { depth, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.014, bevelSegments: 2, curveSegments: 96, steps: 1 }]} /><Brass /></mesh>;
}

function InscribedRing({ radius, letters }: { radius: number; letters: string }) {
  const texture = usePaintedTexture(2048, (ctx, n) => {
    const c = n / 2; const outer = n * .433; ctx.strokeStyle = "#e0bd82";
    for (let i = 0; i < 120; i++) {
      const angle = i / 120 * Math.PI * 2;
      const inset = i % 10 === 0 ? .018 * n : .008 * n;
      ctx.lineWidth = i % 10 === 0 ? 2.7 : 1.6;
      ctx.beginPath(); ctx.moveTo(c + Math.sin(angle) * outer, c - Math.cos(angle) * outer);
      ctx.lineTo(c + Math.sin(angle) * (outer - inset), c - Math.cos(angle) * (outer - inset)); ctx.stroke();
    }
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#f3d19a";
    const glyphs = Array.from(letters); ctx.font = `${Math.round(n * .032)}px SimSun, serif`;
    glyphs.forEach((glyph, i) => {
      const angle = i / glyphs.length * Math.PI * 2;
      ctx.save(); ctx.translate(c + Math.sin(angle) * n * .402, c - Math.cos(angle) * n * .402);
      ctx.rotate(angle); ctx.fillText(glyph, 0, 0); ctx.restore();
    });
    ctx.strokeStyle = "#8b653c"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(c, c, n * .374, 0, Math.PI * 2); ctx.stroke();
  }, `${radius}:${letters}`);
  return <mesh position={[0, 0, .099]}><planeGeometry args={[radius * 2.48, radius * 2.48]} /><meshBasicMaterial map={texture} transparent depthWrite={false} /></mesh>;
}

function DestinyDisc({ still, active }: { still: boolean; active: boolean }) {
  const outer = useRef<THREE.Group>(null); const middle = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (still) return;
    const delta = Math.min(dt, .05);
    if (outer.current) outer.current.rotation.z += delta * .025;
    if (middle.current) middle.current.rotation.z -= delta * .045;
    if (inner.current) inner.current.rotation.y += delta * .055;
  });
  return <group position={[0, 2.85, 0]} rotation={[-.15, -.28, -.08]}>
    <group ref={outer}>
      <SolidRing outer={2.2} inner={1.82} depth={.14} />
      <group position={[0, 0, .06]}><InscribedRing radius={2.2} letters="子丑寅卯辰巳午未申酉戌亥" /></group>
      <mesh position={[0, 0, .075]}><torusGeometry args={[2.23, .025, 8, 128]} /><Brass bright /></mesh>
      <mesh position={[0, 0, .08]}><torusGeometry args={[1.8, .024, 8, 128]} /><Brass /></mesh>
    </group>
    <group ref={middle} position={[0, 0, -.1]} rotation={[.16, .22, .22]}>
      <SolidRing outer={1.59} inner={1.28} />
      <InscribedRing radius={1.59} letters="甲乙丙丁戊己庚辛壬癸" />
      <mesh position={[0, 0, .075]}><torusGeometry args={[1.62, .018, 8, 112]} /><Brass bright /></mesh>
    </group>
    <group ref={inner} rotation={[.4, -.55, .3]}>
      <mesh castShadow><torusGeometry args={[1.08, .065, 12, 96]} /><Brass /></mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} castShadow><torusGeometry args={[.91, .035, 10, 96]} /><Brass bright /></mesh>
    </group>
    <mesh castShadow><sphereGeometry args={[.54, 40, 32]} /><meshPhysicalMaterial color="#10251f" metalness={.55} roughness={.22} clearcoat={1} clearcoatRoughness={.2} emissive="#27483a" emissiveIntensity={active ? .75 : .28} /></mesh>
    <group position={[0, 0, .551]}><PaintedFace text="命" size={.65} /></group>
    <mesh position={[0, 0, .56]}><torusGeometry args={[.46, .006, 6, 80]} /><meshBasicMaterial color="#c3a167" /></mesh>
    <pointLight position={[0, .2, 1]} color="#91b6a0" intensity={active ? 2 : .7} distance={3} />
  </group>;
}

function Plinth({ position = [0, 0, 0], small = false }: { position?: [number, number, number]; small?: boolean }) {
  const radius = small ? .79 : 2.65;
  return <group position={position}>
    <mesh receiveShadow castShadow position={[0, .09, 0]}><cylinderGeometry args={[radius, radius + .16, .18, 64]} /><meshStandardMaterial color="#222827" roughness={.8} /></mesh>
    <mesh receiveShadow castShadow position={[0, .24, 0]}><cylinderGeometry args={[radius - .16, radius, .18, 64]} /><meshStandardMaterial color={STONE} roughness={.77} metalness={.1} /></mesh>
    <mesh receiveShadow castShadow position={[0, .37, 0]}><cylinderGeometry args={[radius - .23, radius - .16, .12, 64]} /><meshStandardMaterial color="#3e4140" roughness={.65} metalness={.12} /></mesh>
    <mesh position={[0, .32, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[radius - .15, .014, 6, 96]} /><Brass /></mesh>
  </group>;
}

function FloatingBook({ still, active }: { still: boolean; active: boolean }) {
  const book = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (book.current) book.current.position.y = 1.77 + (still ? 0 : Math.sin(clock.elapsedTime * .7) * .05); });
  return <group position={[-3.35, 0, .85]}>
    <Plinth small />
    <mesh position={[0, .69, 0]} castShadow><cylinderGeometry args={[.42, .51, .53, 8]} /><meshStandardMaterial color="#252b28" roughness={.8} /></mesh>
    <group ref={book} position={[0, 1.77, 0]} rotation={[-.16, .22, -.09]}>
      <mesh castShadow><boxGeometry args={[.84, 1.13, .22]} /><meshStandardMaterial color="#b1a18b" roughness={.95} /></mesh>
      {[-.14, .14].map((z) => <mesh key={z} position={[0, 0, z]} castShadow><boxGeometry args={[.94, 1.21, .055]} /><meshStandardMaterial color="#21352d" roughness={.6} metalness={.2} /></mesh>)}
      <mesh position={[-.45, 0, 0]} castShadow><boxGeometry args={[.08, 1.23, .33]} /><Brass /></mesh>
      <mesh position={[0, 0, .172]}><planeGeometry args={[.73, 1.03]} /><meshStandardMaterial color="#283c32" metalness={.1} roughness={.6} /></mesh>
      <group position={[0, .06, .18]}><PaintedFace text="命籍" size={.85} /></group>
      {[-.46, .46].map((y) => <mesh key={y} position={[0, y, .182]}><boxGeometry args={[.64, .008, .008]} /><Brass bright /></mesh>)}
      {Array.from({ length: 9 }, (_, i) => <mesh key={i} position={[.425, 0, -.09 + i * .022]}><boxGeometry args={[.003, 1.04, .006]} /><meshStandardMaterial color="#5b5245" /></mesh>)}
    </group>
    <pointLight position={[0, 2.25, 1]} color="#ddbd82" intensity={active ? 6 : 1.5} distance={3.5} />
  </group>;
}

function Cup({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  const shape = useMemo(() => {
    const s = new THREE.Shape(); s.moveTo(-.32, 0); s.quadraticCurveTo(0, -.22, .32, 0); s.quadraticCurveTo(0, .47, -.32, 0); return s;
  }, []);
  return <group position={position} rotation={[-Math.PI / 2, 0, rotation]}>
    <mesh castShadow><extrudeGeometry args={[shape, { depth: .085, bevelEnabled: true, bevelSegments: 3, bevelSize: .05, bevelThickness: .04, curveSegments: 24 }]} /><meshStandardMaterial color="#6b2922" roughness={.38} metalness={.18} /></mesh>
    <mesh position={[0, .045, .133]}><circleGeometry args={[.035, 20]} /><Brass /></mesh>
  </group>;
}

function Coin({ position }: { position: [number, number, number] }) {
  return <group position={position} rotation={[-Math.PI / 2, 0, .25]}>
    <SolidRing outer={.13} inner={.042} depth={.025} />
    <mesh position={[0, 0, .04]}><torusGeometry args={[.1, .007, 6, 24]} /><Brass bright /></mesh>
  </group>;
}

function DivinationTable({ active }: { active: boolean }) {
  return <group position={[3.45, 0, 1.05]} rotation={[0, -.18, 0]}>
    <Plinth small />
    <mesh position={[0, .66, 0]} castShadow><cylinderGeometry args={[.46, .55, .47, 8]} /><meshStandardMaterial color="#292c29" roughness={.8} /></mesh>
    <mesh position={[0, .94, 0]} castShadow receiveShadow><cylinderGeometry args={[.86, .82, .14, 48]} /><meshStandardMaterial color="#45403a" roughness={.72} metalness={.1} /></mesh>
    <mesh position={[0, 1.016, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.72, .728, 64]} /><Brass /></mesh>
    <Cup position={[-.27, 1.03, .04]} rotation={-.45} /><Cup position={[.27, 1.03, -.04]} rotation={2.6} />
    <Coin position={[-.21, 1.04, .48]} /><Coin position={[.09, 1.04, .52]} /><Coin position={[.37, 1.04, .38]} />
    <pointLight position={[0, 2.2, .9]} color="#e8c08a" intensity={active ? 7 : 2.3} distance={4} />
  </group>;
}

function ArchiveCabinet({ active }: { active: boolean }) {
  return <group position={[3.65, 0, -2.4]} rotation={[0, -.12, 0]}>
    <mesh position={[0, .17, 0]} receiveShadow><boxGeometry args={[1.73, .34, .86]} /><meshStandardMaterial color="#2c312d" roughness={.9} /></mesh>
    <mesh position={[0, 1.45, -.31]} castShadow><boxGeometry args={[1.55, 2.55, .13]} /><meshStandardMaterial color="#1d2924" roughness={.85} /></mesh>
    {[-.83, .83].map((x) => <mesh key={x} position={[x, 1.48, 0]} castShadow><boxGeometry args={[.13, 2.7, .74]} /><meshStandardMaterial color="#36362e" roughness={.65} /></mesh>)}
    {[.41, 1.18, 1.96, 2.77].map((y) => <mesh key={y} position={[0, y, 0]} castShadow><boxGeometry args={[1.8, .09, .8]} /><meshStandardMaterial color="#544632" roughness={.6} metalness={.15} /></mesh>)}
    {Array.from({ length: 15 }, (_, i) => {
      const x = -.63 + (i % 5) * .3; const y = .75 + Math.floor(i / 5) * .78;
      return <group key={i} position={[x, y, .045]} rotation={[0, 0, i % 3 === 0 ? -.05 : .025]}>
        <mesh castShadow><boxGeometry args={[.22, .55 + (i % 2) * .07, .43]} /><meshStandardMaterial color={i % 3 === 0 ? "#695438" : i % 3 === 1 ? "#354c40" : "#4f4437"} roughness={.7} /></mesh>
        <mesh position={[0, .08, .22]}><boxGeometry args={[.11, .21, .01]} /><meshStandardMaterial color="#c1aa7e" roughness={.8} /></mesh>
      </group>;
    })}
    <pointLight position={[0, 2.9, 1]} color="#d7b982" intensity={active ? 5 : 1.6} distance={4} />
  </group>;
}

function Arch({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return <group position={position} scale={scale}>
    {[-2.75, 2.75].map((x) => <group key={x} position={[x, 0, 0]}>
      <mesh position={[0, 1.62, 0]} castShadow><boxGeometry args={[.46, 3.24, .62]} /><meshStandardMaterial color="#303532" roughness={.8} /></mesh>
      <mesh position={[0, .19, 0]}><boxGeometry args={[.75, .38, .89]} /><meshStandardMaterial color="#353833" roughness={.8} /></mesh>
      <mesh position={[x < 0 ? .15 : -.15, 1.7, .319]}><boxGeometry args={[.018, 2.7, .015]} /><Brass /></mesh>
    </group>)}
    <mesh position={[0, 3.18, 0]} castShadow><torusGeometry args={[2.75, .24, 8, 80, Math.PI]} /><meshStandardMaterial color="#303532" roughness={.8} /></mesh>
    <mesh position={[0, 3.18, .255]}><torusGeometry args={[2.57, .011, 6, 96, Math.PI]} /><Brass /></mesh>
    <mesh position={[0, 5.94, .27]}><boxGeometry args={[.16, .25, .06]} /><Brass bright /></mesh>
  </group>;
}

function Architecture() {
  const stoneTexture = usePaintedTexture(1024, (ctx, n) => {
    ctx.fillStyle = "#323934"; ctx.fillRect(0, 0, n, n);
    let seed = 57;
    const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 9000; i++) { const shade = Math.floor(35 + random() * 55); ctx.fillStyle = `rgba(${shade},${shade + 3},${shade},.21)`; ctx.fillRect(random() * n, random() * n, random() * 5 + 1, random() * 2 + 1); }
    ctx.strokeStyle = "#141c19"; ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(i * n / 4, 0); ctx.lineTo(i * n / 4, n); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * n / 4); ctx.lineTo(n, i * n / 4); ctx.stroke(); }
  }, "stone-floor");
  useEffect(() => { stoneTexture.wrapS = stoneTexture.wrapT = THREE.RepeatWrapping; stoneTexture.repeat.set(4, 4); }, [stoneTexture]);
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[38, 38]} /><meshStandardMaterial color="#67706a" map={stoneTexture} roughness={.76} metalness={.16} /></mesh>
    {[3.25, 5.2, 7.3].map((radius) => <mesh key={radius} position={[0, .007, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[radius, radius + .015, 120]} /><meshStandardMaterial color="#796141" metalness={.75} roughness={.6} /></mesh>)}
    <Plinth />
    <Arch position={[0, 0, -4.8]} />
    <Arch position={[0, 0, -9.3]} scale={.92} />
    {[-6, 6].map((x) => <mesh key={x} position={[x, 3.1, -5.2]}><boxGeometry args={[5.7, 6.2, .5]} /><meshStandardMaterial color="#1d2422" roughness={.95} /></mesh>)}
    {[-5.5, 5.5].map((x) => [-1.8, -5.9].map((z) => <group key={`${x}:${z}`} position={[x, 0, z]}>
      <mesh position={[0, 2.9, 0]} castShadow><cylinderGeometry args={[.32, .4, 5.8, 12]} /><meshStandardMaterial color="#3c403a" roughness={.85} /></mesh>
      {[.19, 5.7].map((y) => <mesh key={y} position={[0, y, 0]}><boxGeometry args={[1, .38, 1]} /><meshStandardMaterial color="#41423a" roughness={.8} /></mesh>)}
      <mesh position={[0, 1.35, .42]}><boxGeometry args={[.04, 1.5, .06]} /><Brass /></mesh>
    </group>))}
    {[-4.1, 4.1].map((x) => <group key={x} position={[x, 0, -3.2]}>
      <mesh position={[0, .78, 0]}><cylinderGeometry args={[.11, .21, 1.56, 8]} /><Brass /></mesh>
      <mesh position={[0, 1.63, 0]}><sphereGeometry args={[.15, 16, 12]} /><meshBasicMaterial color="#ffce7f" /></mesh>
      <pointLight position={[0, 1.76, 0]} color="#ffb86a" intensity={8} distance={5} decay={2} />
    </group>)}
  </group>;
}

function Dust({ still }: { still: boolean }) {
  const points = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const array = new Float32Array(180 * 3);
    for (let i = 0; i < 180; i++) {
      const r = ((i * 127 + 53) % 997) / 997; const s = ((i * 331 + 79) % 991) / 991;
      array[i * 3] = (r - .5) * 15; array[i * 3 + 1] = s * 7; array[i * 3 + 2] = -(((i * 59) % 983) / 983) * 12 + 3;
    }
    return array;
  }, []);
  useFrame((_, dt) => { if (points.current && !still) points.current.rotation.y += Math.min(dt, .05) * .008; });
  return <points ref={points}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry><pointsMaterial size={.017} color="#ae9470" transparent opacity={.55} sizeAttenuation depthWrite={false} /></points>;
}

function InteractiveObject({ id, props, children }: { id: ExperienceObjectId; props: TempleSceneProps; children: ReactNode }) {
  const click = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); if (event.delta <= 5) props.onSelect(id); };
  return <group onClick={click} onPointerOver={(event) => { event.stopPropagation(); props.onHover(id); }} onPointerOut={() => props.onHover(null)}>{children}</group>;
}

function SceneSetup({ onReady, onFailure }: Pick<TempleSceneProps, "onReady" | "onFailure">) {
  const { gl, scene } = useThree(); const rendered = useRef(false);
  useEffect(() => {
    const generator = new THREE.PMREMGenerator(gl); const room = new RoomEnvironment();
    const target = generator.fromScene(room, .04); scene.environment = target.texture; scene.environmentIntensity = .55;
    const lost = (event: Event) => { event.preventDefault(); onFailure(); };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => { gl.domElement.removeEventListener("webglcontextlost", lost); scene.environment = null; target.dispose(); room.dispose(); generator.dispose(); };
  }, [gl, scene, onFailure]);
  useFrame(() => { if (!rendered.current) { rendered.current = true; onReady(); } });
  return null;
}

function CameraDirector({ selected, reset, still }: Pick<TempleSceneProps, "selected" | "reset" | "still">) {
  const { camera, gl, size } = useThree(); const controls = useRef<OrbitControls | null>(null);
  const move = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  const mobile = size.width < 600;
  useEffect(() => {
    const orbit = new OrbitControls(camera, gl.domElement); controls.current = orbit;
    orbit.enableDamping = true; orbit.dampingFactor = .075; orbit.enablePan = false;
    orbit.rotateSpeed = .45; orbit.zoomSpeed = .55; orbit.minDistance = 3.2; orbit.maxDistance = 16;
    orbit.minPolarAngle = .5; orbit.maxPolarAngle = 1.49; orbit.minAzimuthAngle = -.72; orbit.maxAzimuthAngle = .72;
    orbit.target.set(0, 2.2, 0); orbit.update();
    return () => { orbit.dispose(); controls.current = null; };
  }, [camera, gl]);
  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    camera.fov = mobile ? 54 : 43; camera.updateProjectionMatrix();
    const object = getExperienceObject(selected);
    move.current = {
      position: object ? new THREE.Vector3(...object.camera) : new THREE.Vector3(0, mobile ? 4.1 : 3.8, mobile ? 13.6 : 12.6),
      target: object ? new THREE.Vector3(...object.target) : new THREE.Vector3(0, mobile ? 2.8 : 2.25, 0),
    };
    if (controls.current) controls.current.enabled = false;
  }, [selected, reset, camera, mobile]);
  useFrame((_, dt) => {
    const orbit = controls.current; const goal = move.current;
    if (!orbit) return;
    if (goal) {
      const alpha = still ? 1 : 1 - Math.exp(-5 * Math.min(dt, .08));
      camera.position.lerp(goal.position, alpha); orbit.target.lerp(goal.target, alpha);
      camera.lookAt(orbit.target);
      if (camera.position.distanceTo(goal.position) < .015 && orbit.target.distanceTo(goal.target) < .01) {
        camera.position.copy(goal.position); orbit.target.copy(goal.target); move.current = null; orbit.enabled = true;
      }
    }
    orbit.update();
  });
  return null;
}

export default function TempleScene(props: TempleSceneProps) {
  const active = (id: ExperienceObjectId) => props.selected === id || props.hovered === id;
  return <Canvas camera={{ position: [0, 3.8, 12.6], fov: 43, near: .1, far: 65 }} dpr={[1, 1.5]} shadows gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }} style={{ cursor: props.hovered ? "pointer" : "grab" }} onCreated={({ gl }) => { gl.setClearColor("#090c0d"); gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = .9; }}>
    <fog attach="fog" args={["#090f0e", 9, 29]} />
    <SceneSetup onReady={props.onReady} onFailure={props.onFailure} />
    <CameraDirector selected={props.selected} still={props.still} reset={props.reset} />
    <ambientLight intensity={.12} color="#9aafa4" />
    <directionalLight position={[4, 8, 5]} intensity={1.65} color="#e7ceaa" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={8} shadow-camera-bottom={-5} shadow-bias={-.001} />
    <directionalLight position={[-5, 5, -3]} intensity={1.4} color="#94bdb0" />
    <pointLight position={[0, 6.1, -.5]} intensity={14} distance={14} color="#d6b47c" />
    <Materials>
    <Architecture />
    <InteractiveObject id="disc" props={props}><DestinyDisc still={props.still} active={active("disc")} /></InteractiveObject>
    <InteractiveObject id="relationships" props={props}><FloatingBook still={props.still} active={active("relationships")} /></InteractiveObject>
    <InteractiveObject id="divination" props={props}><DivinationTable active={active("divination")} /></InteractiveObject>
    <InteractiveObject id="archive" props={props}><ArchiveCabinet active={active("archive")} /></InteractiveObject>
    <Dust still={props.still} />
    </Materials>
  </Canvas>;
}
