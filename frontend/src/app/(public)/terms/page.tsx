import { StaticPageLayout } from "@/components/public/static-page-layout"

export default function TermsPage() {
  return (
    <StaticPageLayout title="Terms of Service">
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
      <p>ZENOVA&apos;s liability is limited to the fees paid in the 12 months preceding a claim. The platform is provided &ldquo;as is&rdquo; with all faults.</p>

      <h2>6. Termination</h2>
      <p>Either party may terminate with 30 days written notice. Upon termination, customer data is exported and deleted per the data processing agreement.</p>
    </StaticPageLayout>
  )
}
