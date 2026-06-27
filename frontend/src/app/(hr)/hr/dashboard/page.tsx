"use client"

import { useEffect, useState } from "react"
import { KPICard } from "@/components/ui/kpi-card"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { SectionHeader } from "@/components/ui/section-header"
import { PageHeader } from "@/components/ui/page-header"
import { hrService, staffService } from "@/services/api"
import Link from "next/link"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import {
  Users, FileText, ClipboardCheck, DollarSign, Loader2, ArrowRight,
  BarChart3, UserPlus, Calendar, Award, Clock
} from "lucide-react"

import { AnimatedBackground } from "@/components/3d/animated-background"
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/3d/micro-animations"

const deptHeadcount = [
  { dept: "Admin", count: 8 },
  { dept: "Teaching", count: 42 },
  { dept: "Support", count: 18 },
  { dept: "IT", count: 6 },
  { dept: "Finance", count: 5 },
]

const recentHR = [
  { action: "New hire onboarded", dept: "Teaching", time: "10 min ago", badge: "success" as const },
  { action: "Contract renewed", dept: "Admin", time: "25 min ago", badge: "info" as const },
  { action: "Leave approved", dept: "Support", time: "1 hour ago", badge: "success" as const },
  { action: "Attendance flagged", dept: "IT", time: "2 hours ago", badge: "warning" as const },
  { action: "Payroll run", dept: "Finance", time: "3 hours ago", badge: "purple" as const },
]

export default function HrDashboard() {
  const [employees, setEmployees] = useState<number | string>("—")
  const [contracts, setContracts] = useState<number | string>("—")
  const [attendance, setAttendance] = useState<number | string>("—")
  const [payroll, setPayroll] = useState<string>("—")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      staffService.list({ limit: 1 }).then((r) => {
        const total = r.headers?.["x-total-count"]
        return total ? Number(total) : r.data?.length ?? "—"
      }).catch(() => "—"),
      hrService.contracts.list({ limit: 1 }).then((r) => {
        const total = r.headers?.["x-total-count"]
        return total ? Number(total) : r.data?.length ?? "—"
      }).catch(() => "—"),
      (() => {
        const today = new Date().toISOString().slice(0, 10)
        return hrService.attendance.list({ date: today }).then((r) => r.data?.length ?? "—").catch(() => "—")
      })(),
      hrService.contracts.list().then((r) => {
        const active = Array.isArray(r.data) ? r.data.filter((c: any) => c.status === "active").length : "—"
        return `${active} active`
      }).catch(() => "—"),
    ]).then(([employees, contracts, attendance, payroll]) => {
      setEmployees(employees)
      setContracts(contracts)
      setAttendance(attendance)
      setPayroll(payroll)
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
        title="People Hub"
        description="Workforce management, contracts, and attendance overview."
      />
      </FadeInUp>

      <StaggerContainer>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StaggerItem><KPICard title="Employees" value={employees} icon={Users} trend={{ value: "+5", positive: true }} /></StaggerItem>
          <StaggerItem><KPICard title="Active Contracts" value={contracts} icon={FileText} trend={{ value: "+2", positive: true }} /></StaggerItem>
          <StaggerItem><KPICard title="Today's Attendance" value={attendance} icon={ClipboardCheck} trend={{ value: "96%", positive: true }} accentColor="bg-emerald-500" /></StaggerItem>
          <StaggerItem><KPICard title="Payroll Status" value={payroll} icon={DollarSign} trend={{ value: "On track", positive: true }} /></StaggerItem>
        </div>
      </StaggerContainer>

      <FadeInUp delay={0.2}>
        <SectionHeader title="Workforce Analytics" description="Headcount and attendance insights" />
      </FadeInUp>

      <div className="grid gap-6 lg:grid-cols-7">
        <FadeInUp delay={0.3} className="lg:col-span-4">
          <Card shadow="colored">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-primary" /> Headcount by Department
            </CardTitle>
            <CardDescription>Staff distribution across departments</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={deptHeadcount}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                <XAxis dataKey="dept" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Staff" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
          </Card>
        </FadeInUp>

        <FadeInUp delay={0.4} className="lg:col-span-3">
          <Card shadow="default">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-primary" /> Recent HR Activity
            </CardTitle>
            <CardDescription>Latest workforce events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentHR.map((a, i) => (
                <div key={i} className="flex items-start gap-3 border-b border-border/50 pb-3 last:border-0 last:pb-0">
                  <div className="rounded-full bg-primary/5 p-1.5 text-primary">
                    <Users className="h-3 w-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{a.action}</p>
                    <p className="text-xs text-muted-foreground">{a.dept} - {a.time}</p>
                  </div>
                  <StatusBadge status={a.badge === "success" ? "Success" : a.badge === "warning" ? "Pending" : a.badge === "purple" ? "Update" : "Info"} variant={a.badge} />
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
                <BarChart3 className="h-4 w-4 text-primary" /> Attendance Overview
            </CardTitle>
            <CardDescription>This month's attendance statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
              Attendance chart coming soon
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
            <CardDescription>Common HR tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <Link href="/hr/employees">
                <Button variant="outline" className="w-full justify-between h-10">
                  <span className="flex items-center gap-2"><UserPlus className="h-4 w-4" /> Add Employee</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </Link>
              <Link href="/hr/attendance">
                <Button variant="outline" className="w-full justify-between h-10">
                  <span className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Mark Attendance</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </Link>
              <Link href="/hr/payroll">
                <Button variant="outline" className="w-full justify-between h-10">
                  <span className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> Process Payroll</span>
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
