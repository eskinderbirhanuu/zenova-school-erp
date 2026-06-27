"use client"

import { RoleLayout } from "@/components/layout/role-layout"
import { STUDENT_NAV } from "@/config/navigation"
import { RoleGuard } from "@/components/auth/role-guard"

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["STUDENT"]}>
      <RoleLayout role="STUDENT" navItems={STUDENT_NAV}>
        {children}
      </RoleLayout>
    </RoleGuard>
  )
}
