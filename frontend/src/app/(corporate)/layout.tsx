"use client"
import { RouteGroupShell } from "@/components/layout/route-group-shell"
export default function CorporateLayout({ children }: { children: React.ReactNode }) {
  return <RouteGroupShell groupKey="corporate">{children}</RouteGroupShell>
}
