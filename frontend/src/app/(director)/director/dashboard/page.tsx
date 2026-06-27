"use client"

import { useEffect, useState } from "react"
import { KPICard } from "@/components/ui/kpi-card"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { SectionHeader } from "@/components/ui/section-header"
import { PageHeader } from "@/components/ui/page-header"
import { teacherService, staffService, financeService, auditService } from "@/services/api"
import Link from "next/link"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts"
import {
  Users, GraduationCap, DollarSign, ScrollText, Building2, Activity,
  ArrowRight, BarChart3, PieChart as PieIcon, Loader2, TrendingUp,
  UserPlus, FileText, Award, Eye
} from "lucide-react"

import { AnimatedBackground } from "@/components/3d/animated-background"
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/3d/micro-animations"

const deptData = [
  { name: "Science", value: 42 },
  { name: "Maths", value: 38 },
  { name: "English", value: 29 },
  { name: "Arts", value: 18 },
  { name: "PE", value: 12 },
]

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"]

const recentActivities = [
  { action: "New teacher onboarded", user: "HR", time: "10 min ago", badge: "success" as const },
  { action: "Budget approved", user: "Finance", time: "25 min ago", badge: "info" as const },
  { action: "Department restructured", user: "Admin", time: "1 hour ago", badge: "warning" as const },
  { action: "Audit completed", user: "Auditor", time: "2 hours ago", badge: "success" as const },
  { action: "Policy updated", user: "Director", time: "3 hours ago", badge: "purple" as const },
]

export default function DirectorDashboard() {
  const [teachersCount, setTeachersCount] = useState<number>(0)
  const [staffCount, setStaffCount] = useState<number>(0)
  const [totalRevenue, setTotalRevenue] = useState<string>("—")
  const [auditCount, setAuditCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      teacherService.list({ limit: 1 }).then((res) => res.data?.total ?? res.data?.length ?? 0).catch(() => 0),
      staffService.list({ limit: 1 }).then((res) => res.data?.total ?? res.data?.length ?? 0).catch(() => 0),
      financeService.trialBalance().then((res) => {
        const tb = res.data
        const debit = tb?.total_debit ?? tb?.debit ?? 0
        const credit = tb?.total_credit ?? tb?.credit ?? 0
        return `$${(debit + credit).toLocaleString()}`
      }).catch(() => "—"),
      auditService.list({ limit: 1 }).then((res) => res.data?.total ?? res.data?.length ?? 0).catch(() => 0),
    ]).then(([teachers, staff, revenue, audits]) => {
      setTeachersCount(teachers)
      setStaffCount(staff)
      setTotalRevenue(revenue)
      setAuditCount(audits)
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
        title="Executive Analytics"
        description="High-level overview of institutional performance and departmental health."
        actions={
          <>
            <Link href="/director/reports">
              <Button variant="outline" size="sm"><Eye className="h-4 w-4 mr-2" /> View Reports</Button>
            </Link>
          </>
        }
      />
      </FadeInUp>

      <StaggerContainer>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StaggerItem><KPICard title="Teachers" value={teachersCount} icon={GraduationCap} trend={{ value: "+5%", positive: true }} /></StaggerItem>
          <StaggerItem><KPICard title="Staff" value={staffCount} icon={Users} trend={{ value: "+3", positive: true }} /></StaggerItem>
          <StaggerItem><KPICard title="Total Revenue" value={totalRevenue} icon={DollarSign} trend={{ value: "+18%", positive: true }} accentColor="bg-emerald-500" /></StaggerItem>
          <StaggerItem><KPICard title="Recent Audits" value={auditCount} icon={ScrollText} trend={{ value: "+2", positive: false }} /></StaggerItem>
          <StaggerItem><KPICard title="Departments" value={5} icon={Building2} trend={{ value: "0", positive: true }} /></StaggerItem>
          <StaggerItem><KPICard title="Active Users" value={342} icon={Activity} trend={{ value: "+12", positive: true }} /></StaggerItem>
        </div>
      </StaggerContainer>

      <FadeInUp delay={0.2}>
        <SectionHeader title="Departmental Insights" description="Teacher distribution and resource allocation" />
      </FadeInUp>

      <div className="grid gap-6 lg:grid-cols-7">
        <FadeInUp delay={0.3} className="lg:col-span-4">
          <Card shadow="colored">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" /> Teachers by Department
            </CardTitle>
            <CardDescription>Staff count across academic departments</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={deptData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Teachers" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
          </Card>
        </FadeInUp>

        <FadeInUp delay={0.4} className="lg:col-span-3">
          <Card shadow="colored">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieIcon className="h-4 w-4 text-primary" /> Distribution
            </CardTitle>
            <CardDescription>Percentage by department</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={deptData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={3}>
                  {deptData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                </Pie>
                <Tooltip />
              </PieChart>
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
              <TrendingUp className="h-4 w-4 text-primary" /> Recent Activity
            </CardTitle>
            <CardDescription>Latest institutional events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivities.map((a, i) => (
                <div key={i} className="flex items-start gap-3 border-b border-border/50 pb-3 last:border-0 last:pb-0">
                  <div className="rounded-full bg-primary/5 p-1.5 text-primary">
                    <TrendingUp className="h-3 w-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{a.action}</p>
                    <p className="text-xs text-muted-foreground">{a.user} · {a.time}</p>
                  </div>
                  <StatusBadge status={a.badge === "success" ? "Success" : a.badge === "warning" ? "Pending" : a.badge === "purple" ? "Update" : "Info"} variant={a.badge} />
                </div>
              ))}
            </div>
          </CardContent>
          </Card>
        </FadeInUp>

        <FadeInUp delay={0.6} className="lg:col-span-3">
          <Card shadow="default">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Award className="h-4 w-4 text-primary" /> Quick Actions
              </CardTitle>
              <CardDescription>Frequently used management tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <Link href="/director/staff/new">
                  <Button variant="outline" className="w-full justify-between h-10">
                    <span className="flex items-center gap-2"><UserPlus className="h-4 w-4" /> Add Staff</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </Link>
                <Link href="/director/teachers/new">
                  <Button variant="outline" className="w-full justify-between h-10">
                    <span className="flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Add Teacher</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </Link>
                <Link href="/director/reports">
                  <Button variant="outline" className="w-full justify-between h-10">
                    <span className="flex items-center gap-2"><FileText className="h-4 w-4" /> View Reports</span>
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
