"use client";

import { useMemo } from "react";
import { useLoader } from "@react-three/fiber";
import * as THREE from "three";

// The distant image is an environment plate; the ground and debris remain spatial geometry.
export default function RelationshipWorld({ visible }: { visible: boolean }) {
  const backdrop = useLoader(THREE.TextureLoader, "/observatory/relationship-void-v1.png");
  const mineral = useLoader(THREE.TextureLoader, "/observatory/obsidian-mineral-v1.png");
  const fragments = useMemo(() => Array.from({ length: 24 }, (_, i) => {
    const a = i * 2.39996, radius = 2.3 + (i % 6) * .42;
    return { position: [-3.65 + Math.sin(a) * radius, .1 + (i % 5) * .2, -.55 + Math.cos(a) * radius] as [number, number, number], size: .075 + (i % 4) * .065, rotation: [a * .4, a, a * .7] as [number, number, number] };
  }), []);
  return <group visible={visible}>
    <mesh position={[-3.65, 2.15, -12]}>
      <planeGeometry args={[31, 14]}/>
      <meshBasicMaterial map={backdrop} toneMapped={false} depthWrite={false}/>
    </mesh>
    <mesh position={[-3.65, -.09, -.55]} receiveShadow>
      <cylinderGeometry args={[6.3, 6.3, .16, 96]}/>
      <meshPhysicalMaterial map={mineral} color="#273042" metalness={.25} roughness={.42} bumpMap={mineral} bumpScale={.026} envMapIntensity={.65}/>
    </mesh>
    {[1.55, 2.2, 3.15, 4.7].map((radius) => <mesh key={radius} position={[-3.65,.004,-.55]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius, radius + .008, 128]}/>
      <meshBasicMaterial color="#b6a1bf" transparent opacity={radius < 3 ? .34 : .15} depthWrite={false}/>
    </mesh>)}
    {fragments.map((fragment, i) => <mesh key={i} position={fragment.position} rotation={fragment.rotation} scale={fragment.size}>
      <icosahedronGeometry args={[1, 1]}/>
      <meshStandardMaterial map={mineral} color="#505567" metalness={.14} roughness={.83}/>
    </mesh>)}
    <pointLight position={[-3.65, 2.3, -2.5]} intensity={12} color="#d4c6ff" distance={5}/>
  </group>;
}
