"use client"

import { KPICard } from "@/components/ui/kpi-card"
import { useDashboardOverview } from "@/hooks/queries"
import { StaggerContainer, StaggerItem } from "@/components/3d/micro-animations"
import { formatCurrency } from "@/lib/currency"
import { GraduationCap, Users, UserCog, DollarSign, GitBranch, Calendar } from "lucide-react"
import type { WidgetProps } from "../types"

export default function KpiGridWidget({ widgetId }: WidgetProps) {
  const { data: overview } = useDashboardOverview()

  const d = overview
  const t = d?.totals
  const stats = {
    students: t ? String(t.students) : "—",
    staff: t ? String(t.staff) : "—",
    directors: t ? String(t.teachers) : "—",
    revenue: t ? formatCurrency(d!.finance.revenue || 0) : "—",
    branches: t ? String(t.branches) : "—",
    academicYear: d?.academic_year?.name || "—",
  }

  return (
    <StaggerContainer>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StaggerItem><KPICard title="Total Students" value={stats.students} icon={GraduationCap} trend={{ value: "+12%", positive: true }} /></StaggerItem>
        <StaggerItem><KPICard title="Staff" value={stats.staff} icon={Users} trend={{ value: "+3", positive: true }} /></StaggerItem>
        <StaggerItem><KPICard title="Directors" value={stats.directors} icon={UserCog} /></StaggerItem>
        <StaggerItem><KPICard title="Revenue (MTD)" value={stats.revenue} icon={DollarSign} trend={{ value: "+18%", positive: true }} accentColor="bg-emerald-500" /></StaggerItem>
        <StaggerItem><KPICard title="Branches" value={stats.branches} icon={GitBranch} /></StaggerItem>
        <StaggerItem><KPICard title="Academic Year" value={stats.academicYear} icon={Calendar} /></StaggerItem>
      </div>
    </StaggerContainer>
  )
}
