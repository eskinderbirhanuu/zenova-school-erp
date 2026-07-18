"use client"
import { RouteGroupShell } from "@/components/layout/route-group-shell"
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RouteGroupShell groupKey="admin">{children}</RouteGroupShell>
}
