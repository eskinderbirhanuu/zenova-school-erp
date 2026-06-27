"use client"

import { useEffect, useState } from "react"
import { KPICard } from "@/components/ui/kpi-card"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { SectionHeader } from "@/components/ui/section-header"
import { PageHeader } from "@/components/ui/page-header"
import { academicService } from "@/services/api"
import Link from "next/link"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import {
  BookOpen, LayoutGrid, CalendarCheck, Clock, Loader2, ArrowRight,
  CheckCircle, BarChart3, ClipboardCheck, Users, FileText
} from "lucide-react"
import { AnimatedBackground } from "@/components/3d/animated-background"
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/3d/micro-animations"

const classDistribution = [
  { day: "Mon", classes: 5 },
  { day: "Tue", classes: 4 },
  { day: "Wed", classes: 6 },
  { day: "Thu", classes: 4 },
  { day: "Fri", classes: 5 },
]

const recentActivities = [
  { action: "Assignment submitted", subject: "Grade 10A", time: "10 min ago", badge: "success" as const },
  { action: "Exam graded", subject: "Grade 11B", time: "25 min ago", badge: "info" as const },
  { action: "Attendance marked", subject: "Grade 9C", time: "1 hour ago", badge: "success" as const },
  { action: "Schedule updated", subject: "Admin", time: "2 hours ago", badge: "warning" as const },
  { action: "New announcement", subject: "Principal", time: "3 hours ago", badge: "purple" as const },
]

export default function TeacherDashboard() {
  const [classes, setClasses] = useState<number | string>("—")
  const [sections, setSections] = useState<number | string>("—")
  const [exams, setExams] = useState<number | string>("—")
  const [schedule, setSchedule] = useState<number | string>("—")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      academicService.classes.list().then((r) => r.data?.length ?? "—").catch(() => "—"),
      academicService.sections.list().then((r) => r.data?.length ?? "—").catch(() => "—"),
      academicService.exams.list().then((r) => r.data?.length ?? "—").catch(() => "—"),
      academicService.timetable.list().then((r) => r.data?.length ?? "—").catch(() => "—"),
    ]).then(([classes, sections, exams, schedule]) => {
      setClasses(classes)
      setSections(sections)
      setExams(exams)
      setSchedule(schedule)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <AnimatedBackground />

      <FadeInUp>
        <PageHeader
          title="Classroom Dashboard"
          description="Your classes, schedule, and student progress at a glance."
        />
      </FadeInUp>

      <StaggerContainer>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StaggerItem><KPICard title="Classes" value={classes} icon={BookOpen} trend={{ value: "+2", positive: true }} /></StaggerItem>
          <StaggerItem><KPICard title="Sections" value={sections} icon={LayoutGrid} trend={{ value: "+1", positive: true }} /></StaggerItem>
          <StaggerItem><KPICard title="Upcoming Exams" value={exams} icon={CalendarCheck} trend={{ value: "+3", positive: false }} accentColor="bg-amber-500" /></StaggerItem>
          <StaggerItem><KPICard title="Today's Schedule" value={schedule} icon={Clock} trend={{ value: "0", positive: true }} /></StaggerItem>
        </div>
      </StaggerContainer>

      <FadeInUp delay={0.2}>
        <SectionHeader title="Weekly Overview" description="Your class schedule distribution" />
      </FadeInUp>

      <div className="grid gap-6 lg:grid-cols-7">
        <FadeInUp delay={0.3} className="lg:col-span-4">
          <Card shadow="colored">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-primary" /> Class Distribution
              </CardTitle>
              <CardDescription>Classes per day of the week</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={classDistribution}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="classes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Classes" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </FadeInUp>

        <FadeInUp delay={0.4} className="lg:col-span-3">
          <Card shadow="default">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardCheck className="h-4 w-4 text-primary" /> Today's Tasks
              </CardTitle>
              <CardDescription>Quick access to common actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <Link href="/teacher/attendance">
                  <Button variant="outline" className="w-full justify-between h-10">
                    <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4" /> Mark Attendance</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </Link>
                <Link href="/teacher/grades">
                  <Button variant="outline" className="w-full justify-between h-10">
                    <span className="flex items-center gap-2"><FileText className="h-4 w-4" /> Grade Results</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </Link>
                <Link href="/teacher/timetable">
                  <Button variant="outline" className="w-full justify-between h-10">
                    <span className="flex items-center gap-2"><Users className="h-4 w-4" /> View Schedule</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </Link>
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
                <BarChart3 className="h-4 w-4 text-primary" /> Recent Activity
              </CardTitle>
              <CardDescription>Latest updates and events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivities.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 border-b border-border/50 pb-3 last:border-0 last:pb-0">
                    <div className="rounded-full bg-primary/5 p-1.5 text-primary">
                      <CheckCircle className="h-3 w-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{a.action}</p>
                      <p className="text-xs text-muted-foreground">{a.subject} - {a.time}</p>
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
                <BookOpen className="h-4 w-4 text-primary" /> Quick Actions
              </CardTitle>
              <CardDescription>Navigate to key sections</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <Link href="/teacher/attendance">
                  <Button variant="outline" className="w-full justify-between h-10">
                    <span className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4" /> Take Attendance</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </Link>
                <Link href="/teacher/grades">
                  <Button variant="outline" className="w-full justify-between h-10">
                    <span className="flex items-center gap-2"><FileText className="h-4 w-4" /> Grade Assignments</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </Link>
                <Link href="/teacher/students">
                  <Button variant="outline" className="w-full justify-between h-10">
                    <span className="flex items-center gap-2"><Users className="h-4 w-4" /> View Students</span>
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
