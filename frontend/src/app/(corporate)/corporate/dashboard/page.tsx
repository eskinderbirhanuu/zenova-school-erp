"use client"

import { KPICard } from "@/components/ui/kpi-card"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { useCorporateDashboard } from "@/hooks/queries"
import { Users, Building2, UserCheck, Loader2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { DynamicAnimatedBackground } from "@/components/3d/dynamic"
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/3d/micro-animations"

export default function CorporateDashboard() {
  const { data, isLoading } = useCorporateDashboard()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
<DynamicAnimatedBackground />
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const chartData = (data as any)?.employees_by_department || []

  return (
    <div className="space-y-8 animate-fade-in">
      <DynamicAnimatedBackground />
      <FadeInUp>
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
      </FadeInUp>

      <StaggerContainer>
        <div className="grid gap-4 md:grid-cols-3">
          <StaggerItem>
            <KPICard title="Total Employees" value={String(data?.total_employees ?? "—")} icon={Users} />
          </StaggerItem>
          <StaggerItem>
            <KPICard title="Active Employees" value={String(data?.active_employees ?? "—")} icon={UserCheck} accentColor="bg-emerald-500" />
          </StaggerItem>
          <StaggerItem>
            <KPICard title="Departments" value={String(data?.department_count ?? "—")} icon={Building2} />
          </StaggerItem>
        </div>
      </StaggerContainer>

      <FadeInUp delay={0.2}>
        <Card shadow="colored">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-primary" /> Employees by Department
            </CardTitle>
            <CardDescription>Distribution across departments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                    <XAxis dataKey="department" className="text-xs" tick={{ fontSize: 12 }} />
                    <YAxis className="text-xs" tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Employees" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  No department data yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </FadeInUp>
    </div>
  )
}
