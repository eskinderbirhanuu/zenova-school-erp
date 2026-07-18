"use client"
import { RouteGroupShell } from "@/components/layout/route-group-shell"
export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return <RouteGroupShell groupKey="inventory">{children}</RouteGroupShell>
}
