"use client";

import { Float, PerspectiveCamera, Sparkles } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { OnboardingPhase } from "@/components/onboarding/onboarding-shell";

type PortalProps = {
  phase: OnboardingPhase;
  reducedMotion: boolean;
  compact: boolean;
};

type KnowledgePortalProps = PortalProps & {
  onReady?: () => void;
};

const shardPositions: Array<[number, number, number, number]> = [
  [-3.2, 1.8, -1.2, 0.13], [-2.5, -2.2, -0.5, 0.09],
  [-1.6, 2.7, -1.5, 0.08], [2.8, 2.1, -0.8, 0.11],
  [3.5, -1.5, -1.7, 0.08], [1.8, -2.8, -0.6, 0.1],
  [3.8, 0.4, -2.3, 0.06], [-3.7, -0.2, -2.1, 0.07],
];

function PortalRig({ phase, reducedMotion, compact }: PortalProps) {
  const group = useRef<THREE.Group>(null);
  const rings = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const shell = useRef<THREE.Mesh>(null);
  const camera = useRef<THREE.PerspectiveCamera>(null);
  const baseX = compact ? 0 : 1.55;

  useFrame((state, delta) => {
    const entering = phase === "entering";
    const creating = phase === "create";
    const targetZ = entering ? 2.25 : creating ? 5.8 : 6.4;
    const ease = 1 - Math.pow(0.001, delta);

    if (!camera.current) return;
    camera.current.position.z = THREE.MathUtils.lerp(camera.current.position.z, targetZ, ease);
    camera.current.position.x = THREE.MathUtils.lerp(camera.current.position.x, entering || creating ? 0 : state.pointer.x * 0.18, ease);
    camera.current.position.y = THREE.MathUtils.lerp(camera.current.position.y, entering ? 0 : state.pointer.y * 0.12, ease);
    camera.current.lookAt(0, 0, 0);

    if (!group.current || !rings.current || !core.current || !shell.current) return;
    group.current.position.x = THREE.MathUtils.lerp(
      group.current.position.x,
      entering ? 0 : creating ? compact ? 0 : 0.85 : baseX,
      ease,
    );
    const targetScale = entering ? 1.6 : creating ? compact ? 0.86 : 1.3 : compact ? 0.82 : 1;
    group.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), ease);

    if (!reducedMotion) {
      const speed = entering ? 2.4 : 0.22;
      rings.current.rotation.z += delta * speed;
      rings.current.rotation.y += delta * speed * 0.42;
      core.current.rotation.x += delta * (entering ? 1.1 : 0.11);
      core.current.rotation.y += delta * (entering ? 1.45 : 0.16);
      shell.current.rotation.x -= delta * 0.08;
      shell.current.rotation.z += delta * 0.12;
      core.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 1.3) * 0.035);
    }
  });

  return (
    <>
      <PerspectiveCamera ref={camera} makeDefault position={[0, 0, 6.4]} fov={42} />
      <group ref={group} position={[baseX, compact ? -0.55 : -0.05, 0]}>
      <pointLight color="#78f3ff" intensity={18} distance={8} position={[0.8, 0.8, 2]} />
      <pointLight color="#8a6cff" intensity={14} distance={7} position={[-1.8, -1.1, 1]} />

      <Float speed={reducedMotion ? 0 : 1.25} rotationIntensity={0.16} floatIntensity={0.22}>
        <mesh ref={core}>
          <icosahedronGeometry args={[1.08, 2]} />
          <meshPhysicalMaterial
            color="#4ee9ff" emissive="#183f6a" emissiveIntensity={2.8}
            metalness={0.15} roughness={0.08} transmission={0.64} thickness={1.1}
            transparent opacity={0.92}
          />
        </mesh>
        <mesh ref={shell} scale={1.23}>
          <icosahedronGeometry args={[1.08, 2]} />
          <meshBasicMaterial color="#d8fbff" wireframe transparent opacity={0.24} />
        </mesh>
      </Float>

      <group ref={rings}>
        <mesh rotation={[1.08, 0.28, 0.1]}>
          <torusGeometry args={[1.72, 0.012, 8, 180]} />
          <meshBasicMaterial color="#78f3ff" transparent opacity={0.72} />
        </mesh>
        <mesh rotation={[0.2, 0.85, 1.15]}>
          <torusGeometry args={[2.08, 0.009, 8, 180]} />
          <meshBasicMaterial color="#8a6cff" transparent opacity={0.58} />
        </mesh>
        <mesh rotation={[0.85, 1.2, -0.65]}>
          <torusGeometry args={[2.48, 0.006, 8, 180]} />
          <meshBasicMaterial color="#effcff" transparent opacity={0.24} />
        </mesh>
      </group>

      {shardPositions.map(([x, y, z, size], index) => (
        <Float key={`${x}-${y}`} speed={reducedMotion ? 0 : 0.7 + index * 0.06} rotationIntensity={0.5} floatIntensity={0.45}>
          <mesh position={[x, y, z]} rotation={[x, y, z]}>
            <octahedronGeometry args={[size, 0]} />
            <meshBasicMaterial color={index % 2 ? "#78f3ff" : "#8a6cff"} wireframe transparent opacity={0.62} />
          </mesh>
        </Float>
      ))}

      <Sparkles
        count={compact ? 42 : 105} scale={compact ? 7 : 10} size={compact ? 1.2 : 1.7}
        speed={reducedMotion ? 0 : 0.22} opacity={0.6} color="#9eefff"
      />
      </group>
    </>
  );
}

export function KnowledgePortal({ onReady, ...props }: KnowledgePortalProps) {
  return (
    <div className="onboarding-canvas" aria-hidden="true">
      <Canvas
        dpr={[1, 1.5]} frameloop={props.reducedMotion ? "demand" : "always"}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        onCreated={onReady}
      >
        <ambientLight intensity={0.25} />
        <PortalRig {...props} />
      </Canvas>
    </div>
  );
}
