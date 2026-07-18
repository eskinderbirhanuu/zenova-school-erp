"use client"
import { RouteGroupShell } from "@/components/layout/route-group-shell"
export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <RouteGroupShell groupKey="student">{children}</RouteGroupShell>
}
