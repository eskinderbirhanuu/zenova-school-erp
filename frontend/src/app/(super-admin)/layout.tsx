"use client"

import { usePathname } from "next/navigation"
import { RoleLayout } from "@/components/layout/role-layout"
import { SUPER_ADMIN_NAV } from "@/config/navigation"
import { RoleGuard } from "@/components/auth/role-guard"

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLogin = pathname === "/super-admin/login"

  if (isLogin) return <>{children}</>

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN"]}>
      <RoleLayout role="SUPER_ADMIN" navItems={SUPER_ADMIN_NAV}>
        {children}
      </RoleLayout>
    </RoleGuard>
  )
}
