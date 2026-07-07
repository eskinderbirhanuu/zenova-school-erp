"use client"

import { RoleLayout } from "@/components/layout/role-layout"
import { CORPORATE_NAV } from "@/config/navigation"
import { RoleGuard } from "@/components/auth/role-guard"

export default function CorporateLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADMIN", "ZENOVA_CORPORATE_ADMIN", "ZENOVA_CARD_OFFICER", "ZENOVA_SUPPORT"]}>
      <RoleLayout role="ZENOVA_CORPORATE_ADMIN" navItems={CORPORATE_NAV}>
        {children}
      </RoleLayout>
    </RoleGuard>
  )
}
