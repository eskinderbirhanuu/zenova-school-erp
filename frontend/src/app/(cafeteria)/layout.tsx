"use client"

import { RoleLayout } from "@/components/layout/role-layout"
import { CAFETERIA_NAV } from "@/config/navigation"
import { RoleGuard } from "@/components/auth/role-guard"

export default function CafeteriaLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADMIN", "DIRECTOR", "CAFETERIA"]}>
      <RoleLayout role="CAFETERIA" navItems={CAFETERIA_NAV}>
        {children}
      </RoleLayout>
    </RoleGuard>
  )
}
