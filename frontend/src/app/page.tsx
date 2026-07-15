"use client"

import React, { useEffect, useRef } from "react"
import * as THREE from "three"
import { useRouter } from "next/navigation"
import { Sparkles, ArrowRight } from "lucide-react"
import { useSetupStatus } from "@/hooks/queries"

function EcosystemScene() {
  const mountRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const width = mount.clientWidth
    const height = mount.clientHeight
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 100)
    camera.position.set(0, 0, 10.5)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    const group = new THREE.Group()
    scene.add(group)

    const coreGeo = new THREE.IcosahedronGeometry(1.15, 2)
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6, wireframe: true, transparent: true, opacity: 0.34 })
    const core = new THREE.Mesh(coreGeo, coreMat)
    group.add(core)

    const glowSprite = (() => {
      const canvas = document.createElement("canvas")
      canvas.width = 256; canvas.height = 256
      const ctx = canvas.getContext("2d")!
      const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
      grad.addColorStop(0, "rgba(6,182,212,0.40)")
      grad.addColorStop(1, "rgba(6,182,212,0)")
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, 256, 256)
      const tex = new THREE.CanvasTexture(canvas)
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })
      const sprite = new THREE.Sprite(mat)
      sprite.scale.set(5, 5, 1)
      return sprite
    })()
    group.add(glowSprite)

    const ringColors = [0x3b82f6, 0x06b6d4, 0x10b981, 0x3b82f6, 0x06b6d4]
    const orbits = ringColors.map((color, i) => {
      const radius = 2.3 + i * 0.62
      const tiltX = (Math.random() - 0.5) * 1.1 + 0.3
      const tiltZ = (Math.random() - 0.5) * 0.6

      const ringGeo = new THREE.TorusGeometry(radius, 0.0035, 8, 128)
      const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12 })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.rotation.x = Math.PI / 2 + tiltX
      ring.rotation.z = tiltZ
      group.add(ring)

      const nodeGeo = new THREE.SphereGeometry(0.07, 16, 16)
      const nodeMat = new THREE.MeshBasicMaterial({ color })
      const node = new THREE.Mesh(nodeGeo, nodeMat)
      group.add(node)

      return { node, radius, tiltX, tiltZ, speed: 0.14 + i * 0.04, offset: Math.random() * Math.PI * 2 }
    })

    const particleCount = 180
    const positions = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      const r = 5 + Math.random() * 6
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.55
      positions[i * 3 + 2] = r * Math.cos(phi)
    }
    const particleGeo = new THREE.BufferGeometry()
    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    const particleMat = new THREE.PointsMaterial({
      color: 0x7d97c2, size: 0.022, transparent: true, opacity: 0.35, sizeAttenuation: true,
    })
    const particles = new THREE.Points(particleGeo, particleMat)
    scene.add(particles)

    let mouseX = 0, mouseY = 0
    const onMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener("mousemove", onMouseMove)

    const clock = new THREE.Clock()
    let isInViewport = true
    const animate = () => {
      const t = clock.getElapsedTime()
      if (!prefersReduced) {
        group.rotation.y = t * 0.07
        group.rotation.x = Math.sin(t * 0.1) * 0.05
        core.rotation.y = t * 0.12
        orbits.forEach((o: any) => {
          const angle = t * o.speed + o.offset
          o.node.position.set(
            Math.cos(angle) * o.radius,
            Math.sin(angle * 1.0 + o.tiltZ) * Math.sin(o.tiltX) * o.radius * 0.4,
            Math.sin(angle) * o.radius,
          )
        })
        particles.rotation.y = t * 0.01
      }
      camera.position.x += (mouseX * 0.4 - camera.position.x) * 0.02
      camera.position.y += (-mouseY * 0.3 - camera.position.y) * 0.02
      camera.lookAt(0, 0, 0)
      renderer.render(scene, camera)
      if (isInViewport && document.visibilityState === "visible") {
        frameRef.current = requestAnimationFrame(animate)
      } else {
        frameRef.current = null
      }
    }
    animate()

    const resumeIfNeeded = () => {
      if (isInViewport && document.visibilityState === "visible" && frameRef.current === null) {
        frameRef.current = requestAnimationFrame(animate)
      }
    }
    const viewportObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry: any) => {
          isInViewport = entry.isIntersecting
          resumeIfNeeded()
        })
      },
      { threshold: 0 },
    )
    viewportObserver.observe(mount)
    document.addEventListener("visibilitychange", resumeIfNeeded)

    const onResize = () => {
      const w = mount.clientWidth; const h = mount.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener("resize", onResize)

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      viewportObserver.disconnect()
      document.removeEventListener("visibilitychange", resumeIfNeeded)
      window.removeEventListener("resize", onResize)
      window.removeEventListener("mousemove", onMouseMove)
      renderer.dispose()
      coreGeo.dispose(); coreMat.dispose()
      particleGeo.dispose(); particleMat.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
}

