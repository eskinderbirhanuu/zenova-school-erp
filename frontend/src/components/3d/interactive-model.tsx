"use client"

import { useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, MeshDistortMaterial } from "@react-three/drei"
import * as THREE from "three"

function ZenovaOrb() {
  const ref = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.2) * 0.2
      ref.current.rotation.y = clock.getElapsedTime() * 0.15
    }
    if (ringRef.current) {
      ringRef.current.rotation.x = Math.PI / 2.5
      ringRef.current.rotation.z = clock.getElapsedTime() * 0.1
    }
  })

  return (
    <group>
      <mesh ref={ref}>
        <icosahedronGeometry args={[1, 1]} />
        <MeshDistortMaterial
          color="#6366f1"
          transparent
          opacity={0.6}
          wireframe
          distort={0.2}
          speed={2}
        />
      </mesh>
      <mesh ref={ringRef}>
        <torusGeometry args={[1.6, 0.03, 16, 64]} />
        <meshBasicMaterial color="#6366f1" transparent opacity={0.2} />
      </mesh>
      <mesh rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[1.8, 0.02, 16, 64]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.15} />
      </mesh>
    </group>
  )
}

export function InteractiveModel({ className }: { className?: string }) {
  return (
    <div className={`h-[300px] w-full ${className ?? ""}`}>
      <Canvas camera={{ position: [0, 0, 4], fov: 45 }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        <ZenovaOrb />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          rotateSpeed={0.5}
          autoRotate
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  )
}
