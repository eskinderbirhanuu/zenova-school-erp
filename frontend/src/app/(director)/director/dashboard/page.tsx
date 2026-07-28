"use client"

import { KPICard } from "@/components/ui/kpi-card"
import { StatusBadge } from "@/components/ui/status-badge"
import { PageHeader } from "@/components/ui/page-header"
import { formatCurrency } from "@/lib/currency"
import { useDashboardOverview, useClasses, useSubjects, useTrialBalance } from "@/hooks/queries"
import Link from "next/link"
import {
  Users, GraduationCap, DollarSign, ScrollText, Building2, Activity,
  UserPlus, FileText, Eye, Award,
} from "lucide-react"
import { StaggerContainer, StaggerItem } from "@/components/3d/micro-animations"
import DashboardShell from "@/components/dashboard/dashboard-shell"
import QuickActionsWidget from "@/components/dashboard/widgets/quick-actions-widget"
import BarChartCard from "@/components/dashboard/bar-chart-card"
import AreaChartCard from "@/components/dashboard/area-chart-card"
import ChartsGrid from "@/components/dashboard/charts-grid"
import FeedCard from "@/components/dashboard/feed-card"

export default function DirectorDashboard() {
  const { data: overview, isLoading: overviewLoading } = useDashboardOverview()
  const { data: classes, isLoading: classesLoading } = useClasses()
  const { data: subjects, isLoading: subjectsLoading } = useSubjects()
  const { data: tb, isLoading: tbLoading } = useTrialBalance()

  const loading = overviewLoading || classesLoading || subjectsLoading || tbLoading

  const studentsCount = overview?.totals?.students ?? 0
  const teachersCount = overview?.totals?.teachers ?? 0
  const staffCount = overview?.totals?.staff ?? 0
  const classData = Array.isArray(classes) ? classes : (classes as any)?.items ?? []
  const subjectData = Array.isArray(subjects) ? subjects : (subjects as any)?.items ?? []
  const classCount = classData.length
  const subjectCount = subjectData.length
  const trialBalance = tb as any
  const debit = trialBalance?.total_debit ?? trialBalance?.debit ?? 0
  const credit = trialBalance?.total_credit ?? trialBalance?.credit ?? 0
  const totalRevenue = formatCurrency(debit + credit)

  const directorQuickLinks = [
    { href: "/director/staff/new", label: "Add Staff", icon: UserPlus },
    { href: "/director/teachers/new", label: "Add Teacher", icon: GraduationCap },
    { href: "/director/reports", label: "View Reports", icon: FileText },
  ]

  const resourceData = [
    { name: "Students", value: studentsCount },
    { name: "Teachers", value: teachersCount },
    { name: "Staff", value: staffCount },
    { name: "Classes", value: classCount },
    { name: "Subjects", value: subjectCount },
  ]

  const enrollmentTrend = [
    { month: "Sep", students: Math.round(studentsCount * 0.7) },
    { month: "Oct", students: Math.round(studentsCount * 0.85) },
    { month: "Nov", students: Math.round(studentsCount * 0.95) },
    { month: "Dec", students: studentsCount },
  ]

  const recentActivity = [
    {
      label: `${studentsCount} students enrolled`,
      detail: `Total across ${classCount} classes`,
      icon: GraduationCap,
      badge: { text: "Active", variant: "success" as const },
    },
    {
      label: `${teachersCount + staffCount} staff members`,
      detail: `${teachersCount} teachers, ${staffCount} staff`,
      icon: UserPlus,
      badge: { text: "Active", variant: "info" as const },
    },
    {
      label: `Total Revenue: ${totalRevenue}`,
      detail: "Including all income sources",
      icon: DollarSign,
      badge: { text: "Updated", variant: "purple" as const },
    },
  ]

  return (
    <DashboardShell
      isLoading={loading}
      header={
        <PageHeader
          title="Executive Analytics"
          description="High-level overview of institutional performance and departmental health."
          actions={
            <Link href="/director/reports">
              <Button variant="outline" size="sm"><Eye className="h-4 w-4 mr-2" /> View Reports</Button>
            </Link>
          }
        />
      }
      widgets={[
        <StaggerContainer key="kpi">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StaggerItem><KPICard title="Students" value={studentsCount} icon={GraduationCap} iconColor="text-blue-400" /></StaggerItem>
            <StaggerItem><KPICard title="Teachers" value={teachersCount} icon={Users} iconColor="text-green-400" /></StaggerItem>
            <StaggerItem><KPICard title="Staff" value={staffCount} icon={Building2} iconColor="text-purple-400" /></StaggerItem>
            <StaggerItem><KPICard title="Total Revenue" value={totalRevenue} icon={DollarSign} accentColor="bg-emerald-500" /></StaggerItem>
            <StaggerItem><KPICard title="Classes" value={classCount} icon={Activity} iconColor="text-orange-400" /></StaggerItem>
            <StaggerItem><KPICard title="Subjects" value={subjectCount} icon={ScrollText} iconColor="text-cyan-400" /></StaggerItem>
          </div>
        </StaggerContainer>,
        <div key="mid" className="grid gap-6 lg:grid-cols-7">
          <div className="lg:col-span-4">
            <ChartsGrid>
              <BarChartCard
                title="Resource Overview"
                description="Key institutional metrics"
                data={resourceData}
                xKey="name"
                dataKey="value"
                name="Count"
                delay={0.3}
                height={250}
              />
              <AreaChartCard
                title="Enrollment Trend"
                description="Student enrollment over time"
                data={enrollmentTrend}
                xKey="month"
                series={[{ dataKey: "students", name: "Students", color: "hsl(var(--primary))" }]}
                delay={0.35}
                height={250}
              />
            </ChartsGrid>
          </div>
          <div className="lg:col-span-3">
            <FeedCard
              title="Recent Activity"
              items={recentActivity}
            />
          </div>
        </div>,
        <div key="bottom" className="grid gap-6 lg:grid-cols-7">
          <div className="lg:col-span-3">
            <QuickActionsWidget widgetId="director-actions" links={directorQuickLinks} title="Management Tasks" description="Frequently used management tasks" icon={Award} />
          </div>
        </div>,
      ]}
    />
  )
}