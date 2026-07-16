"use client"

import { useRef, useMemo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"

function GradientBlob({ position, color, size, speed, mixColor }: {
  position: [number, number, number]
  color: string
  size: number
  speed: number
  mixColor: string
}) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime() * speed
      meshRef.current.position.x = position[0] + Math.sin(t) * 0.5
      meshRef.current.position.y = position[1] + Math.cos(t * 0.7) * 0.3
      meshRef.current.position.z = position[2] + Math.sin(t * 0.5) * 0.2
      meshRef.current.rotation.x = t * 0.1
      meshRef.current.rotation.y = t * 0.15
    }
  })

  const geometry = useMemo(() => new THREE.SphereGeometry(1, 64, 64), [])

  return (
    <mesh ref={meshRef} geometry={geometry} position={position} scale={size}>
      <meshStandardMaterial
        color={color}
        emissive={mixColor}
        emissiveIntensity={0.2}
        roughness={0.3}
        metalness={0.7}
        transparent
        opacity={0.6}
      />
    </mesh>
  )
}

export function GradientMeshBackground({ colors = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b"] }: { colors?: string[] }) {
  const blobs = useMemo(() => [
    { position: [-6, 3, -8] as [number, number, number], color: colors[0], size: 2.5, speed: 0.8, mixColor: colors[1] },
    { position: [7, -2, -10] as [number, number, number], color: colors[1], size: 3, speed: 0.6, mixColor: colors[2] },
    { position: [-5, -3, -12] as [number, number, number], color: colors[2], size: 2, speed: 1, mixColor: colors[3] },
    { position: [8, 4, -6] as [number, number, number], color: colors[3], size: 2.8, speed: 0.5, mixColor: colors[0] },
    { position: [0, 0, -15] as [number, number, number], color: colors[0], size: 1.5, speed: 1.2, mixColor: colors[2] },
  ], [colors])

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 12], fov: 50 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        <pointLight position={[-10, -10, -10]} intensity={0.3} />
        {blobs.map((blob, i) => (
          <GradientBlob key={i} {...blob} />
        ))}
      </Canvas>
    </div>
  )
}