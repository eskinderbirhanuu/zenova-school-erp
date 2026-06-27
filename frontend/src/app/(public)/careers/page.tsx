"use client"

import Link from "next/link"

export default function CareersPage() {
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
          <h1>Careers</h1>
          <p>Join us in building the future of school management. ZENOVA is always looking for talented engineers, designers, and education specialists.</p>
          <p>We are a remote-first team spanning multiple time zones, committed to creating technology that makes a real difference in education.</p>
          <p>Open positions are listed here as they become available. Check back soon or reach out to careers@zenova.edu.</p>
        </div>
      </div>
    </div>
  )
}
