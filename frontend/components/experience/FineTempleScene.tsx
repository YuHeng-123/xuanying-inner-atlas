"use client";

import { Canvas, useFrame, useLoader, useThree, type ThreeEvent } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { TempleSceneProps } from "./TempleScene";
import type { ExperiencePhase, RitualEvent, SceneData } from "./experienceTypes";
import type { ExperienceObjectId } from "./experienceObjects";
import { publicAsset } from "@/lib/publicAsset";

export interface FineSceneProps extends TempleSceneProps {
  phase: ExperiencePhase;
  opened: boolean;
  sceneData: SceneData;
  ritual: RitualEvent | null;
  reducedMotion: boolean;
}

const ROOTS: Record<string, ExperienceObjectId> = { root_disc: "disc", root_relationships: "relationships", root_divination: "divination", root_archive: "archive" };
const FOCUS: Record<ExperienceObjectId, { position: [number, number, number]; target: [number, number, number] }> = {
  disc: { position: [1.4, 3.25, 5.65], target: [-.28, 2.45, -.25] },
  relationships: { position: [-3.3, 2.75, 4.05], target: [-2.85, 1.25, .95] },
  divination: { position: [3.05, 3.1, 4.55], target: [2.8, 1.05, 1.05] },
  archive: { position: [4.65, 2.75, 1.2], target: [3.32, 2.1, -3.15] },
};

function semantic(object: THREE.Object3D): ExperienceObjectId | null {
  let current: THREE.Object3D | null = object;
  while (current) { if (ROOTS[current.name]) return ROOTS[current.name]; current = current.parent; }
  return null;
}

function RefinedAssets(props: FineSceneProps) {
  const gltf = useLoader(GLTFLoader, publicAsset("/temple/refined-temple-ao.glb"), (loader) => {
    const decoder = new DRACOLoader(); decoder.setDecoderPath(publicAsset("/temple/draco/")); decoder.setWorkerLimit(1);
    loader.setDRACOLoader(decoder);
  });
  const gl = useThree((state) => state.gl);
  const model = useMemo(() => {
    const copy = gltf.scene.clone(true);
    const clones = new Map<THREE.Material, THREE.Material>();
    copy.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true; object.receiveShadow = true;
      const prepare = (source: THREE.Material) => {
        if (clones.has(source)) return clones.get(source)!;
        const material = source.clone(); clones.set(source, material);
        if (material instanceof THREE.MeshStandardMaterial) {
          if (material.name.includes("walnut")) material.color.setRGB(.53, .46, .37);
          if (material.name.includes("limestone")) material.color.setRGB(.27, .31, .29);
          if (material.name.includes("parchment")) material.color.setRGB(.26,.23,.17);
          if (material.name.includes("book cloth")) material.color.multiplyScalar(.43);
          if (material.name.includes("basalt")) material.color.multiplyScalar(.48);
          if (material.name.includes("bronze")) material.color.multiplyScalar(.53);
          if (material.name.includes("worn edges")) material.color.multiplyScalar(.60);
          material.envMapIntensity = material.metalness > .5 ? .85 : .18;
          [material.map, material.normalMap, material.roughnessMap].forEach((texture) => { if (texture) texture.anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy()); });
        }
        return material;
      };
      object.material = Array.isArray(object.material) ? object.material.map(prepare) : prepare(object.material);
    });
    return copy;
  }, [gltf, gl]);
  useEffect(() => () => { const materials = new Set<THREE.Material>(); model.traverse((ob) => { if (ob instanceof THREE.Mesh) (Array.isArray(ob.material) ? ob.material : [ob.material]).forEach((mat) => materials.add(mat)); }); materials.forEach((mat) => mat.dispose()); }, [model]);
  const parts = useMemo(() => {
    const names = ["ring_outer", "ring_middle", "ring_inner", "book_cover", "cup_0", "cup_1", "coin_0", "coin_1", "coin_2"];
    return Object.fromEntries(names.map((name) => { const object = model.getObjectByName(name); return [name, object ? { object, position: object.position.clone(), rotation: object.rotation.clone() } : null]; }));
  }, [model]);
  const cast = useRef<{ event: RitualEvent; started: number } | null>(null);
  useEffect(() => { if (props.ritual) { const duration = props.ritual.kind === "lot" ? 2800 : 1400; cast.current = { event: props.ritual, started: performance.now() - (props.reducedMotion ? duration : 0) }; } }, [props.ritual, props.reducedMotion]);
  useFrame((_, dt) => {
    const delta = Math.min(dt, .06);
    if (!props.still) {
      if (parts.ring_outer) parts.ring_outer.object.rotation.z += delta * .018;
      if (parts.ring_middle) parts.ring_middle.object.rotation.z -= delta * .027;
      if (parts.ring_inner) parts.ring_inner.object.rotation.y += delta * .035;
    }
    if (parts.book_cover) {
      const open = props.selected === "relationships" ? 2.05 : 0;
      parts.book_cover.object.rotation.z = props.reducedMotion ? open : THREE.MathUtils.damp(parts.book_cover.object.rotation.z, open, 5, delta);
    }
    const current = cast.current;
    if (!current) return;
    const duration = current.event.kind === "lot" ? 2800 : 1400;
    const t = Math.min((performance.now() - current.started) / duration, 1);
    if (current.event.kind === "choice") {
      if (parts.ring_inner && t < 1) parts.ring_inner.object.rotation.y += delta * (1 - t) * 8;
      return;
    }
    if (current.event.kind === "lot") {
      if (parts.div_ring && t < 1) parts.div_ring.object.rotation.y += delta * (1 - t) * 5;
      return;
    }
    const coins = current.event.kind === "coins";
    const line = current.event.line ?? 7;
    // The result is decided once in DecisionDivinationStudio. These poses display
    // that same event: 6=0 heads, 7=1, 8=2, 9=3 (heads contribute three).
    const heads = line - 6;
    for (let index = 0; index < (coins ? 3 : 2); index++) {
      const part = parts[`${coins ? "coin" : "cup"}_${index}`];
      if (!part) continue;
      const landedAngle = coins ? (index < heads ? 0 : Math.PI) : (current.event.faces?.[index] === "平面" ? 0 : Math.PI);
      part.object.position.copy(part.position);
      part.object.position.y += Math.sin(t * Math.PI) * (coins ? .64 : .48);
      part.object.rotation.set(part.rotation.x + (1 - t) * Math.PI * (5 + index) + landedAngle * t, part.rotation.y, part.rotation.z + Math.sin(t * Math.PI) * .45);
      if (t === 1) part.object.rotation.set(part.rotation.x + landedAngle, part.rotation.y, part.rotation.z);
    }
  });
  const ready = useRef(false);
  useFrame(() => { if (!ready.current) { ready.current = true; props.onReady(); } });
  const pointer = (event: ThreeEvent<PointerEvent>) => {
    const id = semantic(event.object); if (!id || props.phase !== "hall" || props.opened) return;
    event.stopPropagation(); props.onHover(id);
  };
  return <primitive object={model} dispose={null} onPointerOver={pointer} onPointerOut={() => props.onHover(null)} onClick={(event: ThreeEvent<MouseEvent>) => {
    const id = semantic(event.object); if (id && event.delta <= 5 && props.phase === "hall" && !props.opened) { event.stopPropagation(); props.onSelect(id); }
  }} />;
}

