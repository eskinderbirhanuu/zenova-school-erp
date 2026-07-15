import { StaticPageLayout } from "@/components/public/static-page-layout"

export default function CookiesPage() {
  return (
    <StaticPageLayout title="Cookie Policy">
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
    </StaticPageLayout>
  )
}
