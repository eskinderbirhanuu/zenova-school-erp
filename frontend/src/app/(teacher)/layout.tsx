"use client"

import { RoleLayout } from "@/components/layout/role-layout"
import { TEACHER_NAV } from "@/config/navigation"
import { RoleGuard } from "@/components/auth/role-guard"

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADMIN", "DIRECTOR", "TEACHER"]}>
      <RoleLayout role="TEACHER" navItems={TEACHER_NAV}>
        {children}
      </RoleLayout>
    </RoleGuard>
  )
}
