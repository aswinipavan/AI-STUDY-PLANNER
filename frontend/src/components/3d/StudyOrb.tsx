"use client";

import { useRef, useState, useCallback, useEffect as import_react_useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  uniform float uTime;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    
    // Subtle vertex displacement for organic feel
    float displacement = sin(position.x * 3.0 + uTime) * 0.05
                       + cos(position.y * 2.5 + uTime * 0.8) * 0.05
                       + sin(position.z * 2.0 + uTime * 1.2) * 0.05;
    
    vec3 newPosition = position + normal * displacement;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

const fragmentShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  uniform float uTime;

  void main() {
    float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.5);
    
    // Blue-purple gradient
    vec3 coreColor = vec3(0.23, 0.51, 0.98);   // #3b82f6
    vec3 rimColor  = vec3(0.55, 0.36, 0.96);   // #8b5cf6
    vec3 glowColor = vec3(0.0, 0.8, 1.0);       // cyan accent

    vec3 color = mix(coreColor, rimColor, fresnel);
    color = mix(color, glowColor, fresnel * 0.3 * (sin(uTime * 0.7) * 0.5 + 0.5));
    
    float alpha = 0.55 + fresnel * 0.45;
    gl_FragColor = vec4(color, alpha);
  }
`;

function TorusRing({
  radius,
  tube,
  rotationAxis,
  speed,
  color,
}: {
  radius: number;
  tube: number;
  rotationAxis: [number, number, number];
  speed: number;
  color: string;
}) {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.x += rotationAxis[0] * delta * speed;
    ref.current.rotation.y += rotationAxis[1] * delta * speed;
    ref.current.rotation.z += rotationAxis[2] * delta * speed;
  });

  return (
    <mesh ref={ref}>
      <torusGeometry args={[radius, tube, 16, 80]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.6}
        transparent
        opacity={0.35}
        wireframe
      />
    </mesh>
  );
}

export function StudyOrb() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);
  const groupRef = useRef<THREE.Group>(null!);
  useThree();

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const materialRef = useRef<THREE.ShaderMaterial>(null!);
  const initialUniforms = useMemo(() => ({
    uTime: { value: 0 },
  }), []);

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: -(e.clientY / window.innerHeight - 0.5) * 2,
      });
    },
    []
  );

  // Attach global pointer listener in useEffect (Pure)
  import_react_useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [handlePointerMove]);

  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta;
    }
    const t = materialRef.current ? materialRef.current.uniforms.uTime.value : 0;

    if (meshRef.current) {
      // Breathing scale
      const scale = 1 + Math.sin(t * 0.8) * 0.04;
      meshRef.current.scale.setScalar(scale);
    }

    if (glowRef.current) {
      const glowScale = 1.15 + Math.sin(t * 0.8 + 0.5) * 0.06;
      glowRef.current.scale.setScalar(glowScale);
    }

    if (groupRef.current) {
      // Slow idle rotation
      groupRef.current.rotation.y += delta * 0.15;
      groupRef.current.rotation.x += delta * 0.05;
      // Mouse parallax
      groupRef.current.rotation.x +=
        (mousePos.y * 0.3 - groupRef.current.rotation.x) * 0.05;
      groupRef.current.rotation.y +=
        (mousePos.x * 0.3 - groupRef.current.rotation.y + t * 0.15) * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Core orb with shader */}
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1.2, 6]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={initialUniforms}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Glow shell */}
      <mesh ref={glowRef}>
        <icosahedronGeometry args={[1.2, 4]} />
        <meshStandardMaterial
          color="#3b82f6"
          emissive="#6366f1"
          emissiveIntensity={0.4}
          transparent
          opacity={0.08}
          wireframe
        />
      </mesh>

      {/* Orbiting torus rings */}
      <TorusRing
        radius={2.0}
        tube={0.015}
        rotationAxis={[0.3, 1.0, 0.2]}
        speed={0.4}
        color="#3b82f6"
      />
      <TorusRing
        radius={2.5}
        tube={0.012}
        rotationAxis={[0.8, 0.2, 0.6]}
        speed={0.25}
        color="#8b5cf6"
      />
      <TorusRing
        radius={1.7}
        tube={0.010}
        rotationAxis={[0.1, 0.5, 1.0]}
        speed={0.6}
        color="#06b6d4"
      />

      {/* Central point light for bloom effect */}
      <pointLight color="#3b82f6" intensity={4} distance={6} decay={2} />
    </group>
  );
}
