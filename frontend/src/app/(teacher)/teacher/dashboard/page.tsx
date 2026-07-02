"use client"

import { useEffect, useState, useMemo } from "react"
import { KPICard } from "@/components/ui/kpi-card"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { SectionHeader } from "@/components/ui/section-header"
import { PageHeader } from "@/components/ui/page-header"
import { academicService } from "@/services/api"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import {
  BookOpen, LayoutGrid, CalendarCheck, Clock, Loader2,
  BarChart3, ClipboardCheck, Users, FileText, MapPin, GraduationCap,
  AlertCircle, CheckCircle2, Circle
} from "lucide-react"
import { AnimatedBackground } from "@/components/3d/animated-background"
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/3d/micro-animations"
import { cn } from "@/lib/utils"

const classDistribution = [
  { day: "Mon", classes: 5 },
  { day: "Tue", classes: 4 },
  { day: "Wed", classes: 6 },
  { day: "Thu", classes: 4 },
  { day: "Fri", classes: 5 },
]

const timetable = [
  { time: "8:00", hour: 8, subject: "Mathematics", grade: "10A", room: "R-201" },
  { time: "9:00", hour: 9, subject: "Mathematics", grade: "9B", room: "R-201" },
  { time: "10:30", hour: 10.5, subject: "Calculus", grade: "11A", room: "R-305" },
  { time: "12:00", hour: 12, subject: "Statistics", grade: "12B", room: "R-102" },
]

const ungradedSubmissions = [
  { subject: "Grade 10A Math", submissions: 24, dueDate: "Today" },
  { subject: "Grade 11B Calculus", submissions: 18, dueDate: "Tomorrow" },
  { subject: "Grade 9C Algebra", submissions: 31, dueDate: "Overdue" },
]

type SlotStatus = "past" | "now" | "future"

function getSlotStatus(hour: number): SlotStatus {
  const now = new Date()
  const currentHour = now.getHours() + now.getMinutes() / 60
  const nextSlot = timetable.find((s) => s.hour > currentHour)
  const currentSlot = timetable.find((s) => {
    const next = timetable[timetable.indexOf(s) + 1]
    const endHour = next ? next.hour : s.hour + 1
    return currentHour >= s.hour && currentHour < endHour
  })

  if (currentSlot && currentSlot.hour === hour) return "now"
  if (nextSlot && hour === nextSlot.hour) return "future"
  if (hour < currentHour) return "past"
  return "future"
}

