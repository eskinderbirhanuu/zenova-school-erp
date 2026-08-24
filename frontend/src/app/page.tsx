"use client"

import React, { useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { useSetupStatus } from "@/hooks/queries"

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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{margin:0;background:#05080F;font-family:'Inter',sans-serif;overflow-x:hidden}
        .zr{position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden}
        .zr-glow{position:absolute;inset:0;background:
          radial-gradient(ellipse 55% 45% at 50% 38%,rgba(37,99,235,0.14),transparent 70%),
          radial-gradient(ellipse 40% 35% at 70% 70%,rgba(6,182,212,0.07),transparent 70%)}
        .zr-grid{position:absolute;inset:0;background-image:
          linear-gradient(to right,rgba(255,255,255,0.03) 1px,transparent 1px),
          linear-gradient(to bottom,rgba(255,255,255,0.03) 1px,transparent 1px);
          background-size:40px 40px;
          mask-image:radial-gradient(ellipse 70% 60% at 50% 45%,black 30%,transparent 75%)}
        .zr-wrap{position:relative;z-index:2;max-width:520px;width:100%;padding:32px 20px;text-align:center}
        .zr-mark{width:56px;height:56px;margin:0 auto 24px;border-radius:14px;display:flex;align-items:center;justify-content:center;
          background:linear-gradient(135deg,#2563EB,#1D4ED8);box-shadow:0 8px 32px rgba(37,99,235,0.35)}
        .zr-mark span{color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.02em}
        .eyebrow{display:inline-flex;align-items:center;font-size:11px;font-weight:500;color:#94A3B8;letter-spacing:0.14em;
          text-transform:uppercase;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
          border-radius:100px;padding:5px 14px;margin-bottom:18px}
        h1{font-weight:700;font-size:clamp(30px,5vw,44px);line-height:1.1;color:#F3F6FB;margin-bottom:10px;letter-spacing:-0.02em}
        .hero-sub{font-size:15px;line-height:1.55;color:#A9B8CC;max-width:420px;margin:0 auto 26px}
        .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:12px 0;
          background:#2563EB;border:none;border-radius:10px;color:#fff;font-size:14px;font-weight:600;
          cursor:pointer;transition:background 0.2s;font-family:'Inter',sans-serif}
        .btn:hover{background:#1D4ED8}
        .btn:active{transform:scale(0.99)}
        .foot{position:absolute;bottom:16px;left:0;right:0;z-index:2;text-align:center;font-size:12px;color:#4A5F7A}
        .foot a{color:#5E7390;text-decoration:none;margin:0 8px;transition:color 0.2s}
        .foot a:hover{color:#A9B8CC}
      `}</style>

      <div className="zr">
        <div className="zr-glow" />
        <div className="zr-grid" />

        <div className="zr-wrap">
          <div className="zr-mark"><span>Z</span></div>

          <span className="eyebrow">Enterprise School Management</span>

          <h1>
            Welcome to ZENOVA
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