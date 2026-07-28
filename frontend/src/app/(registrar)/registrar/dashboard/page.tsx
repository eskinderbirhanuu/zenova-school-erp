"use client"

import { KPICard } from "@/components/ui/kpi-card"
import { Button } from "@/components/ui/button"
import { SectionHeader } from "@/components/ui/section-header"
import { PageHeader } from "@/components/ui/page-header"
import { useStudents, useParents } from "@/hooks/queries"
import Link from "next/link"
import {
  Users, UserPlus, Sparkles, QrCode,
  BarChart3, FileText, CheckCircle, Printer,
  ClipboardList, Clock, ShieldAlert, TrendingUp
} from "lucide-react"

import DashboardShell from "@/components/dashboard/dashboard-shell"
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/3d/micro-animations"
import BarChartCard from "@/components/dashboard/bar-chart-card"
import FeedCard from "@/components/dashboard/feed-card"
import ChartsGrid from "@/components/dashboard/charts-grid"
import FunnelCard from "@/components/dashboard/funnel-card"

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

const taskItems = pendingTasks.map((t) => ({
  label: t.task,
  detail: String(t.count) + " items",
  icon: t.icon,
  badge: { text: String(t.count), variant: t.urgency },
}))

const funnelStages = funnelData.map((f) => ({
  name: f.stage,
  count: f.count,
  color: f.color,
}))

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


export default function RegistrarDashboard() {
  const { data: studentsData, isLoading: loadingStudents } = useStudents({ limit: 200 })
  const { data: parentsData, isLoading: loadingParents } = useParents({ limit: 200 })
  const loading = loadingStudents || loadingParents

  const students = studentsData?.length ?? "-"
  const parents = parentsData?.length ?? "-"

  return (
    <DashboardShell
      isLoading={loading}
      header={
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
      }
      widgets={[
        <StaggerContainer key="kpi">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StaggerItem><KPICard title="Students" value={students} icon={Users} trend={{ value: "+15", positive: true }} sparklineData={[120, 145, 162, 158, 175, 190, 210, 225]} /></StaggerItem>
            <StaggerItem><KPICard title="Parents" value={parents} icon={UserPlus} trend={{ value: "+8", positive: true }} sparklineData={[80, 92, 98, 105, 110, 115, 120, 125]} /></StaggerItem>
            <StaggerItem><KPICard title="Current Term" value={getSeason()} icon={Sparkles} trend={{ value: "Active", positive: true }} /></StaggerItem>
            <StaggerItem><KPICard title="ID Cards" value="Active" icon={QrCode} trend={{ value: "Ready", positive: true }} sparklineData={[30, 28, 35, 42, 38, 45, 40, 48]} /></StaggerItem>
          </div>
        </StaggerContainer>,
        <FadeInUp delay={0.2} key="enrollment-section"><SectionHeader title="Enrollment Analytics" description="Student enrollment and registration trends" /></FadeInUp>,
        <ChartsGrid key="enrollment">
          <BarChartCard title="Enrollment Trend" description="New student registrations over the year" data={enrollmentData} xKey="month" dataKey="students" name="Students" delay={0.3} icon={BarChart3} />
          <FeedCard
            title="Recent Activity"
            description="Latest registration events"
            items={recentActivity.map((a) => ({
              label: a.action,
              detail: `${a.user} — ${a.time}`,
              icon: FileText,
              badge: { text: a.badge === "success" ? "Success" : a.badge === "purple" ? "Update" : "Info", variant: a.badge },
            }))}
            icon={CheckCircle}
            delay={0.4}
          />
        </ChartsGrid>,
        <FadeInUp delay={0.5} key="admissions-section"><SectionHeader title="Admissions Pipeline" description="Enrollment funnel and grade distribution" /></FadeInUp>,
        <ChartsGrid key="admissions">
          <BarChartCard title="Students by Grade Level" description="Current enrollment across all grades" data={gradeLevelData} xKey="grade" dataKey="count" name="Students" color="hsl(var(--primary))" />
          <FeedCard title="Pending Tasks" description="Items requiring your attention" items={taskItems} icon={Clock} />
        </ChartsGrid>,
        <FunnelCard title="Admissions Pipeline" description="Enrollment funnel from inquiry to enrollment" stages={funnelStages} icon={BarChart3} showConversion />,
      ]}
    />
  )
}
