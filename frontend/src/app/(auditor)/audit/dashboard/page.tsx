"use client"

import { useMemo } from "react"
import { KPICard } from "@/components/ui/kpi-card"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { SectionHeader } from "@/components/ui/section-header"
import { PageHeader } from "@/components/ui/page-header"
import { useAuditLogs } from "@/hooks/queries"
import Link from "next/link"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import {
  ClipboardList, Shield, FileText, Search, Loader2, ArrowRight,
  BarChart3, Eye, Download, AlertTriangle, CheckCircle
} from "lucide-react"

import { DynamicAnimatedBackground } from "@/components/3d/dynamic"
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/3d/micro-animations"

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
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
<DynamicAnimatedBackground />
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <DynamicAnimatedBackground />

      <FadeInUp>
        <PageHeader
        title="Compliance Hub"
        description="Audit logs, security events, and compliance monitoring."
      />
      </FadeInUp>

      <StaggerContainer>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StaggerItem><KPICard title="Audit Logs" value={data?.totalLogs ?? 0} icon={ClipboardList} trend={{ value: "+12", positive: true }} /></StaggerItem>
          <StaggerItem><KPICard title="Security Events" value={data?.securityEvents ?? 0} icon={Shield} trend={{ value: "0", positive: true }} accentColor="bg-emerald-500" /></StaggerItem>
          <StaggerItem><KPICard title="Reports" value="0" icon={FileText} trend={{ value: "0", positive: true }} /></StaggerItem>
          <StaggerItem><KPICard title="Compliance" value="Pending" icon={Search} trend={{ value: "On track", positive: true }} /></StaggerItem>
        </div>
      </StaggerContainer>

      <FadeInUp delay={0.2}>
        <SectionHeader title="Audit Analytics" description="Activity distribution and trends" />
      </FadeInUp>

      <div className="grid gap-6 lg:grid-cols-7">
        <FadeInUp delay={0.3} className="lg:col-span-4">
          <Card shadow="colored">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-primary" /> Activity by Type
            </CardTitle>
            <CardDescription>Audit events grouped by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data?.auditTypes ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                <XAxis dataKey="type" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Events" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
          </Card>
        </FadeInUp>

        <FadeInUp delay={0.4} className="lg:col-span-3">
          <Card shadow="default">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-primary" /> Recent Activity
            </CardTitle>
            <CardDescription>Latest audit events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(data?.recent ?? []).map((a, i) => (
                <div key={i} className="flex items-start gap-3 border-b border-border/50 pb-3 last:border-0 last:pb-0">
                  <div className="rounded-full bg-primary/5 p-1.5 text-primary">
                    <ClipboardList className="h-3 w-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{a.action} {a.resource && `- ${a.resource}`}</p>
                    <p className="text-xs text-muted-foreground">{a.user} - {timeAgo(a.created_at)}</p>
                  </div>
                  <StatusBadge status={a.action} variant={badgeForAction(a.action)} />
                </div>
              ))}
            </div>
          </CardContent>
          </Card>
        </FadeInUp>
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <FadeInUp delay={0.5} className="lg:col-span-4">
          <Card shadow="default">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle className="h-4 w-4 text-primary" /> Compliance Status
            </CardTitle>
            <CardDescription>Current compliance overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
              Compliance dashboard coming soon
            </div>
          </CardContent>
          </Card>
        </FadeInUp>

        <FadeInUp delay={0.6} className="lg:col-span-3">
          <Card shadow="default">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Eye className="h-4 w-4 text-primary" /> Quick Actions
            </CardTitle>
            <CardDescription>Common audit tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <Link href="/audit/logs">
                <Button variant="outline" className="w-full justify-between h-10">
                  <span className="flex items-center gap-2"><Eye className="h-4 w-4" /> View Logs</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </Link>
              <Link href="/audit/reports">
                <Button variant="outline" className="w-full justify-between h-10">
                  <span className="flex items-center gap-2"><Download className="h-4 w-4" /> Generate Report</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </Link>
              <Link href="/audit/security">
                <Button variant="outline" className="w-full justify-between h-10">
                  <span className="flex items-center gap-2"><Shield className="h-4 w-4" /> Security Check</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </Link>
            </div>
          </CardContent>
          </Card>
        </FadeInUp>
      </div>
    </div>
  )
}
