"use client"

import Link from "next/link"

export default function PrivacyPage() {
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
          <h1>Privacy Policy</h1>
          <p><strong>Last updated:</strong> June 2026</p>

          <h2>1. Information We Collect</h2>
          <p>ZENOVA collects personal information necessary to operate the school management platform, including student records, staff data, parent contact details, and academic performance data. All data is provided directly by authorized school administrators.</p>

          <h2>2. How We Use Information</h2>
          <p>Data is used exclusively to provide and improve ZENOVA platform services: attendance tracking, academic record keeping, financial management, communication between stakeholders, and regulatory compliance reporting.</p>

          <h2>3. Data Security</h2>
          <p>We implement SOC 2-grade security controls including encryption at rest and in transit, role-based access control, and continuous monitoring. Data is stored in ISO 27001-certified data centers.</p>

          <h2>4. Data Retention</h2>
          <p>School data is retained for the duration of the service agreement plus any additional period required by applicable law. Upon termination, data is securely deleted within 90 days unless legal retention obligations apply.</p>

          <h2>5. Your Rights</h2>
          <p>Schools and individuals may request access to, correction of, or deletion of their personal data by contacting their school administrator or our Data Protection Officer at dpo@zenova.edu.</p>

          <h2>6. Contact</h2>
          <p>For privacy-related inquiries: privacy@zenova.edu</p>
        </div>
      </div>
    </div>
  )
}
