"use client"

import { KPICard } from "@/components/ui/kpi-card"
import { PageHeader } from "@/components/ui/page-header"
import { useCorporateDashboard } from "@/hooks/queries"
import { Users, Building2, UserCheck } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import DashboardShell from "@/components/dashboard/dashboard-shell"
import { StaggerContainer, StaggerItem } from "@/components/3d/micro-animations"
import BarChartCard from "@/components/dashboard/bar-chart-card"

export default function CorporateDashboard() {
  const { data, isLoading } = useCorporateDashboard()
  const chartData = (data as any)?.employees_by_department || []

  return (
    <DashboardShell
      isLoading={isLoading}
      header={
        <PageHeader
            title="Corporate Dashboard"
            description="ZENOVA Corporate employee overview"
            actions={
              <>
                <Link href="/corporate/employees/new">
                  <Button variant="outline"><UserCheck className="h-4 w-4 mr-2" /> Add Employee</Button>
                </Link>
                <Link href="/corporate/departments/new">
                  <Button><Building2 className="h-4 w-4 mr-2" /> New Department</Button>
                </Link>
              </>
            }
          />
      }
      widgets={[
        <StaggerContainer key="kpi">
          <div className="grid gap-4 md:grid-cols-3">
            <StaggerItem><KPICard title="Total Employees" value={String(data?.total_employees ?? "—")} icon={Users} /></StaggerItem>
            <StaggerItem><KPICard title="Active Employees" value={String(data?.active_employees ?? "—")} icon={UserCheck} accentColor="bg-emerald-500" /></StaggerItem>
            <StaggerItem><KPICard title="Departments" value={String(data?.department_count ?? "—")} icon={Building2} /></StaggerItem>
          </div>
        </StaggerContainer>,
        <BarChartCard
          key="chart"
          title="Employees by Department"
          description="Distribution across departments"
          data={chartData}
          xKey="department"
          dataKey="count"
          name="Employees"
          icon={Building2}
          height={288}
          emptyMessage="No department data yet"
        />,
      ]}
    />
  )
}
