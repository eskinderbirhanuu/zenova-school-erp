"use client"
import { RouteGroupShell } from "@/components/layout/route-group-shell"
export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return <RouteGroupShell groupKey="teacher">{children}</RouteGroupShell>
}
