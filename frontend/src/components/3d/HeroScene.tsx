"use client";

import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { StudyOrb } from "./StudyOrb";
import { ParticleField } from "./ParticleField";

import styles from './HeroScene.module.css';

function NoWebGLFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className={styles.fallback} />
    </div>
  );
}

function detectWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
    );
  } catch (err) {
    console.error('[HeroScene] WebGL detection failed:', err);
    return false;
  }
}

export function HeroScene() {
  const [webGLSupported] = useState(() =>
    typeof window !== 'undefined' ? detectWebGL() : true
  );
  const [isMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  if (!webGLSupported) {
    return <NoWebGLFallback />;
  }

  const particleCount = isMobile ? 800 : 2000;

  return (
    <>
      <Canvas
        dpr={isMobile ? 1 : Math.min(window.devicePixelRatio, 2)}
        camera={{ fov: 60, position: [0, 0, 5], near: 0.1, far: 100 }}
        gl={{
          antialias: !isMobile,
          alpha: true,
          powerPreference: "high-performance",
        }}
        style={{ background: "transparent" }}
      >
        {/* Enhanced lighting for better depth */}
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={2} color="#ffffff" />
        <pointLight position={[-10, -5, -5]} intensity={1.2} color="#8b5cf6" />
        <pointLight position={[0, 0, 10]} intensity={0.8} color="#06b6d4" />

        <Suspense fallback={null}>
          <ParticleField count={particleCount} radius={10} />
          <StudyOrb />
        </Suspense>
      </Canvas>
    </>
  );
}
