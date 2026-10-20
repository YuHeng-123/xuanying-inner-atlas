"use client";

import { Canvas, useFrame, useLoader, useThree, type ThreeEvent } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { FineSceneProps } from "./FineTempleScene";
import type { ExperienceObjectId } from "./experienceObjects";
import RelationshipSculpture from "./RelationshipSculpture";
import RelationshipWorld from "./RelationshipWorld";

export interface ObservatoryProps extends FineSceneProps {
  markerRoot: RefObject<HTMLDivElement>;
  onArrive: (id: ExperienceObjectId | null) => void;
}
const ROOTS: Record<string, ExperienceObjectId> = { root_disc: "disc", root_relationships: "relationships", root_divination: "divination", root_archive: "archive" };
const ANCHORS: Record<ExperienceObjectId, [number, number, number]> = { disc: [0, 2.42, .35], relationships: [-3.65, 2.65, -.55], divination: [3.35, 1.52, 1], archive: [-3.8, 2.95, -4.4] };
const FOCUS: Record<ExperienceObjectId, { position: [number, number, number]; target: [number, number, number] }> = {
  disc: { position: [1, 3.4, 5.3], target: [0, 1.45, .35] },
  relationships: { position: [-3.1, 2.1, 3.85], target: [-3.65, 1.5, -.55] },
  divination: { position: [4.3, 3.1, 4.7], target: [3.35, 1.25, 1] },
  archive: { position: [-2.7, 2.4, -.45], target: [-3.8, 1.6, -4.4] },
};

function semantic(object: THREE.Object3D) {
  let current: THREE.Object3D | null = object;
  while (current) { if (ROOTS[current.name]) return ROOTS[current.name]; current = current.parent; }
  return null;
}

