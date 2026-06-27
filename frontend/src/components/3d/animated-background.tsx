"use client"

import { useRef, useMemo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Float, MeshDistortMaterial } from "@react-three/drei"
import * as THREE from "three"

function FloatingShape({ position, color, scale, speed, type }: {
  position: [number, number, number]
  color: string
  scale: number
  speed: number
  type: "torus" | "octahedron" | "icosahedron" | "dodecahedron"
}) {
  const ref = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.x = clock.getElapsedTime() * speed * 0.3
      ref.current.rotation.y = clock.getElapsedTime() * speed * 0.2
    }
  })

  const geometry = useMemo(() => {
    switch (type) {
      case "torus": return new THREE.TorusGeometry(1, 0.3, 16, 32)
      case "octahedron": return new THREE.OctahedronGeometry(1)
      case "icosahedron": return new THREE.IcosahedronGeometry(1)
      case "dodecahedron": return new THREE.DodecahedronGeometry(1)
    }
  }, [type])

  return (
    <Float speed={speed * 0.5} rotationIntensity={0.2} floatIntensity={0.5}>
      <mesh ref={ref} position={position} scale={scale} geometry={geometry}>
        <MeshDistortMaterial
          color={color}
          transparent
          opacity={0.15}
          wireframe
          distort={0.1}
          speed={1}
        />
      </mesh>
    </Float>
  )
}

function Scene() {
  const shapes = useMemo(() => [
    { position: [-4, 2, -5] as [number, number, number], color: "#6366f1", scale: 0.8, speed: 0.5, type: "torus" as const },
    { position: [5, -1, -8] as [number, number, number], color: "#8b5cf6", scale: 1.2, speed: 0.3, type: "octahedron" as const },
    { position: [-3, -2, -12] as [number, number, number], color: "#06b6d4", scale: 0.6, speed: 0.7, type: "icosahedron" as const },
    { position: [6, 3, -10] as [number, number, number], color: "#f59e0b", scale: 0.7, speed: 0.4, type: "dodecahedron" as const },
    { position: [0, -1.5, -6] as [number, number, number], color: "#ec4899", scale: 0.5, speed: 0.6, type: "torus" as const },
    { position: [-5, -0.5, -15] as [number, number, number], color: "#10b981", scale: 1.0, speed: 0.2, type: "octahedron" as const },
    { position: [4, 1.5, -14] as [number, number, number], color: "#6366f1", scale: 0.9, speed: 0.35, type: "icosahedron" as const },
  ], [])

  return (
    <>
      {shapes.map((s, i) => (
        <FloatingShape key={i} {...s} />
      ))}
    </>
  )
}

export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Scene />
      </Canvas>
    </div>
  )
}
