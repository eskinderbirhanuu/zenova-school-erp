"use client"

import { useMemo } from "react"
import { KPICard } from "@/components/ui/kpi-card"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { SectionHeader } from "@/components/ui/section-header"
import { useStudentPortalDashboard } from "@/hooks/queries"
import {
  ClipboardCheck, Award, Calendar, Wallet,
  Clock, Sun, Moon, CloudSun, Flame, BellRing,
} from "lucide-react"

import DashboardShell from "@/components/dashboard/dashboard-shell"
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/3d/micro-animations"
import { formatCurrency } from "@/lib/currency"
import BarChartCard from "@/components/dashboard/bar-chart-card"
import ChartsGrid from "@/components/dashboard/charts-grid"
import TimelineCard from "@/components/dashboard/timeline-card"

function getGreeting(): { text: string; icon: typeof Sun } {
  const h = new Date().getHours()
  if (h < 12) return { text: "Good morning", icon: Sun }
  if (h < 17) return { text: "Good afternoon", icon: CloudSun }
  return { text: "Good evening", icon: Moon }
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  })
}

export default function StudentDashboard() {
  const { data, isLoading } = useStudentPortalDashboard()
  const dashboard = (data ?? {}) as Record<string, any>
  const d = dashboard
  const schedule = Array.isArray(dashboard.schedule) ? dashboard.schedule : []
  const grades = Array.isArray(dashboard.grades) ? dashboard.grades : []
  const assignments = Array.isArray(dashboard.assignments) ? dashboard.assignments : []

  const greeting = useMemo(() => getGreeting(), [])
  const dateStr = useMemo(() => formatDate(), [])
  const GreetingIcon = greeting.icon
  const scheduleEvents = useMemo(() =>
    (schedule || []).map((p: any) => ({ time: p.time, subject: p.subject, room: p.room || "", status: "upcoming" as const })),
    [schedule],
  )

  return (
    <DashboardShell
      isLoading={isLoading}
      header={
        <FadeInUp>
          <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-6 md:p-8">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="rounded-xl bg-primary/10 p-2.5">
                    <GreetingIcon className="h-5 w-5 text-primary" />
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{greeting.text}, {d.student_name || "Student"}</h1>
                </div>
                <p className="text-muted-foreground text-sm">{dateStr}</p>
              </div>
              {assignments.length > 0 && (
                <div className="flex items-center gap-2 rounded-full bg-amber-500/10 px-4 py-2 border border-amber-500/20">
                  <Flame className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-semibold text-amber-600">
                    {assignments.length} upcoming assignment{assignments.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          </div>
        </FadeInUp>
      }
      widgets={[
        <StaggerContainer key="kpi">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StaggerItem><KPICard title="Attendance Rate" value={`${d.attendance_pct || 0}%`} icon={ClipboardCheck} trend={{ value: `${d.present_days || 0}/${d.total_days || 0} days`, positive: (d.attendance_pct || 0) >= 80 }} accentColor="bg-emerald-500" /></StaggerItem>
            <StaggerItem><KPICard title="My Results" value={grades.length} icon={Award} trend={{ value: "Subjects", positive: true }} /></StaggerItem>
            <StaggerItem><KPICard title="Timetable" value={`${schedule.length} today`} icon={Calendar} trend={{ value: "periods", positive: true }} /></StaggerItem>
            <StaggerItem><KPICard title="Wallet Balance" value={formatCurrency(d.wallet_balance || 0)} icon={Wallet} trend={{ value: "-", positive: true }} /></StaggerItem>
          </div>
        </StaggerContainer>,
        <ChartsGrid key="grades">
          <BarChartCard title="Subject Grades" description="Current term performance by subject" data={grades} xKey="subject" dataKey="score" name="Score" delay={0.3} color="hsl(var(--primary))" emptyMessage="No grades available yet" />
          <FadeInUp delay={0.4} className="lg:col-span-3">
            <Card shadow="default">
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BellRing className="h-4 w-4 text-primary" /> This Week</CardTitle><CardDescription>Quick summary</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1"><span className="text-sm text-muted-foreground">Attendance</span><span className="text-sm font-semibold">{d.present_days || 0} / {d.total_days || 0}</span></div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${d.attendance_pct || 0}%` }} /></div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-500">Present: {d.present_days || 0}</span>
                  <span className="text-red-500">Absent: {d.absent_days || 0}</span>
                  <span className="text-yellow-500">Late: {d.late_days || 0}</span>
                </div>
              </CardContent>
            </Card>
          </FadeInUp>
        </ChartsGrid>,
        <FadeInUp delay={0.15} key="upcoming-section"><SectionHeader title="Upcoming" description="Assignments and schedule" /></FadeInUp>,
        <StaggerContainer key="assignments">
          <div className="grid gap-4 md:grid-cols-3">
            {assignments.length > 0 ? assignments.slice(0, 3).map((a: any, i: number) => (
              <StaggerItem key={i}>
                <Card shadow="default" className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardDescription className="text-xs font-semibold uppercase tracking-wide text-primary">{a.subject || "General"}</CardDescription>
                      <StatusBadge status={a.due_date ? "Active" : "Info"} variant={a.due_date ? "warning" : "info"} />
                    </div>
                    <CardTitle className="text-sm font-semibold leading-snug">{a.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" /><span className="font-medium">{a.due_date || "No due date"}</span>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            )) : (
              <StaggerItem><Card><CardContent className="text-center py-8 text-muted-foreground">No upcoming assignments</CardContent></Card></StaggerItem>
            )}
          </div>
        </StaggerContainer>,
        <TimelineCard title="Today&apos;s Schedule" description="Your class schedule for today" events={scheduleEvents} delay={0.5} key="schedule" />,
      ]}
    />
  )
}
