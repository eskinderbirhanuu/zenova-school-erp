import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "ZENOVA Control Center",
  description: "Private admin panel for ZENOVA School ERP",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">{children}</body>
    </html>
  )
}
