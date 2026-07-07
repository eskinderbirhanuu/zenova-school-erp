"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { dashboardService, academicService, auditService } from "@/services/api"
import { BarChart3, Users, GraduationCap, DollarSign, ClipboardList } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface ReportItem {
  title: string
  description: string
  icon: React.ElementType
  value: string | number
  detail: string
  onView: () => void
}

export default function DirectorReports() {
  const router = useRouter()
  const [reports, setReports] = useState<ReportItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      dashboardService.overview().then((r) => r.data).catch(() => null),
      academicService.classes.list().then((r) => {
        const items = r.data?.items ?? r.data ?? []
        return Array.isArray(items) ? items.length : 0
      }).catch(() => 0),
      auditService.list({ limit: 1 }).then((r) => r.data?.total ?? 0).catch(() => 0),
    ]).then(([overview, classes, audits]) => {
      const data = overview || { students: 0, teachers: 0, staff: 0, revenue: 0 }
      setReports([
        {
          title: "Academic Performance",
          description: "Student grades and exam results summary",
          icon: BarChart3,
          value: `${data.students ?? 0} students`,
          detail: `Across ${classes} classes`,
          onView: () => router.push("/director/students"),
        },
        {
          title: "Staff Utilization",
          description: "Teacher and staff allocation overview",
          icon: Users,
          value: `${(data.teachers ?? 0) + (data.staff ?? 0)} total staff`,
          detail: `${data.teachers ?? 0} teachers, ${data.staff ?? 0} support staff`,
          onView: () => router.push("/director/teachers"),
        },
        {
          title: "Enrollment Trends",
          description: "Student enrollment numbers over time",
          icon: GraduationCap,
          value: `${data.students ?? 0} enrolled`,
          detail: `${classes} active classes`,
          onView: () => router.push("/director/dashboard"),
        },
        {
          title: "Financial Summary",
          description: "Revenue, fees, and payment status",
          icon: DollarSign,
          value: `$${Number(data.revenue ?? 0).toLocaleString()}`,
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
      ])
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

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
