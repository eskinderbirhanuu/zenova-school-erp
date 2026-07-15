"use client"

import type { ReactNode } from "react"
import Link from "next/link"

interface StaticPageLayoutProps {
  title: string
  children: ReactNode
}

export function StaticPageLayout({ title, children }: StaticPageLayoutProps) {
  return (
    <div className="min-h-screen" style={{ background: "#05080F", color: "#F3F6FB", fontFamily: "Inter, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; }
        .sp-wrap { max-width: 780px; margin: 0 auto; padding: 0 24px; }
        .sp-nav { padding: 22px 0; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .sp-logo { font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 18px; color: #F3F6FB; text-decoration: none; }
        .sp-page { padding: 80px 0 120px; }
        .sp-page h1 { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 36px; margin-bottom: 16px; }
        .sp-page h2 { font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 20px; margin: 32px 0 12px; color: #F3F6FB; }
        .sp-page p { color: #A9B8CC; line-height: 1.7; font-size: 15px; margin-bottom: 16px; }
      `}</style>
      <div className="sp-wrap">
        <nav className="sp-nav"><Link href="/" className="sp-logo">ZENOVA</Link></nav>
        <div className="sp-page">
          <h1>{title}</h1>
          {children}
        </div>
      </div>
    </div>
  )
}
