"use client"

import { useState } from "react"
import { KPICard } from "@/components/ui/kpi-card"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { SectionHeader } from "@/components/ui/section-header"
import { PageHeader } from "@/components/ui/page-header"
import { useStudents, useParents } from "@/hooks/queries"
import Link from "next/link"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import {
  Users, UserPlus, Sparkles, QrCode, Loader2, ArrowRight,
  BarChart3, FileText, CheckCircle, AlertTriangle, Printer,
  ClipboardList, Clock, ShieldAlert, CreditCard, TrendingUp
} from "lucide-react"

import { DynamicAnimatedBackground } from "@/components/3d/dynamic"
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/3d/micro-animations"

function getSeason() {
  const m = new Date().getMonth()
  if (m >= 2 && m <= 4) return "Spring Term"
  if (m >= 5 && m <= 7) return "Summer Term"
  if (m >= 8 && m <= 10) return "Fall Term"
  return "Winter Term"
}

const enrollmentData = [
  { month: "Sep", students: 120 },
  { month: "Oct", students: 145 },
  { month: "Nov", students: 162 },
  { month: "Dec", students: 158 },
  { month: "Jan", students: 175 },
  { month: "Feb", students: 190 },
  { month: "Mar", students: 210 },
  { month: "Apr", students: 225 },
]

const funnelData = [
  { stage: "Inquiry", count: 280, color: "bg-blue-500" },
  { stage: "Application", count: 220, color: "bg-indigo-500" },
  { stage: "Assessment", count: 180, color: "bg-purple-500" },
  { stage: "Admitted", count: 150, color: "bg-violet-500" },
  { stage: "Enrolled", count: 120, color: "bg-emerald-500" },
]

const pendingTasks = [
  { task: "3 transfer requests pending review", type: "transfer", count: 3, urgency: "warning" as const, icon: ClipboardList, href: "/registrar/transfers" },
  { task: "5 ID cards ready to print", type: "id_cards", count: 5, urgency: "info" as const, icon: Printer, href: "/registrar/qr" },
  { task: "2 promotions awaiting approval", type: "promotion", count: 2, urgency: "warning" as const, icon: TrendingUp, href: "/registrar/promotions" },
  { task: "12 new student registrations to verify", type: "registration", count: 12, urgency: "destructive" as const, icon: ShieldAlert, href: "/registrar/students" },
]

const gradeLevelData = [
  { grade: "Pre-K", count: 45 },
  { grade: "K", count: 62 },
  { grade: "1", count: 58 },
  { grade: "2", count: 55 },
  { grade: "3", count: 61 },
  { grade: "4", count: 52 },
  { grade: "5", count: 48 },
  { grade: "6", count: 63 },
  { grade: "7", count: 57 },
  { grade: "8", count: 54 },
  { grade: "9", count: 49 },
  { grade: "10", count: 47 },
  { grade: "11", count: 42 },
  { grade: "12", count: 38 },
]

const recentActivity = [
  { action: "Student registered", user: "John Doe", time: "10 min ago", badge: "success" as const },
  { action: "Transfer request", user: "Jane Smith", time: "25 min ago", badge: "info" as const },
  { action: "QR card printed", user: "Alex Johnson", time: "1 hour ago", badge: "success" as const },
  { action: "Document verified", user: "Sarah Lee", time: "2 hours ago", badge: "purple" as const },
  { action: "Promotion processed", user: "Grade 10A", time: "3 hours ago", badge: "success" as const },
]

const urgencyStyles: Record<string, string> = {
  destructive: "bg-red-500/10 text-red-600 border-red-200",
  warning: "bg-amber-500/10 text-amber-600 border-amber-200",
  info: "bg-blue-500/10 text-blue-600 border-blue-200",
}

