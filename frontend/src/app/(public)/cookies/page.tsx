"use client"

import Link from "next/link"

export default function CookiesPage() {
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
          <h1>Cookie Policy</h1>
          <p><strong>Last updated:</strong> June 2026</p>

          <h2>1. What Are Cookies</h2>
          <p>Cookies are small text files stored on your device by your web browser. They help us remember your preferences and improve your experience on the ZENOVA platform.</p>

          <h2>2. How We Use Cookies</h2>
          <p>We use essential cookies for authentication and session management, preference cookies to remember your settings, and analytics cookies to understand platform usage patterns. We do not use advertising or tracking cookies.</p>

          <h2>3. Managing Cookies</h2>
          <p>You can control cookies through your browser settings. Disabling essential cookies may affect platform functionality. Most browsers allow you to block or delete cookies from their privacy settings.</p>

          <h2>4. Third-Party Cookies</h2>
          <p>We use minimal third-party cookies from infrastructure providers for performance monitoring. These do not track you across other websites.</p>

          <h2>5. Contact</h2>
          <p>For cookie-related questions: privacy@zenova.edu</p>
        </div>
      </div>
    </div>
  )
}