function Camera({ selected, phase, opened, reset, reducedMotion }: FineSceneProps) {
  const { camera, gl, size, invalidate } = useThree();
  const orbit = useRef<OrbitControls | null>(null);
  const move = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  const mobile = size.width < 600;
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement); orbit.current = controls;
    controls.enableDamping = true; controls.dampingFactor = .085; controls.enablePan = false;
    controls.minDistance = 2.2; controls.maxDistance = 14;
    controls.minPolarAngle = .56; controls.maxPolarAngle = 1.48;
    controls.minAzimuthAngle = -.68; controls.maxAzimuthAngle = .68; controls.rotateSpeed = .36; controls.zoomSpeed = .45;
    controls.target.set(0, 2.0, -.6); controls.update();
    const changed = () => { if (!move.current) invalidate(); };
    controls.addEventListener("change",changed);
    return () => { controls.removeEventListener("change",changed); controls.dispose(); orbit.current = null; };
  }, [camera, gl, invalidate]);
  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    camera.fov = mobile ? 46 : 43; camera.updateProjectionMatrix();
    const focus = selected ? FOCUS[selected] : null;
    let position = focus?.position ?? ([.65, mobile ? 3.9 : 3.45, mobile ? 12.5 : 10.7] as [number,number,number]);
    let target = focus?.target ?? ([0, mobile ? 2.65 : 2.1, -.5] as [number,number,number]);
    if (phase === "intro") { position = [0, 3.5, mobile ? 15 : 14]; target = [0, 2.55, -.25]; }
    if (mobile && focus) { position = [focus.position[0], focus.position[1] + .6, focus.position[2] + 1.2]; target = [focus.target[0], focus.target[1] + .30, focus.target[2]]; }
    // Leave the left side visible beside the reading panel on desktop.
    if (opened && !mobile && focus) target = [focus.target[0] + .7, focus.target[1], focus.target[2]];
    move.current = { position: new THREE.Vector3(...position), target: new THREE.Vector3(...target) };
    if (orbit.current) orbit.current.enabled = false;
    invalidate();
  }, [camera, mobile, selected, reset, phase, opened, invalidate]);
  useFrame((_, dt) => {
    if (!orbit.current) return;
    const controls = orbit.current;
    if (move.current) {
      const alpha = reducedMotion ? 1 : 1 - Math.exp(-5 * Math.min(dt,.08));
      camera.position.lerp(move.current.position, alpha); controls.target.lerp(move.current.target,alpha);
      if (camera.position.distanceTo(move.current.position)<.018 && controls.target.distanceTo(move.current.target)<.01) {
        camera.position.copy(move.current.position);controls.target.copy(move.current.target);move.current=null;
      }
    }
    controls.enabled = !move.current && phase === "hall" && !opened;
    controls.update();
  });
  return null;
}

