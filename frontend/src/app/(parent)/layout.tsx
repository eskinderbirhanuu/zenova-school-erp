"use client"
import { RouteGroupShell } from "@/components/layout/route-group-shell"
export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return <RouteGroupShell groupKey="parent">{children}</RouteGroupShell>
}
