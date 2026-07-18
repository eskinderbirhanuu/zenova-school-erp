"use client"
import { RouteGroupShell } from "@/components/layout/route-group-shell"
export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return <RouteGroupShell groupKey="finance">{children}</RouteGroupShell>
}
