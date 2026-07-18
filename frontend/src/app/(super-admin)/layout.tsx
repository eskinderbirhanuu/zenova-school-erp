"use client"
import { RouteGroupShell } from "@/components/layout/route-group-shell"
export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return <RouteGroupShell groupKey="super-admin">{children}</RouteGroupShell>
}
