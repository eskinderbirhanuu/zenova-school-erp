"use client"

import { KPICard } from "@/components/ui/kpi-card"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { PageHeader } from "@/components/ui/page-header"
import { useDashboardOverview, useClasses, useSubjects, useTrialBalance } from "@/hooks/queries"
import Link from "next/link"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import {
  Users, GraduationCap, DollarSign, ScrollText, Building2, Activity,
  ArrowRight, BarChart3, Loader2, TrendingUp,
  UserPlus, FileText, Award, Eye
} from "lucide-react"

import { DynamicAnimatedBackground } from "@/components/3d/dynamic"
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/3d/micro-animations"

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"]

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
  const totalRevenue = `$${(debit + credit).toLocaleString()}`

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
<DynamicAnimatedBackground />
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <DynamicAnimatedBackground />

      <FadeInUp>
        <PageHeader
        title="Executive Analytics"
        description="High-level overview of institutional performance and departmental health."
        actions={
          <>
            <Link href="/director/reports">
              <Button variant="outline" size="sm"><Eye className="h-4 w-4 mr-2" /> View Reports</Button>
            </Link>
          </>
        }
      />
      </FadeInUp>

      <StaggerContainer>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StaggerItem><KPICard title="Students" value={studentsCount} icon={GraduationCap} iconColor="text-blue-400" /></StaggerItem>
          <StaggerItem><KPICard title="Teachers" value={teachersCount} icon={Users} iconColor="text-green-400" /></StaggerItem>
          <StaggerItem><KPICard title="Staff" value={staffCount} icon={Building2} iconColor="text-purple-400" /></StaggerItem>
          <StaggerItem><KPICard title="Total Revenue" value={totalRevenue} icon={DollarSign} accentColor="bg-emerald-500" /></StaggerItem>
          <StaggerItem><KPICard title="Classes" value={classCount} icon={Activity} iconColor="text-orange-400" /></StaggerItem>
          <StaggerItem><KPICard title="Subjects" value={subjectCount} icon={ScrollText} iconColor="text-cyan-400" /></StaggerItem>
        </div>
      </StaggerContainer>

      <div className="grid gap-6 lg:grid-cols-7">
        <FadeInUp delay={0.3} className="lg:col-span-4">
          <Card shadow="colored">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" /> Resource Overview
            </CardTitle>
            <CardDescription>Key institutional metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={[
                { name: "Students", value: studentsCount },
                { name: "Teachers", value: teachersCount },
                { name: "Staff", value: staffCount },
                { name: "Classes", value: classCount },
                { name: "Subjects", value: subjectCount },
              ]}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Count" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
          </Card>
        </FadeInUp>

        <FadeInUp delay={0.4} className="lg:col-span-3">
          <Card shadow="colored">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" /> Recent Activity
            </CardTitle>
            <CardDescription>Latest institutional events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3 border-b border-border/50 pb-3">
                <div className="rounded-full bg-green-500/10 p-1.5 text-green-500">
                  <UserPlus className="h-3 w-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{studentsCount} students enrolled</p>
                  <p className="text-xs text-muted-foreground">Total across {classCount} classes</p>
                </div>
                <StatusBadge status="Active" variant="success" />
              </div>
              <div className="flex items-start gap-3 border-b border-border/50 pb-3">
                <div className="rounded-full bg-primary/5 p-1.5 text-primary">
                  <GraduationCap className="h-3 w-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{teachersCount + staffCount} staff members</p>
                  <p className="text-xs text-muted-foreground">{teachersCount} teachers, {staffCount} staff</p>
                </div>
                <StatusBadge status="Active" variant="info" />
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-emerald-500/10 p-1.5 text-emerald-500">
                  <DollarSign className="h-3 w-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Total Revenue: {totalRevenue}</p>
                  <p className="text-xs text-muted-foreground">Including all income sources</p>
                </div>
                <StatusBadge status="Updated" variant="purple" />
              </div>
            </div>
          </CardContent>
          </Card>
        </FadeInUp>
      </div>

      <div className="grid gap-6 lg:grid-cols-7">

        <FadeInUp delay={0.6} className="lg:col-span-3">
          <Card shadow="default">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Award className="h-4 w-4 text-primary" /> Quick Actions
              </CardTitle>
              <CardDescription>Frequently used management tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <Link href="/director/staff/new">
                  <Button variant="outline" className="w-full justify-between h-10">
                    <span className="flex items-center gap-2"><UserPlus className="h-4 w-4" /> Add Staff</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </Link>
                <Link href="/director/teachers/new">
                  <Button variant="outline" className="w-full justify-between h-10">
                    <span className="flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Add Teacher</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </Link>
                <Link href="/director/reports">
                  <Button variant="outline" className="w-full justify-between h-10">
                    <span className="flex items-center gap-2"><FileText className="h-4 w-4" /> View Reports</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </FadeInUp>
      </div>
    </div>
  )
}
