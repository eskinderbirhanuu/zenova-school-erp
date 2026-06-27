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
  ClipboardCheck, Award, Calendar, Wallet, Loader2, ArrowRight,
  BarChart3, BookOpen, Clock, CheckCircle, AlertTriangle
} from "lucide-react"

import { AnimatedBackground } from "@/components/3d/animated-background"
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/3d/micro-animations"

const subjectGrades = [
  { subject: "Math", grade: 85 },
  { subject: "English", grade: 92 },
  { subject: "Science", grade: 78 },
  { subject: "History", grade: 88 },
  { subject: "Art", grade: 95 },
]

const recentUpdates = [
  { action: "Assignment due", course: "Math", time: "Tomorrow", badge: "warning" as const },
  { action: "Exam scheduled", course: "Science", time: "Friday", badge: "info" as const },
  { action: "Grade posted", course: "English", time: "2 days ago", badge: "success" as const },
  { action: "Library due", course: "Book", time: "3 days ago", badge: "warning" as const },
  { action: "New announcement", course: "General", time: "1 week ago", badge: "purple" as const },
]

export default function StudentDashboard() {
  const [resultsCount, setResultsCount] = useState<string>("—")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    academicService.examResults.list({ limit: 1 }).then((res) => {
      const count = res.data?.total ?? res.data?.length
      setResultsCount(count != null ? String(count) : "—")
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
        title="Student Portal"
        description="Your academic progress and schedule at a glance."
      />
      </FadeInUp>

      <StaggerContainer>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StaggerItem><KPICard title="Attendance Rate" value="94%" icon={ClipboardCheck} trend={{ value: "+1%", positive: true }} accentColor="bg-emerald-500" /></StaggerItem>
          <StaggerItem><KPICard title="My Results" value={resultsCount} icon={Award} trend={{ value: "A-", positive: true }} /></StaggerItem>
          <StaggerItem><KPICard title="Timetable" value="6 periods" icon={Calendar} trend={{ value: "Active", positive: true }} /></StaggerItem>
          <StaggerItem><KPICard title="Wallet Balance" value="$0.00" icon={Wallet} trend={{ value: "-", positive: true }} /></StaggerItem>
        </div>
      </StaggerContainer>

      <FadeInUp delay={0.2}>
        <SectionHeader title="Academic Overview" description="Your subject grades and progress" />
      </FadeInUp>

      <div className="grid gap-6 lg:grid-cols-7">
        <FadeInUp delay={0.3} className="lg:col-span-4">
          <Card shadow="colored">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" /> Subject Grades
            </CardTitle>
            <CardDescription>Current term performance by subject</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={subjectGrades}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="grade" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Grade" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
          </Card>
        </FadeInUp>

        <FadeInUp delay={0.4} className="lg:col-span-3">
          <Card shadow="default">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-primary" /> Recent Updates
            </CardTitle>
            <CardDescription>Latest academic notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentUpdates.map((a, i) => (
                <div key={i} className="flex items-start gap-3 border-b border-border/50 pb-3 last:border-0 last:pb-0">
                  <div className="rounded-full bg-primary/5 p-1.5 text-primary">
                    <BookOpen className="h-3 w-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{a.action}</p>
                    <p className="text-xs text-muted-foreground">{a.course} - {a.time}</p>
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
                <Calendar className="h-4 w-4 text-primary" /> Today&apos;s Schedule
            </CardTitle>
            <CardDescription>Your class schedule for today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
              Schedule integration coming soon
            </div>
          </CardContent>
          </Card>
        </FadeInUp>

        <FadeInUp delay={0.6} className="lg:col-span-3">
          <Card shadow="default">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle className="h-4 w-4 text-primary" /> Quick Actions
            </CardTitle>
            <CardDescription>Common student tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <Link href="/student/results">
                <Button variant="outline" className="w-full justify-between h-10">
                  <span className="flex items-center gap-2"><Award className="h-4 w-4" /> View Results</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </Link>
              <Link href="/student/timetable">
                <Button variant="outline" className="w-full justify-between h-10">
                  <span className="flex items-center gap-2"><Calendar className="h-4 w-4" /> My Timetable</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </Link>
              <Link href="/student/assignments">
                <Button variant="outline" className="w-full justify-between h-10">
                  <span className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> Check Assignments</span>
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
