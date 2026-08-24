"use client"

import { useMemo } from "react"
import { KPICard } from "@/components/ui/kpi-card"
import { SectionHeader } from "@/components/ui/section-header"
import { PageHeader } from "@/components/ui/page-header"
import { useAuditLogs } from "@/hooks/queries"
import { ClipboardList, Shield, FileText, Search, Eye, Download, AlertTriangle, CheckCircle } from "lucide-react"

import DashboardShell from "@/components/dashboard/dashboard-shell"
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/3d/micro-animations"
import BarChartCard from "@/components/dashboard/bar-chart-card"
import FeedCard from "@/components/dashboard/feed-card"
import PlaceholderCard from "@/components/dashboard/placeholder-card"
import QuickActionsWidget from "@/components/dashboard/widgets/quick-actions-widget"
import ChartsGrid from "@/components/dashboard/charts-grid"

interface AuditEntry {
  action: string; user: string; resource: string; details: string; ip_address: string; created_at: string
}

function badgeForAction(action: string): "success" | "warning" | "info" | "purple" {
  const a = action.toUpperCase()
  if (["CREATE", "LOGIN"].includes(a)) return "success"
  if (["UPDATE", "MODIFY", "CHANGE"].includes(a)) return "warning"
  if (["DELETE", "FAILED"].includes(a)) return "purple"
  return "info"
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  return `${hours} hour${hours > 1 ? "s" : ""} ago`
}

export default function AuditorDashboard() {
  const { data: rawLogs, isLoading } = useAuditLogs({ limit: 100 })

  const data = useMemo(() => {
    const rawLogsData = (rawLogs as any) || {}
    const logs: AuditEntry[] = rawLogsData.logs ?? []
    const actionCounts: Record<string, number> = {}
    logs.forEach((l: any) => {
      const key = l.action.charAt(0).toUpperCase() + l.action.slice(1).toLowerCase()
      actionCounts[key] = (actionCounts[key] || 0) + 1
    })
    return {
      totalLogs: rawLogsData.total ?? logs.length,
      securityEvents: logs.filter((l: any) => l.action === "SECURITY").length,
      auditTypes: Object.entries(actionCounts).map(([type, count]) => ({ type, count })),
      recent: logs.slice(0, 5),
    }
  }, [rawLogs])

  if (isLoading) {
    return <DashboardShell isLoading widgets={[]} />
  }

  return (
    <DashboardShell
      header={
        <FadeInUp>
          <PageHeader title="Compliance Hub" description="Audit logs, security events, and compliance monitoring." />
        </FadeInUp>
      }
      widgets={[
        <StaggerContainer key="kpi">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StaggerItem><KPICard title="Audit Logs" value={data?.totalLogs ?? 0} icon={ClipboardList} trend={{ value: "+12", positive: true }} /></StaggerItem>
            <StaggerItem><KPICard title="Security Events" value={data?.securityEvents ?? 0} icon={Shield} trend={{ value: "0", positive: true }} accentColor="bg-emerald-500" /></StaggerItem>
            <StaggerItem><KPICard title="Reports" value="0" icon={FileText} trend={{ value: "0", positive: true }} /></StaggerItem>
            <StaggerItem><KPICard title="Compliance" value="Pending" icon={Search} trend={{ value: "On track", positive: true }} /></StaggerItem>
          </div>
        </StaggerContainer>,
        <FadeInUp delay={0.2} key="section"><SectionHeader title="Audit Analytics" description="Activity distribution and trends" /></FadeInUp>,
        <ChartsGrid key="charts">
          <BarChartCard
            title="Activity by Type"
            description="Audit events grouped by category"
            data={data?.auditTypes ?? []}
            xKey="type"
            dataKey="count"
            name="Events"
            delay={0.3}
          />
          <FeedCard
            title="Recent Activity"
            description="Latest audit events"
            items={(data?.recent ?? []).map((a: any) => ({
              label: `${a.action}${a.resource ? ` - ${a.resource}` : ""}`,
              time: timeAgo(a.created_at),
              detail: a.user,
              badge: { text: a.action, variant: badgeForAction(a.action) },
            }))}
            icon={AlertTriangle}
            delay={0.4}
          />
        </ChartsGrid>,
        <ChartsGrid key="more">
          <PlaceholderCard title="Compliance Status" description="Current compliance overview" icon={CheckCircle} />
          <QuickActionsWidget
            widgetId="audit-quick-actions"
            title="Quick Actions"
            description="Common audit tasks"
            icon={Eye}
            links={[
              { href: "/audit/logs", label: "View Logs", icon: Eye },
              { href: "/audit/reports", label: "Generate Report", icon: Download },
              { href: "/audit/security", label: "Security Check", icon: Shield },
            ]}
          />
        </ChartsGrid>,
      ]}
    />
  )
}
