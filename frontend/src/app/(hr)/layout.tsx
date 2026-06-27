"use client"

import { RoleLayout } from "@/components/layout/role-layout"
import { HR_NAV } from "@/config/navigation"
import { RoleGuard } from "@/components/auth/role-guard"

export default function HrLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADMIN", "DIRECTOR", "HR"]}>
      <RoleLayout role="HR" navItems={HR_NAV}>
        {children}
      </RoleLayout>
    </RoleGuard>
  )
}
