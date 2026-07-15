import { StaticPageLayout } from "@/components/public/static-page-layout"

export default function PrivacyPage() {
  return (
    <StaticPageLayout title="Privacy Policy">
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
    </StaticPageLayout>
  )
}
