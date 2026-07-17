import type { Metadata, Viewport } from "next"
import { Providers } from "@/services/providers"
import { AuthProvider } from "@/services/auth-context"
import { Toaster } from "@/components/layout/toaster"
import { PWARegister } from "@/components/pwa/register-sw"
import { PWAInstallPrompt } from "@/components/pwa/install-prompt"
import "./globals.css"

export const viewport: Viewport = {
  themeColor: "#2563EB",
}

export const metadata: Metadata = {
  title: "ZENOVA - Smart School • Limitless Possibilities",
  description: "Enterprise School Management Platform - Finance, HR, Academic & More",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ZENOVA",
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/icons/icon.svg",
  },
  openGraph: {
    title: "ZENOVA - Smart School Management",
    description: "Enterprise School Management Platform",
    type: "website",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AuthProvider>
            {children}
            <Toaster />
            <PWARegister />
            <PWAInstallPrompt />
          </AuthProvider>
        </Providers>
      </body>
    </html>
  )
}
