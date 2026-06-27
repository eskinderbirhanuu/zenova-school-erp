"use client"

import Link from "next/link"

export default function AboutPage() {
  return (
    <div style={{ background: "#05080F", color: "#F3F6FB", minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; }
        .wrap { max-width: 780px; margin: 0 auto; padding: 0 24px; }
        nav { padding: 22px 0; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .logo { font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 18px; color: #F3F6FB; text-decoration: none; }
        .page { padding: 80px 0 120px; }
        h1 { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 36px; margin-bottom: 16px; }
        p { color: #A9B8CC; line-height: 1.7; font-size: 15px; margin-bottom: 16px; }
      `}</style>
      <div className="wrap">
        <nav><Link href="/" className="logo">ZENOVA</Link></nav>
        <div className="page">
          <h1>About ZENOVA</h1>
          <p>ZENOVA is the AI-native operating system for modern schools — one connected platform for administration, teachers, students, and parents.</p>
          <p>Founded to replace fragmented school management tools, ZENOVA delivers a unified record of truth across attendance, academics, finance, transport, health, and communications.</p>
          <p>Trusted by 1,200+ schools across 14 countries, we help educational institutions reduce administrative overhead and focus on what matters: student outcomes.</p>
        </div>
      </div>
    </div>
  )
}
