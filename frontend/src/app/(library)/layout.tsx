"use client"

import { RoleLayout } from "@/components/layout/role-layout"
import { LIBRARY_NAV } from "@/config/navigation"
import { RoleGuard } from "@/components/auth/role-guard"

export default function LibraryLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADMIN", "DIRECTOR", "LIBRARY"]}>
      <RoleLayout role="LIBRARY" navItems={LIBRARY_NAV}>
        {children}
      </RoleLayout>
    </RoleGuard>
  )
}
