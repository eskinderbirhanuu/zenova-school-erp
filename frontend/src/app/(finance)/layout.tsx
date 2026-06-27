"use client"

import { RoleLayout } from "@/components/layout/role-layout"
import { FINANCE_NAV } from "@/config/navigation"
import { RoleGuard } from "@/components/auth/role-guard"

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADMIN", "DIRECTOR", "FINANCE", "AUDITOR"]}>
      <RoleLayout role="FINANCE" navItems={FINANCE_NAV}>
        {children}
      </RoleLayout>
    </RoleGuard>
  )
}
