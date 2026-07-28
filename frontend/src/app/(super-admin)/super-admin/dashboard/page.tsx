"use client"

import { KPICard } from "@/components/ui/kpi-card"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { formatCurrency } from "@/lib/currency"
import { useState } from "react"
import { usePlatformAdminDashboard } from "@/hooks/queries"
import {
  Building2, Users, Key, Activity, Cloud, DollarSign,
  Plus, Cpu, Zap, HardDrive, ArrowUp
} from "lucide-react"
import Link from "next/link"

import DashboardShell from "@/components/dashboard/dashboard-shell"
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/3d/micro-animations"
import BarChartCard from "@/components/dashboard/bar-chart-card"
import AreaChartCard from "@/components/dashboard/area-chart-card"
import ChartsGrid from "@/components/dashboard/charts-grid"
import MetricBadgesRow from "@/components/dashboard/metric-badges-row"
import HealthRadarCard from "@/components/dashboard/health-radar-card"
import AlertCenterCard from "@/components/dashboard/alert-center-card"
import ActivityTableCard from "@/components/dashboard/activity-table-card"

const monthlySchools = [
  { month: "Jan", schools: 4 },
  { month: "Feb", schools: 7 },
  { month: "Mar", schools: 5 },
  { month: "Apr", schools: 12 },
  { month: "May", schools: 9 },
  { month: "Jun", schools: 15 },
  { month: "Jul", schools: 11 },
  { month: "Aug", schools: 8 },
  { month: "Sep", schools: 14 },
  { month: "Oct", schools: 18 },
  { month: "Nov", schools: 6 },
  { month: "Dec", schools: 10 },
]

const revenueTrendMock = [
  { month: "Jan", revenue: 12000 },
  { month: "Feb", revenue: 18000 },
  { month: "Mar", revenue: 15000 },
  { month: "Apr", revenue: 22000 },
  { month: "May", revenue: 19000 },
  { month: "Jun", revenue: 28000 },
  { month: "Jul", revenue: 24000 },
  { month: "Aug", revenue: 21000 },
  { month: "Sep", revenue: 30000 },
  { month: "Oct", revenue: 35000 },
  { month: "Nov", revenue: 26000 },
  { month: "Dec", revenue: 42000 },
]

const systemServices = [
  { service: "API Server", status: "operational" as const, latency: "45ms" },
  { service: "Database", status: "operational" as const, latency: "12ms" },
  { service: "Email Service", status: "degraded" as const, latency: "890ms" },
  { service: "Storage", status: "operational" as const, latency: "23ms" },
  { service: "Auth Service", status: "operational" as const, latency: "67ms" },
  { service: "Backup", status: "operational" as const, latency: "—" },
]

const serviceAlerts = [
  { message: "3 schools approaching license renewal", severity: "warning" as const, time: "2h ago" },
  { message: "Database backup completed", severity: "success" as const, time: "4h ago" },
  { message: "Email queue backing up — 1,200 pending", severity: "destructive" as const, time: "30m ago" },
  { message: "New school registration pending approval", severity: "info" as const, time: "1h ago" },
]

const metricBadges = [
  { label: "Active Users Today", value: "1,847", icon: Cpu },
  { label: "API Calls Today", value: "284K", icon: Zap },
  { label: "Storage Used", value: "2.4 GB", icon: HardDrive },
  { label: "Uptime", value: "99.98%", icon: ArrowUp, color: "bg-emerald-500/10" },
]

const activityColumns = [
  { key: "action", label: "Action" },
  { key: "table_name", label: "Table" },
  { key: "created_at", label: "Time" },
  { key: "user_id", label: "User" },
]

const formatNumber = (n: number) =>
  new Intl.NumberFormat("en-US").format(n)

