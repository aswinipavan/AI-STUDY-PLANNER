"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ParticleFieldProps {
  count?: number;
  radius?: number;
}

export function ParticleField({ count = 2000, radius = 8 }: ParticleFieldProps) {
  const pointsRef = useRef<THREE.Points>(null!);

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    // Pure deterministic PRNG for React purity
    const prng = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    for (let i = 0; i < count; i++) {
      // Distribute in a sphere volume using pure PRNG
      const r = radius * Math.cbrt(prng(i * 1.1));
      const theta = prng(i * 2.2) * Math.PI * 2;
      const phi = Math.acos(2 * prng(i * 3.3) - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Blue-purple color range
      const t = prng(i * 4.4);
      colors[i * 3] = 0.2 + t * 0.3;      // R: 0.2–0.5
      colors[i * 3 + 1] = 0.3 + t * 0.2;  // G: 0.3–0.5
      colors[i * 3 + 2] = 0.8 + t * 0.2;  // B: 0.8–1.0
    }

    return { positions, colors };
  }, [count, radius]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y += delta * 0.03;
    pointsRef.current.rotation.x += delta * 0.01;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        vertexColors
        transparent
        opacity={0.7}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}
