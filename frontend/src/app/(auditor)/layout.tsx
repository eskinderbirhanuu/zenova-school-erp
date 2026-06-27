"use client"

import { RoleLayout } from "@/components/layout/role-layout"
import { AUDITOR_NAV } from "@/config/navigation"
import { RoleGuard } from "@/components/auth/role-guard"

export default function AuditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADMIN", "AUDITOR"]}>
      <RoleLayout role="AUDITOR" navItems={AUDITOR_NAV}>
        {children}
      </RoleLayout>
    </RoleGuard>
  )
}
