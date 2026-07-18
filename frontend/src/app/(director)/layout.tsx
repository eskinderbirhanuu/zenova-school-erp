"use client"
import { RouteGroupShell } from "@/components/layout/route-group-shell"
export default function DirectorLayout({ children }: { children: React.ReactNode }) {
  return <RouteGroupShell groupKey="director">{children}</RouteGroupShell>
}
