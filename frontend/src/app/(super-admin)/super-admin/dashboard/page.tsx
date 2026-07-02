"use client"

import { useEffect, useState } from "react"
import { KPICard } from "@/components/ui/kpi-card"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MappedStatusBadge } from "@/components/ui/status-badge"
import { PageHeader } from "@/components/ui/page-header"
import api from "@/services/api"
import {
  Building2, Users, Key, Activity, Cloud, DollarSign,
  Plus, BarChart3, LineChart, Shield, Zap, Loader2, Server,
  AlertTriangle, CheckCircle2, XCircle, Info, Bell, Cpu,
  HardDrive, ArrowUp
} from "lucide-react"
import Link from "next/link"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from "recharts"

import { AnimatedBackground } from "@/components/3d/animated-background"
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/3d/micro-animations"

const monthlySchools = [
  { month: "Jan", schools: 4 },
  { month: "Feb", schools: 7 },
  { month: "Mar", schools: 5 },
  { month: "Apr", schools: 12 },
  { month: "May", schools: 9 },
  { month: "Jun", schools: 15 },
  { month: "Jul", schools: 11 },
  { month: "Aug", schools: 8 },
  { month: "Sep", schools: 14 },
  { month: "Oct", schools: 18 },
  { month: "Nov", schools: 6 },
  { month: "Dec", schools: 10 },
]

const revenueTrendMock = [
  { month: "Jan", revenue: 12000 },
  { month: "Feb", revenue: 18000 },
  { month: "Mar", revenue: 15000 },
  { month: "Apr", revenue: 22000 },
  { month: "May", revenue: 19000 },
  { month: "Jun", revenue: 28000 },
  { month: "Jul", revenue: 24000 },
  { month: "Aug", revenue: 21000 },
  { month: "Sep", revenue: 30000 },
  { month: "Oct", revenue: 35000 },
  { month: "Nov", revenue: 26000 },
  { month: "Dec", revenue: 42000 },
]

const systemServices = [
  { service: "API Server", status: "operational" as const, latency: "45ms" },
  { service: "Database", status: "operational" as const, latency: "12ms" },
  { service: "Email Service", status: "degraded" as const, latency: "890ms" },
  { service: "Storage", status: "operational" as const, latency: "23ms" },
  { service: "Auth Service", status: "operational" as const, latency: "67ms" },
  { service: "Backup", status: "operational" as const, latency: "—" },
]

const serviceAlerts = [
  { message: "3 schools approaching license renewal", severity: "warning" as const, time: "2h ago" },
  { message: "Database backup completed", severity: "success" as const, time: "4h ago" },
  { message: "Email queue backing up — 1,200 pending", severity: "destructive" as const, time: "30m ago" },
  { message: "New school registration pending approval", severity: "info" as const, time: "1h ago" },
]

const statusBorderColors: Record<string, string> = {
  operational: "border-l-emerald-500",
  degraded: "border-l-amber-500",
  down: "border-l-red-500",
}

const alertIcons: Record<string, typeof AlertTriangle> = {
  warning: AlertTriangle,
  success: CheckCircle2,
  destructive: XCircle,
  info: Info,
}

const alertColorMap: Record<string, string> = {
  warning: "text-amber-500",
  success: "text-emerald-500",
  destructive: "text-red-500",
  info: "text-blue-500",
}

const formatCurrency = (n: number) =>
  "$" + new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n)

