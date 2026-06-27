"use client"

import { useAuth } from "@/services/auth-context"
import { RoleLayout } from "@/components/layout/role-layout"
import { ROLE_NAV_MAP } from "@/config/navigation"

export default function LegacyLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="h-2 w-32 animate-pulse rounded bg-muted-foreground/20" /></div>
  if (!user) return <>{children}</>

  const navItems = ROLE_NAV_MAP[user.role as keyof typeof ROLE_NAV_MAP] || []
  return <RoleLayout role={user.role as string} navItems={navItems}>{children}</RoleLayout>
}