export default function SuperAdminDashboard() {
  const { data: dashboard, isLoading } = usePlatformAdminDashboard()
  const [activity] = useState<any[]>([])

  const stats = {
    schools: (dashboard as any)?.school_rankings?.length ? formatNumber((dashboard as any).school_rankings.length) : "—",
    licenses: "—",
    revenue: (dashboard as any)?.total_revenue ? formatCurrency((dashboard as any).total_revenue) : "—",
    uptime: "—",
    activeUsers: "—",
    alerts: "—",
    apiLatency: "—",
    dbSize: "—",
  }

  return (
    <DashboardShell
      isLoading={isLoading}
      header={
        <FadeInUp>
          <PageHeader
            title="Mission Control"
            description="Platform-wide overview, system health, and key performance indicators at a glance."
            actions={
              <>
                <Link href="/super-admin/schools/new">
                  <Button variant="outline"><Plus className="h-4 w-4 mr-2" /> Add School</Button>
                </Link>
                <Link href="/super-admin/licenses/new">
                  <Button><Key className="h-4 w-4 mr-2" /> New License</Button>
                </Link>
              </>
            }
          />
        </FadeInUp>
      }
      widgets={[
        <StaggerContainer key="kpi">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StaggerItem><KPICard title="Total Schools" value={stats.schools} icon={Building2} trend={{ value: "+6 this month", positive: true }} sparklineData={[4, 7, 5, 12, 9, 15, 11, 8, 14, 18, 6, 10]} /></StaggerItem>
            <StaggerItem><KPICard title="Active Schools" value={42} icon={Activity} trend={{ value: "+2.4%", positive: true }} sparklineData={[30, 32, 33, 35, 36, 38, 39, 40, 41, 42]} /></StaggerItem>
            <StaggerItem><KPICard title="Total Licenses" value={stats.licenses} icon={Key} trend={{ value: "+12", positive: true }} sparklineData={[50, 55, 60, 64, 68, 72, 78, 82, 86, 90]} /></StaggerItem>
            <StaggerItem><KPICard title="Total Users" value={stats.activeUsers} icon={Users} trend={{ value: "+342", positive: true }} sparklineData={[800, 920, 1050, 1100, 1200, 1340, 1420, 1500, 1620, 1780]} /></StaggerItem>
            <StaggerItem><KPICard title="System Health" value={stats.uptime} icon={Cloud} trend={{ value: "+0.2%", positive: true }} sparklineData={[99.1, 99.3, 99.2, 99.5, 99.4, 99.6, 99.7, 99.8, 99.8, 99.9]} /></StaggerItem>
            <StaggerItem><KPICard title="Revenue MTD" value={stats.revenue} icon={DollarSign} trend={{ value: "+18%", positive: true }} accentColor="bg-emerald-500" sparklineData={[12, 18, 15, 22, 19, 28, 24, 21, 30, 35, 26, 42]} /></StaggerItem>
          </div>
        </StaggerContainer>,
        <MetricBadgesRow key="badges" metrics={metricBadges} />,
        <ChartsGrid key="charts">
          <BarChartCard
            title="School Growth"
            description="Registered schools per month"
            data={monthlySchools}
            xKey="month"
            dataKey="schools"
            name="Schools"
            icon={Building2}
            delay={0.2}
            height={300}
          />
          <AreaChartCard
            title="Revenue Trend"
            description="Monthly revenue over the year"
            data={revenueTrendMock}
            xKey="month"
            series={[{ dataKey: "revenue", name: "Revenue", color: "hsl(var(--primary))" }]}
            delay={0.3}
            height={300}
          />
        </ChartsGrid>,
        <div className="grid gap-6 lg:grid-cols-7" key="health">
          <div className="lg:col-span-4">
            <HealthRadarCard
              title="System Health"
              services={systemServices.map(s => ({ name: s.service, status: s.status, latency: s.latency }))}
            />
          </div>
          <div className="lg:col-span-3">
            <AlertCenterCard
              title="Alert Center"
              alerts={serviceAlerts}
            />
          </div>
        </div>,
        <ActivityTableCard
          key="activity"
          title="Recent Activity"
          description="Recent platform events"
          columns={activityColumns}
          data={activity}
        />,
      ]}
    />
  )
}