function getCurrentClass() {
  const now = new Date()
  const currentHour = now.getHours() + now.getMinutes() / 60
  const currentSlot = timetable.find((s) => {
    const next = timetable[timetable.indexOf(s) + 1]
    const endHour = next ? next.hour : s.hour + 1
    return currentHour >= s.hour && currentHour < endHour
  })
  if (currentSlot) return { ...currentSlot, status: "now" as const }

  const nextSlot = timetable.find((s) => s.hour > currentHour)
  if (nextSlot) return { ...nextSlot, status: "next" as const }

  return null
}

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

  const currentClass = useMemo(() => getCurrentClass(), [])
  const totalUngraded = ungradedSubmissions.reduce((s, u) => s + u.submissions, 0)

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

      {/* Now Teaching Hero */}
      <FadeInUp delay={0.1}>
        <Card shadow="colored" className="relative overflow-hidden border-primary/20">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
          <CardContent className="relative p-6">
            {currentClass ? (
              currentClass.status === "now" ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 text-primary shrink-0">
                    <GraduationCap className="h-7 w-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wider text-primary mb-1">Now Teaching</p>
                    <h2 className="text-2xl font-bold tracking-tight">{currentClass.subject}</h2>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Grade {currentClass.grade}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {currentClass.room}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {currentClass.time}</span>
                    </div>
                  </div>
                  <StatusBadge status="In Progress" variant="success" size="md" />
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-amber-500/10 text-amber-600 shrink-0">
                    <Clock className="h-7 w-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wider text-amber-600 mb-1">No class right now</p>
                    <h2 className="text-xl font-semibold tracking-tight">Next: {currentClass.subject} — Grade {currentClass.grade}</h2>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {currentClass.room}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {currentClass.time}</span>
                    </div>
                  </div>
                  <StatusBadge status="Upcoming" variant="warning" size="md" />
                </div>
              )
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-muted text-muted-foreground shrink-0">
                  <Clock className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">No more classes today</p>
                  <h2 className="text-xl font-semibold">Done for the day</h2>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeInUp>

      <StaggerContainer>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StaggerItem>
            <KPICard
              title="Classes"
              value={classes}
              icon={BookOpen}
              trend={{ value: "+2", positive: true }}
              sparklineData={[3, 4, 3, 5, 4, 6, 5]}
            />
          </StaggerItem>
          <StaggerItem>
            <KPICard
              title="Sections"
              value={sections}
              icon={LayoutGrid}
              trend={{ value: "+1", positive: true }}
              sparklineData={[2, 2, 3, 3, 4, 3, 4]}
            />
          </StaggerItem>
          <StaggerItem>
            <KPICard
              title="Upcoming Exams"
              value={exams}
              icon={CalendarCheck}
              trend={{ value: "+3", positive: false }}
              accentColor="bg-amber-500"
              sparklineData={[1, 2, 2, 3, 3, 5, 4]}
            />
          </StaggerItem>
          <StaggerItem>
            <KPICard
              title="Today's Schedule"
              value={schedule}
              icon={Clock}
              trend={{ value: "0", positive: true }}
              sparklineData={[4, 4, 5, 4, 4, 4, 4]}
            />
          </StaggerItem>
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
                <FileText className="h-4 w-4 text-primary" /> Ungraded Submissions
              </CardTitle>
              <CardDescription>
                {totalUngraded} submissions pending across {ungradedSubmissions.length} classes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ungradedSubmissions.map((item, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-3 transition-colors",
                      item.dueDate === "Overdue"
                        ? "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30"
                        : "border-border/50"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center h-10 w-10 rounded-xl shrink-0",
                        item.dueDate === "Overdue"
                          ? "bg-red-500/10 text-red-600"
                          : item.dueDate === "Today"
                            ? "bg-amber-500/10 text-amber-600"
                            : "bg-blue-500/10 text-blue-600"
                      )}
                    >
                      <ClipboardCheck className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.submissions} submission{item.submissions !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <StatusBadge
                      status={item.dueDate}
                      variant={
                        item.dueDate === "Overdue"
                          ? "destructive"
                          : item.dueDate === "Today"
                            ? "warning"
                            : "info"
                      }
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </FadeInUp>
      </div>

      <FadeInUp delay={0.5}>
        <SectionHeader title="Today's Timeline" description="Your class schedule for today" />
      </FadeInUp>

      <FadeInUp delay={0.6}>
        <Card shadow="glass">
          <CardContent className="p-6">
            <div className="relative ml-4">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

              <div className="space-y-0">
                {timetable.map((slot, i) => {
                  const status = getSlotStatus(slot.hour)
                  return (
                    <div key={i} className="relative flex items-start gap-4 pb-6 last:pb-0">
                      <div
                        className={cn(
                          "relative z-10 mt-1 h-4 w-4 rounded-full border-2 shrink-0",
                          status === "now"
                            ? "border-primary bg-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.2)]"
                            : status === "past"
                              ? "border-muted-foreground/30 bg-muted"
                              : "border-primary/40 bg-background"
                        )}
                      >
                        {status === "now" && (
                          <span className="absolute inset-0.5 rounded-full bg-primary animate-pulse" />
                        )}
                      </div>

                      <div
                        className={cn(
                          "flex-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 rounded-xl border p-3 transition-all",
                          status === "now"
                            ? "border-primary/30 bg-primary/5 shadow-sm"
                            : status === "past"
                              ? "border-border/30 bg-muted/30 opacity-50"
                              : "border-border/50 bg-card"
                        )}
                      >
                        <span className="text-sm font-mono font-semibold text-muted-foreground w-14 shrink-0">
                          {slot.time}
                        </span>
                        <span
                          className={cn(
                            "text-sm font-medium flex-1 min-w-0",
                            status === "now" ? "text-foreground" : "text-foreground/70"
                          )}
                        >
                          {slot.subject}
                        </span>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <GraduationCap className="h-3 w-3" /> {slot.grade}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {slot.room}
                          </span>
                        </div>
                        {status === "now" && (
                          <StatusBadge status="Live" variant="success" />
                        )}
                        {status === "past" && (
                          <StatusBadge status="Done" variant="default" />
                        )}
                        {status === "future" && i === timetable.findIndex((s) => getSlotStatus(s.hour) === "future") && (
                          <StatusBadge status="Next" variant="info" />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeInUp>
    </div>
  )
}
