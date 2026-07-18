"use client"
import { RouteGroupShell } from "@/components/layout/route-group-shell"
export default function RegistrarLayout({ children }: { children: React.ReactNode }) {
  return <RouteGroupShell groupKey="registrar">{children}</RouteGroupShell>
}
