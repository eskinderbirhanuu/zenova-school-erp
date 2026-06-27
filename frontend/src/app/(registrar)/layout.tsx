"use client"

import { RoleLayout } from "@/components/layout/role-layout"
import { REGISTRAR_NAV } from "@/config/navigation"
import { RoleGuard } from "@/components/auth/role-guard"

export default function RegistrarLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADMIN", "DIRECTOR", "REGISTRAR"]}>
      <RoleLayout role="REGISTRAR" navItems={REGISTRAR_NAV}>
        {children}
      </RoleLayout>
    </RoleGuard>
  )
}