function Assets(props: ObservatoryProps) {
  const gltf = useLoader(GLTFLoader, "/observatory/observatory.glb", (loader) => {
    const decoder = new DRACOLoader(); decoder.setDecoderPath("/temple/draco/"); decoder.setWorkerLimit(1); loader.setDRACOLoader(decoder);
  });
  const gl = useThree((s) => s.gl);
  const grain = useMemo(() => {
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d")!; const pixels = ctx.createImageData(256, 256);
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const value = 135 + ((x * 137 + y * 211 + x * y * 13) % 31) + Math.sin(x * .049) * Math.sin(y * .037) * 8;
      const index = (y * 256 + x) * 4; pixels.data[index] = pixels.data[index + 1] = pixels.data[index + 2] = value; pixels.data[index + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0); const texture = new THREE.CanvasTexture(canvas); texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(4, 4); return texture;
  }, []);
  useEffect(() => () => grain.dispose(), [grain]);
  const model = useMemo(() => {
    const copy = gltf.scene.clone(true); const materials = new Map<THREE.Material, THREE.Material>();
    copy.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = !object.name.includes("glass"); object.receiveShadow = true;
      const prepare = (source: THREE.Material) => {
        if (materials.has(source)) return materials.get(source)!;
        const mat = source.clone(); materials.set(source, mat);
        if (mat instanceof THREE.MeshStandardMaterial) {
          mat.envMapIntensity = mat.metalness > .5 ? .55 : .12;
          if (mat.name.includes("microcement") || mat.name.includes("flooring")) {
            mat.color.multiplyScalar(.42); mat.normalMap = null; mat.bumpMap = grain; mat.bumpScale = .003;
            mat.roughness = mat.name.includes("flooring") ? .45 : .82;
          } else if (mat.name.includes("titanium")) mat.color.multiplyScalar(.48);
          else if (mat.name.includes("black ceramic")) mat.color.multiplyScalar(.28);
          if (mat.transparent) { mat.depthWrite = false; mat.side = THREE.DoubleSide; mat.opacity = mat.name.includes("flow") ? .28 : .17; }
          if (mat.normalMap) mat.normalScale.set(.19, .19);
          [mat.map, mat.normalMap, mat.roughnessMap].forEach((texture) => { if (texture) texture.anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy()); });
        }
        return mat;
      };
      object.material = Array.isArray(object.material) ? object.material.map(prepare) : prepare(object.material);
    });
    const oldFlow = copy.getObjectByName("root_relationships"); if (oldFlow) oldFlow.visible = false;
    return copy;
  }, [gltf, gl, grain]);
  useEffect(() => () => { const materials = new Set<THREE.Material>(); model.traverse((ob) => { if (ob instanceof THREE.Mesh) (Array.isArray(ob.material) ? ob.material : [ob.material]).forEach((m) => materials.add(m)); }); materials.forEach((m) => m.dispose()); }, [model]);
  useEffect(() => {
    for (const name of ["root_room", "root_disc", "root_divination", "root_archive"]) {
      const object = model.getObjectByName(name); if (object) object.visible = props.selected !== "relationships";
    }
  }, [model, props.selected]);
  const parts = useMemo(() => Object.fromEntries(["plate_sky", "plate_earth", "plate_human", "disc_ring", "relationship_flow", "div_ring", "cup_0", "cup_1", "coin_0", "coin_1", "coin_2"].map((name) => {
    const object = model.getObjectByName(name); return [name, object ? { object, position: object.position.clone(), rotation: object.rotation.clone() } : null];
  })), [model]);
  const castStarted = useRef(0); const ready = useRef(false);
  useEffect(() => { if (props.ritual) { const duration = props.ritual.kind === "lot" ? 2800 : 1400; castStarted.current = performance.now() - (props.reducedMotion ? duration : 0); } }, [props.ritual, props.reducedMotion]);
  useFrame((_, dt) => {
    if (!ready.current) { ready.current = true; props.onReady(); }
    const delta = Math.min(dt, .06);
    ["plate_human", "plate_earth", "plate_sky"].forEach((name, index) => {
      const part = parts[name]; if (!part) return;
      const goal = part.position.y + (props.selected === "disc" ? .07 + index * .18 : 0);
      part.object.position.y = props.reducedMotion ? goal : THREE.MathUtils.damp(part.object.position.y, goal, 7, delta);
    });
    const flow = parts.relationship_flow;
    if (flow) flow.object.rotation.y = props.reducedMotion ? (props.selected === "relationships" ? .28 : 0) : THREE.MathUtils.damp(flow.object.rotation.y, props.selected === "relationships" ? .28 : 0, 6, delta);
    if (!props.still) { if (parts.disc_ring) parts.disc_ring.object.rotation.y += delta * .035; if (parts.div_ring) parts.div_ring.object.rotation.y -= delta * .07; }
    if (!props.ritual || !castStarted.current) return;
    const duration = props.ritual.kind === "lot" ? 2800 : 1400;
    const t = Math.min(1, (performance.now() - castStarted.current) / duration);
    if (props.ritual.kind === "choice") { if (parts.div_ring && t < 1) parts.div_ring.object.rotation.y += delta * 6 * (1 - t); return; }
    if (props.ritual.kind === "lot") { if (parts.div_ring && t < 1) parts.div_ring.object.rotation.y += delta * 5 * (1 - t); return; }
    const coins = props.ritual.kind === "coins";
    for (let i = 0; i < (coins ? 3 : 2); i++) {
      const part = parts[`${coins ? "coin" : "cup"}_${i}`]; if (!part) continue;
      const up = coins ? i < (props.ritual.line ?? 7) - 6 : props.ritual.faces?.[i] === "平面";
      const landedAngle = coins ? (up ? 0 : Math.PI) : (up ? Math.PI : 0);
      part.object.position.copy(part.position); part.object.position.y += Math.sin(t * Math.PI) * .48;
      part.object.rotation.set(part.rotation.x + (1 - t) * Math.PI * (5 + i) + landedAngle * t, part.rotation.y, part.rotation.z);
    }
  });
  const select = (event: ThreeEvent<MouseEvent>) => {
    if (event.delta > 5 || props.phase !== "hall" || props.opened) return;
    const id = semantic(event.object); if (id) { event.stopPropagation(); props.onSelect(id); }
  };
  return <primitive object={model} onClick={select} onPointerOver={(e: ThreeEvent<PointerEvent>) => { if (props.phase !== "hall" || props.opened) return; const id = semantic(e.object); if (id) { e.stopPropagation(); props.onHover(id); } }} onPointerOut={() => props.onHover(null)}/>;
}

