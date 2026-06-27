"use client"

import { useEffect, useState } from "react"
import { KPICard } from "@/components/ui/kpi-card"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { SectionHeader } from "@/components/ui/section-header"
import { PageHeader } from "@/components/ui/page-header"
import api from "@/services/api"
import {
  Users, GraduationCap, DollarSign, TrendingUp, UserCog,
  GitBranch, Calendar, ArrowRight, Plus, Zap, Loader2,
  School, CreditCard, UserPlus, BookOpen, ShoppingCart,
} from "lucide-react"
import Link from "next/link"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts"

import { AnimatedBackground } from "@/components/3d/animated-background"
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/3d/micro-animations"

const enrollmentData = [
  { month: "Sep", students: 120 }, { month: "Oct", students: 145 },
  { month: "Nov", students: 162 }, { month: "Dec", students: 158 },
  { month: "Jan", students: 175 }, { month: "Feb", students: 190 },
  { month: "Mar", students: 210 }, { month: "Apr", students: 225 },
  { month: "May", students: 240 }, { month: "Jun", students: 255 },
]

const revenueData = [
  { month: "Sep", revenue: 45000, expenses: 32000 },
  { month: "Oct", revenue: 52000, expenses: 34000 },
  { month: "Nov", revenue: 48000, expenses: 31000 },
  { month: "Dec", revenue: 61000, expenses: 38000 },
  { month: "Jan", revenue: 58000, expenses: 36000 },
  { month: "Feb", revenue: 63000, expenses: 39000 },
  { month: "Mar", revenue: 72000, expenses: 42000 },
  { month: "Apr", revenue: 68000, expenses: 40000 },
  { month: "May", revenue: 75000, expenses: 43000 },
  { month: "Jun", revenue: 82000, expenses: 45000 },
]

const activities = [
  { action: "New student enrolled", user: "Registrar", time: "10 min ago", badge: "info" as const },
  { action: "Fee payment received", user: "Finance", time: "25 min ago", badge: "success" as const },
  { action: "Staff contract updated", user: "HR", time: "1 hour ago", badge: "warning" as const },
  { action: "Library book borrowed", user: "Library", time: "2 hours ago", badge: "purple" as const },
  { action: "Cafeteria order placed", user: "Cafeteria", time: "3 hours ago", badge: "default" as const },
]

const activityIcons: Record<string, typeof TrendingUp> = {
  enrollment: TrendingUp,
  payment: CreditCard,
  hr: UserPlus,
  library: BookOpen,
  cafeteria: ShoppingCart,
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    students: "—", staff: "—", directors: "—",
    revenue: "—", branches: "—", academicYear: "—",
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get("/users", { params: { role: "DIRECTOR" } }).then(r => r.data?.length || 0).catch(() => 0),
      api.get("/students").then(r => r.data?.length || r.data?.total || 0).catch(() => 0),
      api.get("/staff").then(r => r.data?.length || 0).catch(() => 0),
      api.get("/academic-years").then(r => {
        const current = Array.isArray(r.data) ? r.data.find((y: any) => y.is_current) : null
        return current?.name || "2025/2026"
      }).catch(() => "2025/2026"),
    ]).then(([directors, students, staff, academicYear]) => {
      setStats({
        students: String(students), staff: String(staff), directors: String(directors),
        revenue: "$82,000", branches: "3", academicYear,
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
                <BarChart data={enrollmentData}>
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
                <AreaChart data={revenueData}>
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
                {activities.map((a, i) => (
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
