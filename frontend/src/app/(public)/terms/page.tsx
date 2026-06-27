"use client"

import Link from "next/link"

export default function TermsPage() {
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
        h2 { font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 20px; margin: 32px 0 12px; color: #F3F6FB; }
        p { color: #A9B8CC; line-height: 1.7; font-size: 15px; margin-bottom: 16px; }
      `}</style>
      <div className="wrap">
        <nav><Link href="/" className="logo">ZENOVA</Link></nav>
        <div className="page">
          <h1>Terms of Service</h1>
          <p><strong>Last updated:</strong> June 2026</p>

          <h2>1. Acceptance of Terms</h2>
          <p>By accessing or using the ZENOVA platform, you agree to be bound by these Terms of Service. If you do not agree, do not use the platform.</p>

          <h2>2. Service Description</h2>
          <p>ZENOVA provides a cloud-based school management platform including attendance tracking, academic records, financial management, communications, analytics, and related services.</p>

          <h2>3. User Obligations</h2>
          <p>Schools are responsible for maintaining accurate data, ensuring authorized access only, and complying with applicable education and data protection laws.</p>

          <h2>4. Service Level</h2>
          <p>ZENOVA commits to 99.9% platform uptime, excluding scheduled maintenance. Credits apply for verified downtime exceeding this threshold under the enterprise agreement.</p>

          <h2>5. Limitation of Liability</h2>
          <p>ZENOVA's liability is limited to the fees paid in the 12 months preceding a claim. The platform is provided "as is" with all faults.</p>

          <h2>6. Termination</h2>
          <p>Either party may terminate with 30 days written notice. Upon termination, customer data is exported and deleted per the data processing agreement.</p>
        </div>
      </div>
    </div>
  )
}
