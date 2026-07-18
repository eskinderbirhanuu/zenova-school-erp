"use client"
import { RouteGroupShell } from "@/components/layout/route-group-shell"
export default function CafeteriaLayout({ children }: { children: React.ReactNode }) {
  return <RouteGroupShell groupKey="cafeteria">{children}</RouteGroupShell>
}
