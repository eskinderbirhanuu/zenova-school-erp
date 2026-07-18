"use client"
import { RouteGroupShell } from "@/components/layout/route-group-shell"
export default function HrLayout({ children }: { children: React.ReactNode }) {
  return <RouteGroupShell groupKey="hr">{children}</RouteGroupShell>
}
