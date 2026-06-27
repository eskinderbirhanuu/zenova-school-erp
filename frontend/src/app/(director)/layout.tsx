"use client"

import { RoleLayout } from "@/components/layout/role-layout"
import { DIRECTOR_NAV } from "@/config/navigation"
import { RoleGuard } from "@/components/auth/role-guard"

export default function DirectorLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADMIN", "DIRECTOR"]}>
      <RoleLayout role="DIRECTOR" navItems={DIRECTOR_NAV}>
        {children}
      </RoleLayout>
    </RoleGuard>
  )
}