function Environment({ onFailure }: { onFailure: () => void }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    const generator = new THREE.PMREMGenerator(gl); const room = new RoomEnvironment();
    const target = generator.fromScene(room,.04);scene.environment=target.texture;scene.environmentIntensity=.52;
    const lost = (event: Event) => { event.preventDefault();onFailure(); };
    gl.domElement.addEventListener("webglcontextlost",lost);
    return () => { gl.domElement.removeEventListener("webglcontextlost",lost);scene.environment=null;target.dispose();room.dispose();generator.dispose(); };
  },[gl,scene,onFailure]);
  return null;
}

function GroundShadows() {
  const map = useMemo(() => {
    const canvas = document.createElement("canvas");canvas.width=canvas.height=128;
    const ctx=canvas.getContext("2d")!;const gradient=ctx.createRadialGradient(64,64,4,64,64,64);
    gradient.addColorStop(0,"rgba(0,0,0,.85)");gradient.addColorStop(.5,"rgba(0,0,0,.40)");gradient.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
    return new THREE.CanvasTexture(canvas);
  },[]);
  useEffect(()=>()=>map.dispose(),[map]);
  return <group>{[[0, -.25, 4.4, 3.6],[-2.85,.95,2.6,1.9],[2.85,1.05,2.8,2.2]].map(([x,z,w,h])=><mesh key={x} position={[x,.057,z]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[w,h]}/><meshBasicMaterial map={map} transparent depthWrite={false} opacity={.8}/></mesh>)}</group>;
}

function Atmosphere({ still }: { still: boolean }) {
  const points=useRef<THREE.Points>(null);
  const positions=useMemo(()=>Float32Array.from({length:210*3},(_,i)=>i%3===0 ? (((i*137)%997)/997-.5)*12 : i%3===1 ? ((i*211)%991)/991*5 : ((i*59)%983)/983*8-4),[]);
  useFrame((_,dt)=>{if(points.current&&!still)points.current.rotation.y+=Math.min(dt,.06)*.007;});
  return <points ref={points}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions,3]}/></bufferGeometry><pointsMaterial color="#c1ac7f" transparent opacity={.26} size={.012} depthWrite={false}/></points>;
}

function MotionClock({ still, selected, opened, phase, reset, ritual, reducedMotion }: FineSceneProps) {
  const invalidate=useThree((state)=>state.invalidate);
  useEffect(()=>{
    let interval: number | null = null;
    let end: number | null = null;
    const stop=()=>{if(interval!==null)window.clearInterval(interval);if(end!==null)window.clearTimeout(end);interval=end=null;};
    const begin=()=>{
      stop();if(document.hidden)return;invalidate();
      if(reducedMotion)return;
      interval=window.setInterval(()=>{if(!document.hidden)invalidate();},1000/20);
      if(still)end=window.setTimeout(stop,1800);
    };
    begin();document.addEventListener("visibilitychange",begin);
    return()=>{stop();document.removeEventListener("visibilitychange",begin);};
  },[still,selected,opened,phase,reset,ritual,reducedMotion,invalidate]);
  return null;
}

export default function FineTempleScene(props: FineSceneProps) {
  return <Canvas frameloop="demand" camera={{ position:[0,3.5,14], fov:43, near:.1, far:40 }} dpr={1} shadows={{type:THREE.PCFSoftShadowMap}} gl={{antialias:true,alpha:false,powerPreference:"low-power"}} onCreated={({gl})=>{gl.setClearColor("#080b0b");gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.05;}} style={{cursor:props.hovered?"pointer":"grab"}}>
    <fog attach="fog" args={["#0b1010",11,25]}/>
    <Environment onFailure={props.onFailure}/><Camera {...props}/>
    <ambientLight color="#aebbb6" intensity={.08}/>
    <directionalLight position={[3.6,7,5]} color="#e5ddca" intensity={2.2} castShadow shadow-mapSize={[512,512]} shadow-camera-left={-7} shadow-camera-right={7} shadow-camera-top={7} shadow-camera-bottom={-5} shadow-camera-far={22} shadow-bias={-.0004} shadow-normalBias={.025}/>
    <directionalLight position={[-4,4,-3]} color="#7d9e9b" intensity={.75}/>
    <spotLight position={[-2,6,1]} target-position={[0,1.8,0]} color="#ecc48d" intensity={24} angle={.65} penumbra={.8} distance={15}/>
    {[[-1.98,1.03,-2.55],[2.02,1.03,-2.35],[-3.70,1.03,.52]].map(([x,y,z])=><group key={x} position={[x,y,z]}><mesh scale={[.012,.042,.012]}><sphereGeometry args={[1,8,8]}/><meshBasicMaterial color="#ffe1a0"/></mesh><pointLight color="#f4ad57" intensity={5} distance={4.5} decay={2}/></group>)}
    <Suspense fallback={null}><RefinedAssets {...props}/><GroundShadows/></Suspense>
    <Atmosphere still={props.still}/>
    <MotionClock {...props}/>
  </Canvas>;
}
