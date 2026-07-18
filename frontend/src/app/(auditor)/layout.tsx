"use client"
import { RouteGroupShell } from "@/components/layout/route-group-shell"
export default function AuditorLayout({ children }: { children: React.ReactNode }) {
  return <RouteGroupShell groupKey="auditor">{children}</RouteGroupShell>
}