const formatNumber = (n: number) =>
  new Intl.NumberFormat("en-US").format(n)

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({
    schools: "—",
    licenses: "—",
    revenue: "—",
    uptime: "—",
    activeUsers: "—",
    alerts: "—",
    apiLatency: "—",
    dbSize: "—",
  })
  const [activity, setActivity] = useState<any[]>([])
  const [schoolGrowth, setSchoolGrowth] = useState<any[]>([])
  const [revenueTrend, setRevenueTrend] = useState<any[]>([])
  const [healthChecks, setHealthChecks] = useState<Record<string, { status: string; latency?: string; role?: string }>>({})
  const [alerts, setAlerts] = useState<Array<{ message: string; severity: string; time: string }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get("/dashboard/overview"),
      api.get("/dashboard/trends"),
      api.get("/health"),
    ]).then(([overview, trends, health]) => {
      const d = overview.data
      const totals = d.totals || {}
      const finance = d.finance || {}
      const sa = d.super_admin || {}
      const hc = health.data?.checks || {}
      setStats({
        schools: formatNumber(sa.total_schools ?? 0),
        licenses: formatNumber(sa.active_licenses ?? 0),
        revenue: formatCurrency(finance.revenue ?? 0),
        uptime: health.data?.status === "ok" ? "100%" : "—",
        activeUsers: formatNumber((totals.teachers ?? 0) + (totals.staff ?? 0)),
        alerts: String(d.alerts?.length || 0),
        apiLatency: hc.api?.latency || "—",
        dbSize: "—",
      })
      setActivity(d.recent_activity || [])
      setAlerts(d.alerts || [])
      if (trends.data) {
        setSchoolGrowth(trends.data.school_growth || [])
        setRevenueTrend(trends.data.revenue_trend || [])
      }
      setHealthChecks(hc)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <AnimatedBackground />
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <AnimatedBackground />

      <FadeInUp>
        <PageHeader
          title="Mission Control"
          description="Platform-wide overview, system health, and key performance indicators at a glance."
          actions={
            <>
              <Link href="/super-admin/schools/new">
                <Button variant="outline"><Plus className="h-4 w-4 mr-2" /> Add School</Button>
              </Link>
              <Link href="/super-admin/licenses/new">
                <Button><Key className="h-4 w-4 mr-2" /> New License</Button>
              </Link>
            </>
          }
        />
      </FadeInUp>

      <StaggerContainer>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StaggerItem>
            <KPICard
              title="Total Schools"
              value={stats.schools}
              icon={Building2}
              trend={{ value: "+6 this month", positive: true }}
              sparklineData={[4, 7, 5, 12, 9, 15, 11, 8, 14, 18, 6, 10]}
            />
          </StaggerItem>
          <StaggerItem>
            <KPICard
              title="Active Schools"
              value={42}
              icon={Activity}
              trend={{ value: "+2.4%", positive: true }}
              sparklineData={[30, 32, 33, 35, 36, 38, 39, 40, 41, 42]}
            />
          </StaggerItem>
          <StaggerItem>
            <KPICard
              title="Total Licenses"
              value={stats.licenses}
              icon={Key}
              trend={{ value: "+12", positive: true }}
              sparklineData={[50, 55, 60, 64, 68, 72, 78, 82, 86, 90]}
            />
          </StaggerItem>
          <StaggerItem>
            <KPICard
              title="Total Users"
              value={stats.activeUsers}
              icon={Users}
              trend={{ value: "+342", positive: true }}
              sparklineData={[800, 920, 1050, 1100, 1200, 1340, 1420, 1500, 1620, 1780]}
            />
          </StaggerItem>
          <StaggerItem>
            <KPICard
              title="System Health"
              value={stats.uptime}
              icon={Cloud}
              trend={{ value: "+0.2%", positive: true }}
              sparklineData={[99.1, 99.3, 99.2, 99.5, 99.4, 99.6, 99.7, 99.8, 99.8, 99.9]}
            />
          </StaggerItem>
          <StaggerItem>
            <KPICard
              title="Revenue MTD"
              value={stats.revenue}
              icon={DollarSign}
              trend={{ value: "+18%", positive: true }}
              accentColor="bg-emerald-500"
              sparklineData={[12, 18, 15, 22, 19, 28, 24, 21, 30, 35, 26, 42]}
            />
          </StaggerItem>
        </div>
      </StaggerContainer>

      <FadeInUp delay={0.15}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1.5 text-xs font-medium">
            <Cpu className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">Active Users Today</span>
            <span className="font-bold text-foreground">1,847</span>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1.5 text-xs font-medium">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">API Calls Today</span>
            <span className="font-bold text-foreground">284K</span>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1.5 text-xs font-medium">
            <HardDrive className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">Storage Used</span>
            <span className="font-bold text-foreground">2.4 GB</span>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border bg-emerald-500/10 px-3 py-1.5 text-xs font-medium">
            <ArrowUp className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-muted-foreground">Uptime</span>
            <span className="font-bold text-emerald-600">99.98%</span>
          </div>
        </div>
      </FadeInUp>

      <div className="grid gap-6 lg:grid-cols-7">
        <FadeInUp delay={0.2} className="lg:col-span-4">
          <Card shadow="colored">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-primary" /> School Growth
              </CardTitle>
              <CardDescription>Registered schools per month</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={schoolGrowth.length > 0 ? schoolGrowth : monthlySchools}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="schools" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </FadeInUp>

        <FadeInUp delay={0.3} className="lg:col-span-3">
          <Card shadow="colored">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <LineChart className="h-4 w-4 text-primary" /> Revenue Trend
              </CardTitle>
              <CardDescription>Monthly revenue over the year</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueTrend.length > 0 ? revenueTrend : revenueTrendMock}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#colorRevenue)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </FadeInUp>
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <FadeInUp delay={0.35} className="lg:col-span-4">
          <Card shadow="default">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Server className="h-4 w-4 text-primary" /> System Health Radar
              </CardTitle>
              <CardDescription>Real-time service status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(healthChecks).length === 0 && systemServices.map((s) => (
                  <div
                    key={s.service}
                    className={`rounded-xl border border-l-4 ${statusBorderColors[s.status]} bg-card/80 p-4 flex flex-col gap-2`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground truncate">{s.service}</span>
                      <MappedStatusBadge status={s.status} />
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">Latency: {s.latency}</span>
                  </div>
                ))}
                {Object.entries(healthChecks).length > 0 && Object.entries(healthChecks).map(([name, check]) => {
                  const s = check.status || "unknown"
                  const borderKey = s === "operational" ? "operational" : s === "degraded" ? "degraded" : "down"
                  return (
                    <div
                      key={name}
                      className={`rounded-xl border border-l-4 ${statusBorderColors[borderKey]} bg-card/80 p-4 flex flex-col gap-2`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground truncate capitalize">{name.replace(/_/g, " ")}</span>
                        <MappedStatusBadge status={s as any} />
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">
                        {check.role ? `Role: ${check.role}` : check.latency ? `Latency: ${check.latency}` : "—"}
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </FadeInUp>

        <FadeInUp delay={0.4} className="lg:col-span-3">
          <Card shadow="default">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-4 w-4 text-primary" /> Alert Center
              </CardTitle>
              <CardDescription>Actionable platform alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {alerts.length === 0 && (
                <div className="flex items-center gap-3 rounded-xl border bg-card/80 p-4">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <p className="text-sm text-muted-foreground">No alerts — all systems clear</p>
                </div>
              )}
              {(alerts.length > 0 ? alerts : serviceAlerts).map((alert: any, i: number) => {
                const Icon = alertIcons[alert.severity as keyof typeof alertIcons] || Info
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-xl border bg-card/80 p-3 hover:bg-muted/20 transition-colors"
                  >
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${alertColorMap[alert.severity] || "text-blue-500"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-snug">{alert.message}</p>
                      <span className="text-xs text-muted-foreground">{alert.time}</span>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </FadeInUp>
      </div>

      <FadeInUp delay={0.5}>
        <Card shadow="default">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-primary" /> Activity Feed
            </CardTitle>
            <CardDescription>Recent platform events</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="p-4 font-medium">Action</th>
                    <th className="p-4 font-medium">Table</th>
                    <th className="p-4 font-medium">Time</th>
                    <th className="p-4 font-medium">User</th>
                  </tr>
                </thead>
                <tbody>
                  {activity.length === 0 && (
                    <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No recent activity</td></tr>
                  )}
                  {activity.map((a: any, i: number) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-medium">{a.action || "—"}</td>
                      <td className="p-4 font-mono text-xs">{a.table_name || "—"}</td>
                      <td className="p-4 text-muted-foreground">
                        {a.created_at ? new Date(a.created_at).toLocaleString() : "—"}
                      </td>
                      <td className="p-4 text-muted-foreground">{a.user_id || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </CardContent>
        </Card>
      </FadeInUp>
    </div>
  )
}