export default function ZenovaLanding() {
  const router = useRouter()
  const { data: setupStatus, isLoading: checking } = useSetupStatus()

  useEffect(() => {
    if (checking) return
    if (!setupStatus?.setup_complete) {
      router.replace("/installer")
      return
    }
    router.replace("/login")
  }, [checking, setupStatus, router])

  if (checking) {
    return <div style={{ height: "100vh", background: "#05080F" }} />
  }

  return (
    <div className="zenova-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{margin:0;background:#05080F;font-family:'Inter',sans-serif;overflow-x:hidden}
        .zr{position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden}
        .zr-scene{position:absolute;inset:0;width:100%;height:100%;opacity:0.6}
        .zr-fade{position:absolute;inset:0;background:radial-gradient(ellipse 70% 60% at 50% 45%,transparent 30%,#05080F 75%)}
        .zr-wrap{position:relative;z-index:2;max-width:520px;width:100%;padding:32px 20px;text-align:center}
        .eyebrow{display:inline-flex;align-items:center;font-size:12px;font-weight:500;color:#06B6D4;letter-spacing:0.03em;
          background:rgba(6,182,212,0.08);border:1px solid rgba(6,182,212,0.15);border-radius:100px;padding:5px 14px;margin-bottom:14px}
        h1{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:clamp(28px,4.8vw,46px);line-height:1.08;
          color:#F3F6FB;margin-bottom:10px;letter-spacing:-0.02em}
        .grad-text{background:linear-gradient(135deg,#3B82F6,#06B6D4,#10B981);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .hero-sub{font-size:15px;line-height:1.5;color:#A9B8CC;max-width:440px;margin:0 auto 20px}
        .btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:11px 0;
          background:linear-gradient(135deg,#3B82F6,#2563EB);border:none;border-radius:10px;color:#fff;
          font-size:14px;font-weight:600;cursor:pointer;transition:opacity 0.2s,transform 0.15s;font-family:'Inter',sans-serif}
        .btn:active{transform:scale(0.98)}
        .foot{position:absolute;bottom:16px;left:0;right:0;z-index:2;text-align:center;font-size:12px;color:#4A5F7A}
        .foot a{color:#5E7390;text-decoration:none;margin:0 8px;transition:color 0.2s}
        .foot a:hover{color:#A9B8CC}
      `}</style>

      <div className="zr">
        <div className="zr-scene"><EcosystemScene /></div>
        <div className="zr-fade" />

        <div className="zr-wrap">
          <span className="eyebrow">
            <Sparkles size={11} style={{ marginRight: 5 }} />AI-native school operations
          </span>

          <h1>
            Welcome to<br />
            <span className="grad-text">ZENOVA</span>
          </h1>

          <p className="hero-sub">
            Your school management platform is ready.
          </p>

          <button className="btn" onClick={() => router.push("/login")}>
            <span>Go to Login</span><ArrowRight size={14} />
          </button>
        </div>

        <div className="foot">
          <a href="/about">About</a>
          <a href="/documentation">Docs</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <span style={{ marginLeft: 8 }}>© 2026 ZENOVA</span>
        </div>
      </div>
    </div>
  )
}
