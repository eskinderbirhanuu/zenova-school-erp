"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useDashboardOverview, useClasses, useAuditLogs } from "@/hooks/queries"
import { BarChart3, Users, GraduationCap, DollarSign, ClipboardList } from "lucide-react"

interface ReportItem {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  value: string | number
  detail: string
  onView: () => void
}

export default function DirectorReports() {
  const router = useRouter()
  const { data: overview, isLoading: overviewLoading } = useDashboardOverview()
  const { data: classes, isLoading: classesLoading } = useClasses()
  const { data: auditData, isLoading: auditLoading } = useAuditLogs({ limit: 1 } as any)

  const loading = overviewLoading || classesLoading || auditLoading

  const data = overview || { totals: { students: 0, teachers: 0, staff: 0 }, finance: { revenue: 0 } }
  const classData = Array.isArray(classes) ? classes : (classes as any)?.items ?? []
  const classCount = classData.length
  const audits = Array.isArray(auditData) ? auditData.length : (auditData as any)?.total ?? 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const reports: ReportItem[] = [
    {
      title: "Academic Performance",
      description: "Student grades and exam results summary",
      icon: BarChart3,
      value: `${data.totals?.students ?? 0} students`,
      detail: `Across ${classCount} classes`,
      onView: () => router.push("/director/students"),
    },
    {
      title: "Staff Utilization",
      description: "Teacher and staff allocation overview",
      icon: Users,
      value: `${(data.totals?.teachers ?? 0) + (data.totals?.staff ?? 0)} total staff`,
      detail: `${data.totals?.teachers ?? 0} teachers, ${data.totals?.staff ?? 0} support staff`,
      onView: () => router.push("/director/teachers"),
    },
    {
      title: "Enrollment Trends",
      description: "Student enrollment numbers over time",
      icon: GraduationCap,
      value: `${data.totals?.students ?? 0} enrolled`,
      detail: `${classCount} active classes`,
      onView: () => router.push("/director/dashboard"),
    },
    {
      title: "Financial Summary",
      description: "Revenue, fees, and payment status",
      icon: DollarSign,
      value: `$${Number(data.finance?.revenue ?? 0).toLocaleString()}`,
      detail: `${audits} financial transactions`,
      onView: () => router.push("/director/finance"),
    },
    {
      title: "Audit Log",
      description: "Recent system activity and changes",
      icon: ClipboardList,
      value: `${audits} events`,
      detail: "System audit trail",
      onView: () => router.push("/director/audit"),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Director Reports</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((r, i) => {
          const Icon = r.icon
          return (
            <Card key={i}>
              <CardHeader className="flex flex-row items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-2"><Icon className="h-5 w-5 text-primary" /></div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{r.title}</CardTitle>
                  <CardDescription>{r.description}</CardDescription>
                  <p className="text-sm font-semibold mt-2">{r.value}</p>
                  <p className="text-xs text-muted-foreground">{r.detail}</p>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" onClick={r.onView}>
                  <BarChart3 className="h-4 w-4 mr-2" /> View
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
