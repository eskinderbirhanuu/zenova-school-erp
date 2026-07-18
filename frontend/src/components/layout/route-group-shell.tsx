"use client"

import { usePathname } from "next/navigation"
import { RoleLayout } from "@/components/layout/role-layout"
import { RoleGuard } from "@/components/auth/role-guard"
import { ROUTE_GROUP_ACCESS } from "@/config/roles"
import { ROLE_NAV_MAP } from "@/config/navigation"
import type { NavSection } from "@/config/navigation"

export function RouteGroupShell({ groupKey, children, navOverride }: { groupKey: string; children: React.ReactNode; navOverride?: NavSection[] }) {
  const pathname = usePathname()
  const config = ROUTE_GROUP_ACCESS[groupKey]
  if (!config) return <>{children}</>

  const { allowedRoles, role, bypassPaths } = config
  if (bypassPaths?.some((p) => pathname === p)) return <>{children}</>

  const navItems = navOverride ?? (ROLE_NAV_MAP[role as keyof typeof ROLE_NAV_MAP] || [])
  return (
    <RoleGuard allowedRoles={allowedRoles}>
      <RoleLayout role={role} navItems={navItems}>{children}</RoleLayout>
    </RoleGuard>
  )
}
