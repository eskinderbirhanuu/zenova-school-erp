"use client"

import { useEffect, useState } from "react"
import { KPICard } from "@/components/ui/kpi-card"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { useParentDashboard } from "@/hooks/queries"
import { SectionHeader } from "@/components/ui/section-header"
import {
  Users, ClipboardCheck, Wallet,
  Flame, GraduationCap,
} from "lucide-react"

import DashboardShell from "@/components/dashboard/dashboard-shell"
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/3d/micro-animations"
import { cn } from "@/lib/utils"
import GradesListCard from "@/components/dashboard/grades-list-card"
import FeedCard from "@/components/dashboard/feed-card"



export default function ParentDashboard() {
  const [selectedChild, setSelectedChild] = useState<string>("")
  const { data: dashboardData, isLoading } = useParentDashboard()

  useEffect(() => {
    const children = (dashboardData as any)?.children
    if (children?.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedChild(children[0].id)
    }
  }, [dashboardData])

  const children = (dashboardData as any)?.children || []
  const childMap: Record<string, any> = {}
  children.forEach((c: any) => { childMap[c.id] = c })
  const data = childMap[selectedChild] || children[0] || {}

  return (
    <DashboardShell
      isLoading={isLoading}
      header={
        <FadeInUp>
          <PageHeader title="Parent Portal" description="Track your children's progress and manage your account." />
        </FadeInUp>
      }
      widgets={[
        <FadeInUp delay={0.1} key="children">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {children.map((child: any) => (
              <button
                key={child.id}
                onClick={() => setSelectedChild(child.id)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all whitespace-nowrap shrink-0",
                  selectedChild === child.id
                    ? "bg-primary/10 border-primary/40 shadow-sm ring-1 ring-primary/20"
                    : "bg-card/60 border-border/40 hover:bg-muted/50"
                )}
              >
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold", selectedChild === child.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{child.initials}</div>
                <div className="text-left">
                  <p className={cn("text-sm font-semibold", selectedChild === child.id ? "text-foreground" : "text-muted-foreground")}>{child.name}</p>
                  <p className="text-xs text-muted-foreground">Grade {child.grade}</p>
                </div>
              </button>
            ))}
          </div>
        </FadeInUp>,
        <FadeInUp delay={0.15} key="spotlight">
          <Card className="relative overflow-hidden border-border/40 bg-card/80 backdrop-blur-sm">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-xl" />
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-bold">
                    {(() => { const c = childMap[selectedChild]; return c ? (c.full_name || "—").split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase() : "—" })()}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{childMap[selectedChild]?.full_name || "—"}</h3>
                    <p className="text-sm text-muted-foreground">{childMap[selectedChild]?.class_name || childMap[selectedChild]?.class_code || ""}</p>
                  </div>
                </div>
                <div className="flex flex-1 flex-col sm:flex-row gap-4 sm:gap-8 sm:items-center">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5"><span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Attendance</span><span className="text-sm font-bold">{data.attendance_pct ?? 0}%</span></div>
                    <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${data.attendance_pct ?? 0}%` }} /></div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center"><p className="text-2xl font-bold">{data.class_code || data.class_name || "—"}</p><p className="text-xs text-muted-foreground">Class</p></div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600"><Flame className="h-4 w-4" /><span className="text-sm font-semibold">{data.attendance_pct ?? 0}</span><span className="text-xs">% attendance</span></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeInUp>,
        <StaggerContainer key="kpi">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StaggerItem><KPICard title="My Children" value={children.length} icon={Users} trend={{ value: "", positive: true }} /></StaggerItem>
            <StaggerItem><KPICard title="Attendance Rate" value={`${data.attendance_pct ?? 0}%`} icon={ClipboardCheck} trend={{ value: "", positive: true }} /></StaggerItem>
            <StaggerItem><KPICard title="Student ID" value={data.student_id || "—"} icon={GraduationCap} /></StaggerItem>
            <StaggerItem><KPICard title="Parent Name" value={(dashboardData as any)?.parent?.full_name || "—"} icon={Wallet} /></StaggerItem>
          </div>
        </StaggerContainer>,
        <FadeInUp delay={0.2} key="academic-section"><SectionHeader title="Academic Overview" description={`${data.full_name || "Student"}'s grades and fees`} /></FadeInUp>,
        <GradesListCard
          key="grades"
          title="Subject Grades"
          description="Recent exam results"
          grades={(data.grades || []).slice(0, 10).map((g: any) => ({
            subject: g.subject,
            exam: g.exam,
            score: g.score,
            maxScore: g.max_score,
            grade: g.grade,
          }))}
          delay={0.25}
          emptyMessage="No exam results available"
        />,
        <FeedCard
          key="fees"
          title="Invoices & Fees"
          description="Payment status and due amounts"
          items={(data.fees || []).slice(0, 10).map((f: any) => ({
            label: f.label,
            detail: `Due ${f.due ? new Date(f.due).toLocaleDateString() : "—"}`,
            badge: {
              text: f.status === "paid" ? "Success" : f.status === "overdue" ? "Overdue" : "Pending",
              variant: f.status === "paid" ? "success" : f.status === "overdue" ? "destructive" : "warning",
            },
          }))}
          icon={Wallet}
          delay={0.3}
          emptyMessage="No invoices available"
        />,
      ]}
    />
  )
}
