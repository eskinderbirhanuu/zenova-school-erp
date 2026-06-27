"use client"

import { useEffect, useState } from "react"
import { KPICard } from "@/components/ui/kpi-card"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge, MappedStatusBadge } from "@/components/ui/status-badge"
import { SectionHeader } from "@/components/ui/section-header"
import { PageHeader } from "@/components/ui/page-header"
import api from "@/services/api"
import {
  Building2, Users, Key, Activity, Cloud, Monitor, DollarSign,
  Plus, ArrowRight, BarChart3, LineChart, Shield, Zap, Loader2
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

const revenueTrend = [
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

const recentAudit = [
  { id: 1, user: "Admin", action: "License created", resource: "SPR001", time: "2 min ago", status: "success" as const },
  { id: 2, user: "System", action: "Backup completed", resource: "Database", time: "15 min ago", status: "success" as const },
  { id: 3, user: "Admin", action: "School registered", resource: "NOR003", time: "1 hr ago", status: "info" as const },
  { id: 4, user: "System", action: "Health check passed", resource: "All services", time: "2 hrs ago", status: "success" as const },
  { id: 5, user: "Admin", action: "User suspended", resource: "jdoe@sch", time: "3 hrs ago", status: "warning" as const },
]

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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get("/schools").then((r) => r.data?.length ?? 0).catch(() => 0),
      api.get("/licenses").then((r) => r.data?.length ?? 0).catch(() => 0),
      api.get("/revenue/mtd").then((r) => r.data?.amount ?? 0).catch(() => 0),
      api.get("/system/uptime").then((r) => r.data?.percentage ?? 0).catch(() => 0),
      api.get("/users/online").then((r) => r.data?.count ?? 0).catch(() => 0),
      api.get("/alerts").then((r) => r.data?.length ?? 0).catch(() => 0),
    ]).then(([schools, licenses, revenue, uptime, activeUsers, alerts]) => {
      setStats({
        schools: String(schools),
        licenses: String(licenses),
        revenue: String(revenue),
        uptime: String(uptime) + "%",
        activeUsers: String(activeUsers),
        alerts: String(alerts),
        apiLatency: "45ms",
        dbSize: "2.4 GB",
      })
      setLoading(false)
    })
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
          <StaggerItem><KPICard title="Total Schools" value={stats.schools} icon={Building2} trend={{ value: "+6 this month", positive: true }} /></StaggerItem>
          <StaggerItem><KPICard title="Active Schools" value={42} icon={Activity} trend={{ value: "+2.4%", positive: true }} /></StaggerItem>
          <StaggerItem><KPICard title="Total Licenses" value={stats.licenses} icon={Key} trend={{ value: "+12", positive: true }} /></StaggerItem>
          <StaggerItem><KPICard title="Total Users" value={stats.activeUsers} icon={Users} trend={{ value: "+342", positive: true }} /></StaggerItem>
          <StaggerItem><KPICard title="System Health" value={stats.uptime} icon={Cloud} trend={{ value: "+0.2%", positive: true }} /></StaggerItem>
          <StaggerItem><KPICard title="Revenue MTD" value={stats.revenue} icon={DollarSign} trend={{ value: "+18%", positive: true }} accentColor="bg-emerald-500" /></StaggerItem>
        </div>
      </StaggerContainer>

      <FadeInUp delay={0.2}>
        <SectionHeader
          title="Platform Analytics"
          description="Schools growth and revenue trends"
        />
      </FadeInUp>

      <div className="grid gap-6 lg:grid-cols-7">
        <FadeInUp delay={0.3} className="lg:col-span-4">
          <Card shadow="colored">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" /> School Growth
            </CardTitle>
            <CardDescription>Registered schools per month</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlySchools}>
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

        <FadeInUp delay={0.4} className="lg:col-span-3">
          <Card shadow="colored">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LineChart className="h-4 w-4 text-primary" /> Revenue Trend
            </CardTitle>
            <CardDescription>Monthly revenue over the year</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueTrend}>
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
        <FadeInUp delay={0.5} className="lg:col-span-4">
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
                  <th className="p-4 font-medium">Resource</th>
                  <th className="p-4 font-medium">Time</th>
                  <th className="p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentAudit.map((a) => (
                  <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-medium">{a.action}</td>
                    <td className="p-4 font-mono text-xs">{a.resource}</td>
                    <td className="p-4 text-muted-foreground">{a.time}</td>
                    <td className="p-4">
                      <StatusBadge status={a.status === "success" ? "Success" : a.status === "warning" ? "Pending" : "Info"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
          </Card>
        </FadeInUp>

        <FadeInUp delay={0.6} className="lg:col-span-3">
          <Card shadow="default">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4 text-primary" /> Quick Actions
              </CardTitle>
              <CardDescription>Common management tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/super-admin/schools/new">
                <Button variant="outline" className="w-full justify-between h-10">
                  <span className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Add School</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </Link>
              <Link href="/super-admin/licenses/new">
                <Button variant="outline" className="w-full justify-between h-10">
                  <span className="flex items-center gap-2"><Key className="h-4 w-4" /> New License</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </Link>
              <Link href="/super-admin/users">
                <Button variant="outline" className="w-full justify-between h-10">
                  <span className="flex items-center gap-2"><Users className="h-4 w-4" /> Manage Users</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </Link>
              <Link href="/super-admin/settings">
                <Button variant="outline" className="w-full justify-between h-10">
                  <span className="flex items-center gap-2"><Monitor className="h-4 w-4" /> Global Settings</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </FadeInUp>
      </div>
    </div>
  )
}
