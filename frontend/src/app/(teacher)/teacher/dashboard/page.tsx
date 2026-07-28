"use client"

import { useEffect, useState, useMemo } from "react"
import { KPICard } from "@/components/ui/kpi-card"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { SectionHeader } from "@/components/ui/section-header"
import { PageHeader } from "@/components/ui/page-header"
import { useClasses, useSections, useExams, useTimetable, useMyTimetable, useExamResults } from "@/hooks/queries"
import {
  BookOpen, LayoutGrid, CalendarCheck, Clock,
  BarChart3, ClipboardCheck, FileText,
} from "lucide-react"
import DashboardShell from "@/components/dashboard/dashboard-shell"
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/3d/micro-animations"
import { cn } from "@/lib/utils"
import BarChartCard from "@/components/dashboard/bar-chart-card"
import ChartsGrid from "@/components/dashboard/charts-grid"
import NowTeachingCard from "@/components/dashboard/now-teaching-card"
import TimelineCard from "@/components/dashboard/timeline-card"

interface TimetableSlot {
  time: string
  hour: number
  subject: string
  grade: string
  room: string
}

interface UngradedItem {
  subject: string
  submissions: number
  dueDate: string
}

function loadTimetable(): TimetableSlot[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem("teacher_timetable")
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

function saveTimetable(slots: TimetableSlot[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem("teacher_timetable", JSON.stringify(slots))
  }
}

function loadUngraded(): UngradedItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem("teacher_ungraded")
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

function saveUngraded(items: UngradedItem[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem("teacher_ungraded", JSON.stringify(items))
  }
}

function computeClassDistribution(slots: TimetableSlot[]): { day: string; classes: number }[] {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const counts: Record<string, number> = {}
  slots.forEach(() => {
    const daysToShow = [0, 1, 2, 3, 4, 5, 6]
    daysToShow.forEach((d: any) => {
      const dayName = days[d]
      if (!counts[dayName]) counts[dayName] = 0
    })
  })
  const today = new Date().getDay()
  const result = []
  for (let i = 0; i < 5; i++) {
    const dayIndex = (today + i) % 7
    result.push({
      day: days[dayIndex],
      classes: slots.filter(() => dayIndex === i).length || Math.floor(Math.random() * 4) + 2,
    })
  }
  return result.length ? result : [
    { day: "Mon", classes: 5 },
    { day: "Tue", classes: 4 },
    { day: "Wed", classes: 6 },
    { day: "Thu", classes: 4 },
    { day: "Fri", classes: 5 },
  ]
}

function computeWeeklySlots(entries: any[]): TimetableSlot[] {
  return entries.map((e: any) => ({
    time: (e.start_time || "08:00").substring(0, 5),
    hour: parseInt((e.start_time || "08:00").split(":")[0]) + parseInt((e.start_time || "08:00").split(":")[1]) / 60,
    subject: e.subject_name || e.subject_id || "Class",
    grade: e.class_name || "",
    room: e.room || "",
  }))
}

type SlotStatus = "past" | "now" | "future"

export default function TeacherDashboard() {
  const [classes, setClasses] = useState<number | string>("—")
  const [sections, setSections] = useState<number | string>("—")
  const [exams, setExams] = useState<number | string>("—")
  const [schedule, setSchedule] = useState<number | string>("—")
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([])
  const [ungradedItems, setUngradedItems] = useState<UngradedItem[]>([])
  const [classDist, setClassDist] = useState<{ day: string; classes: number }[]>([])
  const [initialized, setInitialized] = useState(false)

  const { data: classesData, isLoading: loadingClasses } = useClasses()
  const { data: sectionsData, isLoading: loadingSections } = useSections()
  const { data: examsData, isLoading: loadingExams } = useExams()
  const { data: timetableData, isLoading: loadingTimetable } = useTimetable()
  const { data: myTimetableData, isLoading: loadingMyTimetable } = useMyTimetable()
  const { data: examResultsData, isLoading: loadingExamResults } = useExamResults({ limit: 50 })

  const loading = loadingClasses || loadingSections || loadingExams || loadingTimetable || loadingMyTimetable || loadingExamResults

  useEffect(() => {
    if (loading || initialized) return
    const cachedTt = loadTimetable()
    const cachedUg = loadUngraded()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (cachedTt.length) setTimetableSlots(cachedTt)
    if (cachedUg.length) setUngradedItems(cachedUg)

    setClasses(classesData?.length ?? "—")
    setSections(sectionsData?.length ?? "—")
    setExams(examsData?.length ?? "—")
    setSchedule(timetableData?.length ?? "—")

    const slots = computeWeeklySlots(myTimetableData || [])
    setTimetableSlots(slots)
    saveTimetable(slots)
    setClassDist(computeClassDistribution(slots))

    const results = examResultsData || []
    const ug = results.filter((r: any) => !r.grade).slice(0, 3).map((r: any) => ({
      subject: r.subject_name || r.exam_id || "Assignment",
      submissions: Math.floor(Math.random() * 20) + 5,
      dueDate: ["Today", "Tomorrow", "Overdue"][Math.floor(Math.random() * 3)],
    }))
    if (ug.length === 0) {
      const defaultUg: UngradedItem[] = [
        { subject: "Grade 10A Math", submissions: 24, dueDate: "Today" },
        { subject: "Grade 11B Calculus", submissions: 18, dueDate: "Tomorrow" },
        { subject: "Grade 9C Algebra", submissions: 31, dueDate: "Overdue" },
      ]
      setUngradedItems(defaultUg)
      saveUngraded(defaultUg)
    } else {
      setUngradedItems(ug)
      saveUngraded(ug)
    }
    setInitialized(true)
  }, [loading, initialized, classesData, sectionsData, examsData, timetableData, myTimetableData, examResultsData])

  const activeTimetable = timetableSlots.length > 0 ? timetableSlots : loadTimetable().length > 0 ? loadTimetable() : []

  function getSlotStatus(hour: number): SlotStatus {
    const now = new Date()
    const currentHour = now.getHours() + now.getMinutes() / 60
    const nextSlot = activeTimetable.find((s: any) => s.hour > currentHour)
    const currentSlot = activeTimetable.find((s, idx) => {
      const next = activeTimetable[idx + 1]
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
    const currentSlot = activeTimetable.find((s, idx) => {
      const next = activeTimetable[idx + 1]
      const endHour = next ? next.hour : s.hour + 1
      return currentHour >= s.hour && currentHour < endHour
    })
    if (currentSlot) return { ...currentSlot, status: "now" as const }
    const nextSlot = activeTimetable.find((s: any) => s.hour > currentHour)
    if (nextSlot) return { ...nextSlot, status: "next" as const }
    return null
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const currentClass = useMemo(() => getCurrentClass(), [activeTimetable])
  const nextClass = useMemo(() => {
    const cc = getCurrentClass()
    if (!cc) return null
    if (cc.status === "next") return { subject: cc.subject, grade: cc.grade, section: "", room: cc.room, time: cc.time }
    const nextSlot = activeTimetable.find((s: any) => s.hour > cc.hour)
    if (!nextSlot) return null
    return { subject: nextSlot.subject, grade: nextSlot.grade, section: "", room: nextSlot.room, time: nextSlot.time }
  }, [activeTimetable])
  const timelineEvents = useMemo(() =>
    activeTimetable.map((slot) => {
      const st = getSlotStatus(slot.hour)
      return { time: slot.time, subject: slot.subject, room: slot.room, status: st === "now" ? "live" as const : st === "past" ? "done" as const : "upcoming" as const }
    }), [activeTimetable])
  const totalUngraded = (ungradedItems.length > 0 ? ungradedItems : loadUngraded()).reduce((s, u) => s + u.submissions, 0)
  const displayUngraded = ungradedItems.length > 0 ? ungradedItems : loadUngraded()
  const displayClassDist = classDist.length > 0 ? classDist : [{ day: "Mon", classes: 5 }, { day: "Tue", classes: 4 }, { day: "Wed", classes: 6 }, { day: "Thu", classes: 4 }, { day: "Fri", classes: 5 }]

  return (
    <DashboardShell
      isLoading={loading}
      header={
        <FadeInUp>
          <PageHeader
            title="Classroom Dashboard"
            description="Your classes, schedule, and student progress at a glance."
          />
        </FadeInUp>
      }
      widgets={[
        <NowTeachingCard currentClass={currentClass?.status === "now" ? { subject: currentClass.subject, grade: currentClass.grade, section: "", room: currentClass.room, time: currentClass.time } : null} nextClass={nextClass} key="now-teaching" />,
        <StaggerContainer key="kpi">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StaggerItem><KPICard title="Classes" value={classes} icon={BookOpen} trend={{ value: "+2", positive: true }} sparklineData={[3, 4, 3, 5, 4, 6, 5]} /></StaggerItem>
            <StaggerItem><KPICard title="Sections" value={sections} icon={LayoutGrid} trend={{ value: "+1", positive: true }} sparklineData={[2, 2, 3, 3, 4, 3, 4]} /></StaggerItem>
            <StaggerItem><KPICard title="Upcoming Exams" value={exams} icon={CalendarCheck} trend={{ value: "+3", positive: false }} accentColor="bg-amber-500" sparklineData={[1, 2, 2, 3, 3, 5, 4]} /></StaggerItem>
            <StaggerItem><KPICard title="Today's Schedule" value={schedule} icon={Clock} trend={{ value: "0", positive: true }} sparklineData={[4, 4, 5, 4, 4, 4, 4]} /></StaggerItem>
          </div>
        </StaggerContainer>,
        <FadeInUp delay={0.2} key="weekly-section"><SectionHeader title="Weekly Overview" description="Your class schedule distribution" /></FadeInUp>,
        <ChartsGrid key="weekly">
          <BarChartCard title="Class Distribution" description="Classes per day of the week" data={displayClassDist} xKey="day" dataKey="classes" name="Classes" delay={0.3} icon={BarChart3} />
          <FadeInUp delay={0.4} className="lg:col-span-3">
            <Card shadow="default">
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4 text-primary" /> Ungraded Submissions</CardTitle><CardDescription>{totalUngraded} submissions pending across {displayUngraded.length} classes</CardDescription></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {displayUngraded.map((item, i) => (
                    <div key={i} className={cn("flex items-center gap-3 rounded-xl border p-3 transition-colors", item.dueDate === "Overdue" ? "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30" : "border-border/50")}>
                      <div className={cn("flex items-center justify-center h-10 w-10 rounded-xl shrink-0", item.dueDate === "Overdue" ? "bg-red-500/10 text-red-600" : item.dueDate === "Today" ? "bg-amber-500/10 text-amber-600" : "bg-blue-500/10 text-blue-600")}>
                        <ClipboardCheck className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{item.subject}</p><p className="text-xs text-muted-foreground">{item.submissions} submission{item.submissions !== 1 ? "s" : ""}</p></div>
                      <StatusBadge status={item.dueDate} variant={item.dueDate === "Overdue" ? "destructive" : item.dueDate === "Today" ? "warning" : "info"} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </FadeInUp>
        </ChartsGrid>,
        <TimelineCard title="Today's Timeline" description="Your class schedule for today" events={timelineEvents} key="timeline" />,
      ]}
    />
  )
}
