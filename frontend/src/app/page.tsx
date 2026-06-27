"use client"

import React, { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { useRouter } from "next/navigation"
import {
  Sparkles, ArrowRight, Loader2, CheckCircle2, AlertCircle,
  Key, Building2, Users, Mail, Copy, Eye, EyeOff, HeadphonesIcon, Lock,
} from "lucide-react"
import { setupService } from "@/services/api"

const SPRING = "cubic-bezier(0.16, 1, 0.3, 1)"

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
        orbits.forEach((o) => {
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
        entries.forEach((entry) => {
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
  const [tab, setTab] = useState<"main" | "branch">("main")

  const [mainSchoolId, setMainSchoolId] = useState("")
  const [mainKey, setMainKey] = useState("")
  const [mainLoading, setMainLoading] = useState(false)
  const [mainResult, setMainResult] = useState<{ valid: boolean; message: string } | null>(null)
  const [mainError, setMainError] = useState("")

  const [branchKey, setBranchKey] = useState("")
  const [schoolId, setSchoolId] = useState("")
  const [branchLoading, setBranchLoading] = useState(false)
  const [branchError, setBranchError] = useState("")
  const [branchResult, setBranchResult] = useState<{
    branch_id?: string; branch_code?: string
    director_employee_id?: string; director_password?: string
  } | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState("")

  const handleMainActivate = async (e: React.FormEvent) => {
    e.preventDefault()
    setMainLoading(true)
    setMainError("")
    setMainResult(null)
    try {
      const res = await setupService.validateLicenseType(mainKey)
      if (res.data.valid && res.data.is_main) {
        setMainResult({ valid: true, message: "License validated! Redirecting to setup..." })
        setTimeout(() => router.push(`/activate/main?schoolId=${encodeURIComponent(mainSchoolId)}&key=${encodeURIComponent(mainKey)}`), 1200)
      } else {
        setMainError(res.data.message || "Invalid or non-MAIN license key")
      }
    } catch {
      setMainError("Validation failed. Check the license key and try again.")
    } finally { setMainLoading(false) }
  }

  const handleBranchActivate = async (e: React.FormEvent) => {
    e.preventDefault()
    setBranchLoading(true)
    setBranchError("")
    setBranchResult(null)
    try {
      const res = await setupService.initializeBranch({ license_key: branchKey, school_id: schoolId })
      if (res.data.success) {
        setBranchResult(res.data)
      } else {
        setBranchError(res.data.message || "Branch activation failed")
      }
    } catch {
      setBranchError("Branch activation failed. Check license key and school ID.")
    } finally { setBranchLoading(false) }
  }

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(""), 2000)
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
        .tabs{display:flex;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:4px;margin-bottom:20px;gap:4px}
        .tab{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:9px 0;border-radius:9px;font-size:13px;font-weight:500;
          color:#5E7390;cursor:pointer;transition:all 0.25s;border:none;background:transparent;font-family:'Inter',sans-serif}
        .tab.active{background:rgba(59,130,246,0.15);color:#F3F6FB}
        .tab:hover:not(.active){color:#A9B8CC}
        .card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;text-align:left}
        .card-title{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:15px;color:#F3F6FB;margin-bottom:4px}
        .card-desc{font-size:13px;color:#5E7390;margin-bottom:16px}
        .input-group{display:flex;flex-direction:column;gap:10px}
        .input-group input{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:11px 14px;
          color:#F3F6FB;font-size:14px;font-family:'Inter',sans-serif;outline:none;transition:border-color 0.25s}
        .input-group input::placeholder{color:#4A5F7A}
        .input-group input:focus{border-color:rgba(59,130,246,0.5)}
        .input-group input.font-mono{font-family:'JetBrains Mono',monospace;letter-spacing:0.03em}
        .btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:11px 0;
          background:linear-gradient(135deg,#3B82F6,#2563EB);border:none;border-radius:10px;color:#fff;
          font-size:14px;font-weight:600;cursor:pointer;transition:opacity 0.2s,transform 0.15s;font-family:'Inter',sans-serif;margin-top:6px}
        .btn:active{transform:scale(0.98)}
        .btn:disabled{opacity:0.5;cursor:not-allowed}
        .msg{display:flex;align-items:center;gap:8px;font-size:13px;padding:10px 14px;border-radius:10px;margin-top:10px}
        .msg-err{border:1px solid rgba(239,68,68,0.2);background:rgba(239,68,68,0.08);color:#FCA5A5}
        .msg-ok{border:1px solid rgba(16,185,129,0.2);background:rgba(16,185,129,0.08);color:#6EE7B7}
        .result-box{border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:12px;margin-top:10px}
        .result-row{display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04)}
        .result-row:last-child{border-bottom:none}
        .result-label{font-size:12px;color:#5E7390}
        .result-value{font-size:13px;color:#F3F6FB;font-family:'JetBrains Mono',monospace}
        .result-copy{background:transparent;border:none;color:#5E7390;cursor:pointer;padding:3px;border-radius:4px;display:inline-flex}
        .result-copy:hover{color:#F3F6FB;background:rgba(255,255,255,0.06)}
        .support{position:relative;z-index:2;max-width:520px;width:100%;margin:12px auto 28px;padding:0 20px;text-align:center}
        .support-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px}
        .support-title{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:14px;color:#A9B8CC;margin-bottom:8px}
        .support-grid{display:flex;justify-content:center;gap:20px;flex-wrap:wrap;font-size:13px;color:#5E7390}
        .support-grid a{color:#A9B8CC;text-decoration:none;display:inline-flex;align-items:center;gap:5px;transition:color 0.2s}
        .support-grid a:hover{color:#F3F6FB}
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
            Enterprise School Management Platform — activate your license below.
          </p>

          <div className="tabs">
            <button className={`tab ${tab === "main" ? "active" : ""}`} onClick={() => setTab("main")}>
              <Key size={14} /> Main License
            </button>
            <button className={`tab ${tab === "branch" ? "active" : ""}`} onClick={() => setTab("branch")}>
              <Building2 size={14} /> Branch License
            </button>
          </div>

          {tab === "main" ? (
            <div className="card">
              <div className="card-title">Activate Main System</div>
              <div className="card-desc">Enter your main license key provided by ZENOVA</div>
              <form onSubmit={handleMainActivate}>
                <div className="input-group">
                  <input
                    type="text"
                    placeholder="School ID"
                    value={mainSchoolId}
                    onChange={(e) => setMainSchoolId(e.target.value)}
                    required
                  />
                  <input
                    type="text"
                    placeholder="ZNV-XXXX-XXXX-XXXX-XXXX"
                    value={mainKey}
                    onChange={(e) => setMainKey(e.target.value.toUpperCase())}
                    required
                    className="font-mono"
                  />
                  <button type="submit" className="btn" disabled={mainLoading}>
                    {mainLoading ? (
                      <><Loader2 size={15} style={{ animation: "spin 0.8s linear infinite" }} /> Verifying</>
                    ) : (
                      <><span>Activate</span><ArrowRight size={14} /></>
                    )}
                  </button>
                </div>
                {mainError && (
                  <div className="msg msg-err"><AlertCircle size={14} /> {mainError}</div>
                )}
                {mainResult?.valid && (
                  <div className="msg msg-ok"><CheckCircle2 size={14} /> {mainResult.message}</div>
                )}
              </form>
            </div>
          ) : (
            <div className="card">
              <div className="card-title">Activate Branch</div>
              <div className="card-desc">Enter branch license key and branch ID</div>
              {!branchResult ? (
                <form onSubmit={handleBranchActivate}>
                  <div className="input-group">
                    <input
                      type="text"
                      placeholder="Branch license key"
                      value={branchKey}
                      onChange={(e) => setBranchKey(e.target.value.toUpperCase())}
                      required
                      className="font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Branch ID"
                      value={schoolId}
                      onChange={(e) => setSchoolId(e.target.value)}
                      required
                    />
                    <button type="submit" className="btn" disabled={branchLoading}>
                      {branchLoading ? (
                        <><Loader2 size={15} style={{ animation: "spin 0.8s linear infinite" }} /> Activating</>
                      ) : (
                        <><span>Activate Branch</span><ArrowRight size={14} /></>
                      )}
                    </button>
                  </div>
                  {branchError && (
                    <div className="msg msg-err"><AlertCircle size={14} /> {branchError}</div>
                  )}
                </form>
              ) : (
                <div>
                  <div className="msg msg-ok"><CheckCircle2 size={14} /> Branch Activated Successfully!</div>
                  <div className="result-box">
                    {branchResult.branch_code && (
                      <div className="result-row">
                        <span className="result-label">Branch Code</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span className="result-value">{branchResult.branch_code}</span>
                          <button className="result-copy" onClick={() => handleCopy(branchResult.branch_code!, "Branch")}>
                            {copied === "Branch" ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                          </button>
                        </div>
                      </div>
                    )}
                    {branchResult.director_employee_id && (
                      <div className="result-row">
                        <span className="result-label">Director Employee ID</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span className="result-value">{branchResult.director_employee_id}</span>
                          <button className="result-copy" onClick={() => handleCopy(branchResult.director_employee_id!, "Employee ID")}>
                            {copied === "Employee ID" ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                          </button>
                        </div>
                      </div>
                    )}
                    {branchResult.director_password && (
                      <div className="result-row">
                        <span className="result-label">Director Password</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span className="result-value">
                            {showPassword ? branchResult.director_password : "•".repeat(branchResult.director_password.length)}
                          </span>
                          <button className="result-copy" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                          <button className="result-copy" onClick={() => handleCopy(branchResult.director_password!, "Password")}>
                            {copied === "Password" ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <button className="btn" onClick={() => router.push("/director/dashboard")} style={{ marginTop: 12 }}>
                    Go to Director Dashboard <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
            )}
          <div className="support-card">
            <div className="support-title"><HeadphonesIcon size={12} style={{ marginRight: 4, verticalAlign: -1 }} /> Demo &amp; Support Teams</div>
            <div className="support-grid">
              <a href="mailto:support@zenova.app"><Mail size={12} /> support@zenova.app</a>
              <a href="mailto:demo@zenova.app"><Users size={12} /> Request Demo</a>
            </div>
            <div style={{ marginTop: 10, textAlign: "center" }}>
              <a href="/activate/reset-password" style={{ color: "#5E7390", fontSize: 13, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Lock size={11} /> Forgot Password?
              </a>
            </div>
          </div>
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