function Camera(props: ObservatoryProps) {
  const { camera, gl, invalidate, size } = useThree(); const orbit = useRef<OrbitControls | null>(null);
  const move = useRef<{ from: THREE.Vector3; fromTarget: THREE.Vector3; position: THREE.Vector3; target: THREE.Vector3; start: number; id: ExperienceObjectId | null } | null>(null);
  const mobile = size.width < 650;
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement); orbit.current = controls;
    controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = .12; controls.rotateSpeed = .35; controls.zoomSpeed = .4;
    controls.minDistance = 2.2; controls.maxDistance = 26; controls.minPolarAngle = .58; controls.maxPolarAngle = 1.52; controls.minAzimuthAngle = -.8; controls.maxAzimuthAngle = .8;
    controls.target.set(0, 1.45, -.7); controls.update();
    const changed = () => { if (!move.current) invalidate(); }; controls.addEventListener("change", changed);
    return () => { controls.removeEventListener("change", changed); controls.dispose(); orbit.current = null; };
  }, [camera, gl, invalidate]);
  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera) || !orbit.current) return;
    camera.fov = mobile ? 48 : 43; camera.updateProjectionMatrix();
    const focus = props.selected ? FOCUS[props.selected] : null;
    let position = new THREE.Vector3(...(focus?.position ?? [0, 4.6, mobile ? 23 : 10.8]));
    let target = new THREE.Vector3(...(focus?.target ?? [0, 1.45, -.7]));
    if (props.phase === "intro") { position = new THREE.Vector3(0, 4.7, mobile ? 25 : 13.6); target.set(0, 1.6, -1); }
    if (focus && mobile) { position.add(new THREE.Vector3(-.35, .4, 1.4)); target.y -= .35; }
    if (focus && !mobile) { target.x += .6; position.x += .6; }
    if (props.opened && !mobile) { target.x += .5; position.x += .5; }
    move.current = { from: camera.position.clone(), fromTarget: orbit.current.target.clone(), position, target, start: performance.now(), id: props.selected };
    orbit.current.enabled = false; invalidate();
  }, [camera, mobile, size.height, props.selected, props.opened, props.phase, props.reset, invalidate]);
  const projected = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const controls = orbit.current; if (!controls) return;
    if (move.current) {
      const goal = move.current; const t = props.reducedMotion ? 1 : Math.min(1, (performance.now() - goal.start) / 1150);
      const eased = t * t * (3 - 2 * t);
      camera.position.lerpVectors(goal.from, goal.position, eased); controls.target.lerpVectors(goal.fromTarget, goal.target, eased);
      if (t === 1) { move.current = null; props.onArrive(goal.id); }
    }
    controls.enabled = !move.current && props.phase === "hall" && !props.opened; controls.update();
    gl.domElement.dataset.camera = camera.position.toArray().map((n) => n.toFixed(3)).join(",");
    const root = props.markerRoot.current;
    if (root) Object.entries(ANCHORS).forEach(([id, point]) => {
      const marker = root.querySelector<HTMLElement>(`[data-anchor="${id}"]`); if (!marker) return;
      projected.set(...point).project(camera);
      marker.style.transform = `translate(${(projected.x + 1) * size.width / 2}px,${(1 - projected.y) * size.height / 2}px) translate(-50%,-50%)`;
      marker.style.visibility = Math.abs(projected.x) > .98 || Math.abs(projected.y) > .88 || projected.z > 1 || props.opened || props.phase !== "hall" || (props.selected !== null && props.selected !== id) ? "hidden" : "visible";
    });
  });
  return null;
}

