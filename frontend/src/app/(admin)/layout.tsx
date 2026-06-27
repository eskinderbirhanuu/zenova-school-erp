"use client"

import { RoleLayout } from "@/components/layout/role-layout"
import { ADMIN_NAV } from "@/config/navigation"
import { RoleGuard } from "@/components/auth/role-guard"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
      <RoleLayout role="ADMIN" navItems={ADMIN_NAV}>
        {children}
      </RoleLayout>
    </RoleGuard>
  )
}
