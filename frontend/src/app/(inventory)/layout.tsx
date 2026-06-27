"use client"

import { RoleLayout } from "@/components/layout/role-layout"
import { INVENTORY_NAV } from "@/config/navigation"
import { RoleGuard } from "@/components/auth/role-guard"

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADMIN", "DIRECTOR", "INVENTORY", "FINANCE"]}>
      <RoleLayout role="INVENTORY" navItems={INVENTORY_NAV}>
        {children}
      </RoleLayout>
    </RoleGuard>
  )
}