function Environment({ onFailure }: { onFailure: () => void }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    const generator = new THREE.PMREMGenerator(gl); const room = new RoomEnvironment(); const target = generator.fromScene(room, .045);
    scene.environment = target.texture; scene.environmentIntensity = .4;
    const lost = (event: Event) => { event.preventDefault(); onFailure(); }; gl.domElement.addEventListener("webglcontextlost", lost);
    return () => { gl.domElement.removeEventListener("webglcontextlost", lost); scene.environment = null; target.dispose(); room.dispose(); generator.dispose(); };
  }, [gl, scene, onFailure]);
  return null;
}

function NightSky() {
  const positions = useMemo(() => Float32Array.from({ length: 310 * 3 }, (_, i) => i % 3 === 0 ? (((i * 137) % 997) / 997 - .5) * 14 : i % 3 === 1 ? ((i * 211) % 991) / 991 * 10 : -9 - ((i * 59) % 983) / 983 * 3), []);
  return <points><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]}/></bufferGeometry><pointsMaterial color="#c7d7ea" size={.025} transparent opacity={.8} depthWrite={false}/></points>;
}

function MotionClock(props: ObservatoryProps) {
  const invalidate = useThree((s) => s.invalidate); const size = useThree((s) => s.size);
  useEffect(() => {
    let interval: number | null = null; let end: number | null = null;
    const stop = () => { if (interval !== null) window.clearInterval(interval); if (end !== null) window.clearTimeout(end); interval = end = null; };
    const begin = () => { stop(); if (document.hidden) return; invalidate(); if (props.reducedMotion) return; interval = window.setInterval(() => { if (!document.hidden) invalidate(); }, 50); if (props.still) end = window.setTimeout(stop, 1850); };
    begin(); document.addEventListener("visibilitychange", begin); return () => { stop(); document.removeEventListener("visibilitychange", begin); };
  }, [props.still, props.selected, props.opened, props.phase, props.reset, props.ritual, props.reducedMotion, size.width, size.height, invalidate]);
  return null;
}

export default function ObservatoryScene(props: ObservatoryProps) {
  return <Canvas frameloop="demand" camera={{ position: [0, 4.7, 13.6], fov: 43, near: .1, far: 45 }} dpr={1} shadows={{ type: THREE.PCFSoftShadowMap }} gl={{ antialias: true, alpha: false, powerPreference: "low-power" }} onCreated={({ gl }) => { gl.setClearColor("#080d15"); gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.1; }} style={{ cursor: props.hovered ? "pointer" : "grab" }}>
    <Environment onFailure={props.onFailure}/><Camera {...props}/>
    <ambientLight color="#a1b3ce" intensity={.065}/>
    <directionalLight position={[-3, 7, 5]} color="#e5eef7" intensity={1.75} castShadow shadow-mapSize={[512, 512]} shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={7} shadow-camera-bottom={-5} shadow-camera-far={25} shadow-bias={-.0003} shadow-normalBias={.018}/>
    <directionalLight position={[5, 4, -5]} color="#88bde8" intensity={.65}/>
    <pointLight position={[-3.7, 2.8, -.5]} color="#a392d4" intensity={3.2} distance={5}/>
    <pointLight position={[3.2, 2.4, 1]} color="#ddc296" intensity={3.8} distance={4.5}/>
    <Suspense fallback={null}><Assets {...props}/><RelationshipWorld visible={props.selected === "relationships"}/><RelationshipSculpture selected={props.selected === "relationships"} reducedMotion={props.reducedMotion} onSelect={() => { if (props.phase === "hall" && !props.opened) props.onSelect("relationships"); }} onHover={hovered => props.onHover(hovered && props.phase === "hall" && !props.opened ? "relationships" : null)}/></Suspense><NightSky/><MotionClock {...props}/>
  </Canvas>;
}
