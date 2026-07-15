"use client"

import { KPICard } from "@/components/ui/kpi-card"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { SectionHeader } from "@/components/ui/section-header"
import { PageHeader } from "@/components/ui/page-header"
import { useDashboardOverview, useDashboardTrends, useSetupWizardStatus } from "@/hooks/queries"
import {
  Users, GraduationCap, DollarSign, TrendingUp, UserCog,
  GitBranch, Calendar, ArrowRight, Plus, Zap, Loader2,
  School, UserPlus,
} from "lucide-react"
import Link from "next/link"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts"

import { DynamicAnimatedBackground } from "@/components/3d/dynamic"
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/3d/micro-animations"
import { enrollmentData, revenueData } from "@/config/chart-data"

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour ago`
  return `${Math.floor(hrs / 24)} days ago`
}

function activityBadge(table: string): "info" | "success" | "warning" | "purple" | "default" {
  if (table.includes("student")) return "info"
  if (table.includes("payment") || table.includes("invoice")) return "success"
  if (table.includes("contract") || table.includes("hr")) return "warning"
  if (table.includes("library") || table.includes("book")) return "purple"
  return "default"
}

export default function AdminDashboard() {
  const { data: overview, isLoading } = useDashboardOverview()
  const { data: trends } = useDashboardTrends()
  const { data: wizard } = useSetupWizardStatus()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
<DynamicAnimatedBackground />
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const d = overview
  const t = d?.totals
  const stats = {
    students: t ? String(t.students) : "—",
    staff: t ? String(t.staff) : "—",
    directors: t ? String(t.teachers) : "—",
    revenue: t ? `$${(d!.finance.revenue || 0).toLocaleString()}` : "—",
    branches: t ? String(t.branches) : "—",
    academicYear: d?.academic_year?.name || "—",
  }

  const activities = (d?.recent_activity || []).map((a) => ({
    action: `${a.action} on ${a.table_name}`,
    time: timeAgo(a.created_at),
    badge: activityBadge(a.table_name),
  }))

  const enrollmentTrend = trends?.enrollment_trend || []
  const trendRevenue = trends?.revenue_trend || []
  const setupSteps = wizard && !wizard.all_done ? wizard.steps : null

  const missingSteps = setupSteps ? Object.entries(setupSteps).filter(([, v]) => !v).map(([k]) => k.replace(/_/g, " ")) : []

  return (
    <div className="space-y-8 animate-fade-in">
      <DynamicAnimatedBackground />

      {setupSteps && (
        <FadeInUp>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-amber-800">Setup incomplete</p>
              <p className="text-sm text-amber-700 mt-1">
                Missing: {missingSteps.join(", ")}.
              </p>
            </div>
            <Link href="/admin/setup">
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">Complete Setup</Button>
            </Link>
          </div>
        </FadeInUp>
      )}

      <FadeInUp>
        <PageHeader
        title="Control Center"
        description="School overview and key metrics at a glance."
        actions={
          <>
            <Link href="/admin/directors/new">
              <Button variant="outline"><Plus className="h-4 w-4 mr-2" /> Add Director</Button>
            </Link>
            <Link href="/admin/branches/new">
              <Button><GitBranch className="h-4 w-4 mr-2" /> New Branch</Button>
            </Link>
          </>
        }
      />
      </FadeInUp>

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

      <FadeInUp delay={0.2}>
        <SectionHeader
          title="Analytics"
          description="Enrollment and financial performance"
        />
      </FadeInUp>

      <div className="grid gap-6 lg:grid-cols-2">
        <FadeInUp delay={0.3}>
          <Card shadow="colored">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" /> Enrollment Trend
            </CardTitle>
            <CardDescription>Student enrollment over the academic year</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={enrollmentTrend.length > 0 ? enrollmentTrend : enrollmentData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 12 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="students" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
          </Card>
        </FadeInUp>

        <FadeInUp delay={0.4}>
          <Card shadow="colored">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4 text-primary" /> Revenue vs Expenses
            </CardTitle>
            <CardDescription>Monthly financial performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendRevenue.length > 0 ? trendRevenue : revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 12 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" name="Revenue" strokeWidth={2} />
                  <Area type="monotone" dataKey="expenses" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive) / 0.08)" name="Expenses" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
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
              <Zap className="h-4 w-4 text-primary" /> Activity Feed
            </CardTitle>
            <CardDescription>Latest actions across the school</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-4 font-medium">Action</th>
                  <th className="p-4 font-medium">Time</th>
                  <th className="p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {activities.length === 0 ? (
                  <tr><td className="p-4 text-muted-foreground text-center" colSpan={3}>No recent activity</td></tr>
                ) : activities.map((a, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-medium">{a.action}</td>
                    <td className="p-4 text-muted-foreground">{a.time}</td>
                    <td className="p-4">
                      <StatusBadge status={a.badge === "info" ? "Info" : a.badge === "success" ? "Success" : a.badge === "warning" ? "Pending" : a.badge === "purple" ? "Update" : "Done"} variant={a.badge} />
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
                <School className="h-4 w-4 text-primary" /> Quick Actions
              </CardTitle>
              <CardDescription>Frequently used management tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <Link href="/admin/directors/new">
                  <Button variant="outline" className="w-full justify-between h-10">
                    <span className="flex items-center gap-2"><UserPlus className="h-4 w-4" /> Add Director</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </Link>
                <Link href="/admin/branches/new">
                  <Button variant="outline" className="w-full justify-between h-10">
                    <span className="flex items-center gap-2"><GitBranch className="h-4 w-4" /> New Branch</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </Link>
                <Link href="/admin/academic-years">
                  <Button variant="outline" className="w-full justify-between h-10">
                    <span className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Manage Academic Years</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </Link>
                <Link href="/admin/reports">
                  <Button variant="outline" className="w-full justify-between h-10">
                    <span className="flex items-center gap-2"><TrendingUp className="h-4 w-4" /> View Reports</span>
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