export default function RegistrarDashboard() {
  const { data: studentsData, isLoading: loadingStudents } = useStudents({ limit: 200 })
  const { data: parentsData, isLoading: loadingParents } = useParents({ limit: 200 })
  const loading = loadingStudents || loadingParents

  const students = studentsData?.length ?? "-"
  const parents = parentsData?.length ?? "-"

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
<DynamicAnimatedBackground />
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const maxGradeCount = Math.max(...gradeLevelData.map((g: any) => g.count))
  const funnelMax = funnelData[0].count

  return (
    <div className="space-y-8 animate-fade-in">
      <DynamicAnimatedBackground />

      <FadeInUp>
        <PageHeader
          title="Registrar Workflow"
          description="Student admissions, registration, and academic records management."
          actions={
            <Link href="/registrar/students/new">
              <Button size="sm"><UserPlus className="h-4 w-4 mr-2" /> Register Student</Button>
            </Link>
          }
        />
      </FadeInUp>

      <StaggerContainer>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StaggerItem>
            <KPICard
              title="Students"
              value={students}
              icon={Users}
              trend={{ value: "+15", positive: true }}
              sparklineData={[120, 145, 162, 158, 175, 190, 210, 225]}
            />
          </StaggerItem>
          <StaggerItem>
            <KPICard
              title="Parents"
              value={parents}
              icon={UserPlus}
              trend={{ value: "+8", positive: true }}
              sparklineData={[80, 92, 98, 105, 110, 115, 120, 125]}
            />
          </StaggerItem>
          <StaggerItem>
            <KPICard
              title="Current Term"
              value={getSeason()}
              icon={Sparkles}
              trend={{ value: "Active", positive: true }}
            />
          </StaggerItem>
          <StaggerItem>
            <KPICard
              title="ID Cards"
              value="Active"
              icon={QrCode}
              trend={{ value: "Ready", positive: true }}
              sparklineData={[30, 28, 35, 42, 38, 45, 40, 48]}
            />
          </StaggerItem>
        </div>
      </StaggerContainer>

      <FadeInUp delay={0.2}>
        <SectionHeader title="Enrollment Analytics" description="Student enrollment and registration trends" />
      </FadeInUp>

      <div className="grid gap-6 lg:grid-cols-7">
        <FadeInUp delay={0.3} className="lg:col-span-4">
          <Card shadow="colored">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-primary" /> Enrollment Trend
              </CardTitle>
              <CardDescription>New student registrations over the year</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={enrollmentData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="students" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Students" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </FadeInUp>

        <FadeInUp delay={0.4} className="lg:col-span-3">
          <Card shadow="default">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle className="h-4 w-4 text-primary" /> Recent Activity
              </CardTitle>
              <CardDescription>Latest registration events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 border-b border-border/50 pb-3 last:border-0 last:pb-0">
                    <div className="rounded-full bg-primary/5 p-1.5 text-primary">
                      <FileText className="h-3 w-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{a.action}</p>
                      <p className="text-xs text-muted-foreground">{a.user} - {a.time}</p>
                    </div>
                    <StatusBadge status={a.badge === "success" ? "Success" : a.badge === "purple" ? "Update" : "Info"} variant={a.badge} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </FadeInUp>
      </div>

      <FadeInUp delay={0.5}>
        <SectionHeader title="Admissions Pipeline" description="Enrollment funnel and grade distribution" />
      </FadeInUp>

      <div className="grid gap-6 lg:grid-cols-7">
        <FadeInUp delay={0.55} className="lg:col-span-4">
          <Card shadow="default">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-primary" /> Students by Grade Level
              </CardTitle>
              <CardDescription>Current enrollment across all grades</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {gradeLevelData.map((g: any) => (
                  <div key={g.grade} className="flex items-center gap-3">
                    <span className="w-12 text-xs font-medium text-muted-foreground text-right shrink-0">{g.grade}</span>
                    <div className="flex-1 h-6 bg-muted/30 rounded-full overflow-hidden relative">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-500"
                        style={{ width: `${(g.count / maxGradeCount) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 text-xs font-semibold text-right tabular-nums">{g.count}</span>
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
                <Clock className="h-4 w-4 text-primary" /> Pending Tasks
              </CardTitle>
              <CardDescription>Items requiring your attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingTasks.map((t, i) => {
                  const TaskIcon = t.icon
                  return (
                    <Link key={i} href={t.href}>
                      <div className={cn(
                        "flex items-center gap-3 rounded-lg border p-3 transition-colors cursor-pointer hover:bg-muted/50",
                        urgencyStyles[t.urgency] || "border-border"
                      )}>
                        <div className="shrink-0">
                          <TaskIcon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight">{t.task}</p>
                        </div>
                        <Badge
                          variant={t.urgency === "destructive" ? "destructive" : "secondary"}
                          className="shrink-0 tabular-nums"
                        >
                          {t.count}
                        </Badge>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </FadeInUp>
      </div>

      <FadeInUp delay={0.65}>
        <Card shadow="default">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" /> Enrollment Funnel
            </CardTitle>
            <CardDescription>Pipeline from inquiry to enrollment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {funnelData.map((f, i) => {
                const pct = Math.round((f.count / funnelMax) * 100)
                const convRate = i === 0 ? "100%" : `${Math.round((f.count / funnelData[i - 1].count) * 100)}%`
                return (
                  <div key={f.stage} className="flex items-center gap-4">
                    <span className="w-24 text-sm font-medium text-right shrink-0">{f.stage}</span>
                    <div className="flex-1 relative">
                      <div className="h-9 bg-muted/20 rounded-lg overflow-hidden">
                        <div
                          className={cn("h-full rounded-lg transition-all duration-700 flex items-center px-3", f.color)}
                          style={{ width: `${pct}%` }}
                        >
                          <span className="text-xs font-bold text-white drop-shadow-sm">{f.count}</span>
                        </div>
                      </div>
                    </div>
                    <span className="w-14 text-xs text-muted-foreground text-right shrink-0">{pct}%</span>
                    <span className="w-16 text-xs text-muted-foreground text-right shrink-0">
                      {i === 0 ? "" : `${convRate} conv.`}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </FadeInUp>
    </div>
  )
}

function cn(...inputs: (string | undefined | false)[]) {
  return inputs.filter(Boolean).join(" ")
}
