"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";

// Closed, curved volumes: the glass has a back face and an actual thickness.
function surface(t: number, angle: number, phase: number, inset = 0) {
  const twist = t * Math.PI * 1.64 + phase - .65;
  const radius = .47 + .13 * Math.sin(t * Math.PI);
  const width = (.26 + .16 * Math.sin(Math.PI * t)) * (1 - inset);
  const thickness = .065 + .045 * Math.sin(Math.PI * t);
  const radial = radius + width * Math.cos(angle);
  const tangent = thickness * Math.sin(angle);
  return new THREE.Vector3(radial * Math.cos(twist) - tangent * Math.sin(twist), .24 + t * 2.65, radial * Math.sin(twist) + tangent * Math.cos(twist));
}

function ribbon(phase: number) {
  const positions: number[] = [], uv: number[] = [], indices: number[] = [];
  const rows = 240, columns = 48;
  for (let i = 0; i <= rows; i++) for (let j = 0; j <= columns; j++) {
    const p = surface(i / rows, j / columns * Math.PI * 2, phase);
    if (phase === 0) {
      const t = i / rows, a = j / columns * Math.PI * 2;
      const crease = Math.sin(t * 173 + Math.sin(a * 7) * 2) * Math.sin(a * 23 + t * 38);
      const grain = Math.sin(t * 439 + a * 37) * Math.sin(t * 213 - a * 19);
      const displacement = (crease * .004 + grain * .0015) * Math.sin(Math.PI * t);
      const twist = t * Math.PI * 1.64 - .65;
      p.x += displacement * Math.cos(twist + a); p.z += displacement * Math.sin(twist + a);
    }
    positions.push(p.x, p.y, p.z); uv.push(j / columns, i / rows);
  }
  for (let i = 0; i < rows; i++) for (let j = 0; j < columns; j++) {
    const a = i * (columns + 1) + j, b = a + columns + 1;
    indices.push(a, b, a + 1, b, b + 1, a + 1);
  }
  for (const end of [0, rows]) {
    const center = new THREE.Vector3();
    for (let j = 0; j < columns; j++) center.add(surface(end / rows, j / columns * Math.PI * 2, phase));
    center.divideScalar(columns); const index = positions.length / 3;
    positions.push(center.x, center.y, center.z); uv.push(.5, end / rows);
    for (let j = 0; j < columns; j++) {
      const a = end * (columns + 1) + j;
      if (end === 0) indices.push(index, a, a + 1); else indices.push(index, a + 1, a);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

export default function RelationshipSculpture({ selected, reducedMotion, onSelect, onHover }: { selected: boolean; reducedMotion: boolean; onSelect: () => void; onHover: (hovered: boolean) => void }) {
  const group = useRef<THREE.Group>(null);
  const sourceTexture = useLoader(THREE.TextureLoader, "/observatory/obsidian-mineral-v1.png");
  const resources = useMemo(() => {
    const stone = ribbon(0), glass = ribbon(Math.PI), texture = sourceTexture.clone();
    texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1); texture.needsUpdate = true;
    const lines: number[] = [], sparks: number[] = [];
    for (let strand = 0; strand < 64; strand++) {
      const angle = strand * 2.39996;
      const start = (strand * .137) % .65, length = .12 + (strand % 7) * .042;
      for (let k = 0; k < 30; k++) {
        const t = start + k / 30 * length;
        const a = surface(t, angle + Math.sin(t * 23 + strand) * .14, Math.PI, .12);
        const b = surface(t + length / 30, angle + Math.sin((t + length / 30) * 23 + strand) * .14, Math.PI, .12);
        lines.push(...a.toArray(), ...b.toArray());
        if (k % 11 === 0) sparks.push(...a.toArray());
      }
    }
    const veins = new THREE.BufferGeometry(); veins.setAttribute("position", new THREE.Float32BufferAttribute(lines, 3));
    const points = new THREE.BufferGeometry(); points.setAttribute("position", new THREE.Float32BufferAttribute(sparks, 3));
    return { stone, glass, texture, veins, points };
  }, [sourceTexture]);
  useEffect(() => () => Object.values(resources).forEach(resource => resource.dispose()), [resources]);
  useFrame((_, dt) => { if (group.current) group.current.rotation.y = reducedMotion ? (selected ? .28 : 0) : THREE.MathUtils.damp(group.current.rotation.y, selected ? .28 : 0, 6, Math.min(dt, .06)); });
  const click = (event: ThreeEvent<MouseEvent>) => { if (event.delta <= 5) { event.stopPropagation(); onSelect(); } };
  return <group position={[-3.65, 0, -.55]} onClick={click} onPointerOver={e => { e.stopPropagation(); onHover(true); }} onPointerOut={() => onHover(false)}>
    <group ref={group}>
      <mesh geometry={resources.stone} castShadow receiveShadow>
        <meshPhysicalMaterial color="#aeb5c7" map={resources.texture} metalness={.15} roughness={.46} bumpMap={resources.texture} bumpScale={.045} clearcoat={.12} clearcoatRoughness={.3} envMapIntensity={1.2}/>
      </mesh>
      <mesh geometry={resources.glass}>
        <meshPhysicalMaterial color="#f5f2ff" metalness={0} roughness={.028} transmission={1} thickness={.18} ior={1.42} attenuationColor="#d8d0ed" attenuationDistance={8} clearcoat={1} clearcoatRoughness={.035} envMapIntensity={1.7} side={THREE.DoubleSide}/>
      </mesh>
      <lineSegments geometry={resources.veins} renderOrder={3}><lineBasicMaterial color="#ffe0cc" transparent opacity={.75} blending={THREE.AdditiveBlending} depthWrite={false}/></lineSegments>
      <points geometry={resources.points} renderOrder={4}><pointsMaterial color="#fff0dc" size={.013} sizeAttenuation transparent opacity={.95} blending={THREE.AdditiveBlending} depthWrite={false}/></points>
    </group>
    <mesh position={[0,.085,0]} receiveShadow><cylinderGeometry args={[1.02,1.05,.17,96]}/><meshPhysicalMaterial color="#555b6b" map={resources.texture} metalness={.24} roughness={.38} bumpMap={resources.texture} bumpScale={.025} clearcoat={.35} envMapIntensity={1.2}/></mesh>
    {[.85,.96].map(radius => <mesh key={radius} rotation={[-Math.PI/2,0,0]} position={[0,.173,0]}><ringGeometry args={[radius,radius+.002,128]}/><meshBasicMaterial color="#a38b80" transparent opacity={.55}/></mesh>)}
    <pointLight position={[0,1.65,-.65]} intensity={8} distance={3.4} color="#c9b9ff"/>
    <spotLight position={[-1.6,3.7,1.2]} target-position={[0,1.3,0]} color="#e9edff" intensity={16} angle={.55} penumbra={1} distance={6}/>
  </group>;
}
