"use client"

import { KPICard } from "@/components/ui/kpi-card"
import { SectionHeader } from "@/components/ui/section-header"
import { PageHeader } from "@/components/ui/page-header"
import { useStaff, useContracts, useAttendance } from "@/hooks/queries"
import { Users, FileText, ClipboardCheck, DollarSign, BarChart3, UserPlus, Calendar, Award, Clock } from "lucide-react"

import DashboardShell from "@/components/dashboard/dashboard-shell"
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/3d/micro-animations"
import BarChartCard from "@/components/dashboard/bar-chart-card"
import FeedCard from "@/components/dashboard/feed-card"
import PlaceholderCard from "@/components/dashboard/placeholder-card"
import QuickActionsWidget from "@/components/dashboard/widgets/quick-actions-widget"
import ChartsGrid from "@/components/dashboard/charts-grid"

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
  const { data: staff, isLoading: staffLoading } = useStaff({ limit: 200 } as any)
  const { data: contracts, isLoading: contractsLoading } = useContracts({ limit: 200 } as any)
  const today = new Date().toISOString().slice(0, 10)
  const { data: attendanceData, isLoading: attendanceLoading } = useAttendance({ date: today } as any)

  const loading = staffLoading || contractsLoading || attendanceLoading

  const staffList = staff || []
  const contractsList = contracts || []
  const attendanceRecords = attendanceData || []

  const employees = staffList.length
  const activeContracts = contractsList.filter((c: any) => c.status === "active").length
  const attendance = attendanceRecords.length
  const payroll = `${activeContracts} active`

  return (
    <DashboardShell
      isLoading={loading}
      header={
        <FadeInUp>
          <PageHeader title="People Hub" description="Workforce management, contracts, and attendance overview." />
        </FadeInUp>
      }
      widgets={[
        <StaggerContainer key="kpi">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StaggerItem><KPICard title="Employees" value={employees} icon={Users} trend={{ value: "+5", positive: true }} /></StaggerItem>
            <StaggerItem><KPICard title="Active Contracts" value={activeContracts} icon={FileText} trend={{ value: "+2", positive: true }} /></StaggerItem>
            <StaggerItem><KPICard title="Today's Attendance" value={attendance} icon={ClipboardCheck} trend={{ value: "96%", positive: true }} accentColor="bg-emerald-500" /></StaggerItem>
            <StaggerItem><KPICard title="Payroll Status" value={payroll} icon={DollarSign} trend={{ value: "On track", positive: true }} /></StaggerItem>
          </div>
        </StaggerContainer>,
        <FadeInUp delay={0.2} key="section"><SectionHeader title="Workforce Analytics" description="Headcount and attendance insights" /></FadeInUp>,
        <ChartsGrid key="charts">
          <BarChartCard title="Headcount by Department" description="Staff distribution across departments" data={deptHeadcount} xKey="dept" dataKey="count" name="Staff" delay={0.3} icon={BarChart3} />
          <FeedCard
            title="Recent HR Activity"
            description="Latest workforce events"
            items={recentHR.map((a) => ({
              label: a.action,
              detail: `${a.dept} — ${a.time}`,
              icon: Users,
              badge: {
                text: a.badge === "success" ? "Success" : a.badge === "warning" ? "Pending" : a.badge === "purple" ? "Update" : "Info",
                variant: a.badge,
              },
            }))}
            icon={Clock}
            delay={0.4}
          />
        </ChartsGrid>,
        <ChartsGrid key="more">
          <PlaceholderCard title="Attendance Overview" description="This month&apos;s attendance statistics" icon={BarChart3} />
          <QuickActionsWidget
            widgetId="hr-quick-actions"
            title="Quick Actions"
            description="Common HR tasks"
            icon={Award}
            links={[
              { href: "/hr/employees", label: "Add Employee", icon: UserPlus },
              { href: "/hr/attendance", label: "Mark Attendance", icon: Calendar },
              { href: "/hr/payroll", label: "Process Payroll", icon: DollarSign },
            ]}
          />
        </ChartsGrid>,
      ]}
    />
  )
}
