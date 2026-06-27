"use client"

import { RoleLayout } from "@/components/layout/role-layout"
import { PARENT_NAV } from "@/config/navigation"
import { RoleGuard } from "@/components/auth/role-guard"

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["PARENT"]}>
      <RoleLayout role="PARENT" navItems={PARENT_NAV}>
        {children}
      </RoleLayout>
    </RoleGuard>
  )
}
