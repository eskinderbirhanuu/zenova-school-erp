"use client"
import { RouteGroupShell } from "@/components/layout/route-group-shell"
export default function LibraryLayout({ children }: { children: React.ReactNode }) {
  return <RouteGroupShell groupKey="library">{children}</RouteGroupShell>
}
