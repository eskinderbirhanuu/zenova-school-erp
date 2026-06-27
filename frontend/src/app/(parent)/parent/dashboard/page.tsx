"use client"

import { useEffect, useState } from "react"
import { KPICard } from "@/components/ui/kpi-card"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { SectionHeader } from "@/components/ui/section-header"
import { PageHeader } from "@/components/ui/page-header"
import { parentService } from "@/services/api"
import Link from "next/link"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import {
  Users, ClipboardCheck, Award, Wallet, Loader2, ArrowRight,
  BarChart3, CreditCard, MessageSquare, Calendar, BookOpen
} from "lucide-react"

import { AnimatedBackground } from "@/components/3d/animated-background"
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/3d/micro-animations"

const gradesData = [
  { subject: "Math", grade: 85 },
  { subject: "Eng", grade: 92 },
  { subject: "Sci", grade: 78 },
  { subject: "Art", grade: 95 },
  { subject: "PE", grade: 88 },
]

const recentNotifications = [
  { message: "Report card published", child: "Emma", time: "10 min ago", badge: "success" as const },
  { message: "Parent-teacher meeting", child: "Emma", time: "25 min ago", badge: "info" as const },
  { message: "Absent alert", child: "Noah", time: "1 hour ago", badge: "warning" as const },
  { message: "Fee due reminder", child: "Emma", time: "2 hours ago", badge: "purple" as const },
  { message: "Event invitation", child: "Both", time: "3 hours ago", badge: "success" as const },
]

export default function ParentDashboard() {
  const [childrenCount, setChildrenCount] = useState<string>("—")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    parentService.list({ limit: 1 }).then((res) => {
      const count = res.data?.total ?? res.data?.length
      setChildrenCount(count != null ? String(count) : "—")
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <AnimatedBackground />
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <AnimatedBackground />

      <FadeInUp>
        <PageHeader
        title="Parent Portal"
        description="Track your children's progress and manage your account."
      />
      </FadeInUp>

      <StaggerContainer>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StaggerItem><KPICard title="My Children" value={childrenCount} icon={Users} trend={{ value: "", positive: true }} /></StaggerItem>
          <StaggerItem><KPICard title="Attendance Rate" value="96%" icon={ClipboardCheck} trend={{ value: "+2%", positive: true }} accentColor="bg-emerald-500" /></StaggerItem>
          <StaggerItem><KPICard title="Recent Results" value="A-" icon={Award} trend={{ value: "Up", positive: true }} /></StaggerItem>
          <StaggerItem><KPICard title="Wallet Balance" value="$250.00" icon={Wallet} trend={{ value: "-", positive: true }} /></StaggerItem>
        </div>
      </StaggerContainer>

      <FadeInUp delay={0.2}>
        <SectionHeader title="Academic Overview" description="Your child's subject performance" />
      </FadeInUp>

      <div className="grid gap-6 lg:grid-cols-7">
        <FadeInUp delay={0.3} className="lg:col-span-4">
          <Card shadow="colored">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" /> Subject Grades
            </CardTitle>
            <CardDescription>Current term performance by subject</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={gradesData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="grade" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Score" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
          </Card>
        </FadeInUp>

        <FadeInUp delay={0.4} className="lg:col-span-3">
          <Card shadow="default">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4 text-primary" /> Notifications
            </CardTitle>
            <CardDescription>Latest school notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentNotifications.map((n, i) => (
                <div key={i} className="flex items-start gap-3 border-b border-border/50 pb-3 last:border-0 last:pb-0">
                  <div className="rounded-full bg-primary/5 p-1.5 text-primary">
                    <BookOpen className="h-3 w-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{n.message}</p>
                    <p className="text-xs text-muted-foreground">{n.child} - {n.time}</p>
                  </div>
                  <StatusBadge status={n.badge === "success" ? "Success" : n.badge === "warning" ? "Pending" : n.badge === "purple" ? "Update" : "Info"} variant={n.badge} />
                </div>
              ))}
            </div>
          </CardContent>
          </Card>
        </FadeInUp>
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <FadeInUp delay={0.5} className="lg:col-span-4">
          <Card shadow="default">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-primary" /> Upcoming Events
            </CardTitle>
            <CardDescription>School calendar and events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
              Calendar integration coming soon
            </div>
          </CardContent>
          </Card>
        </FadeInUp>

        <FadeInUp delay={0.6} className="lg:col-span-3">
          <Card shadow="default">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4 text-primary" /> Quick Actions
            </CardTitle>
            <CardDescription>Common parent tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <Link href="/parent/payments">
                <Button variant="outline" className="w-full justify-between h-10">
                  <span className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> Make Payment</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </Link>
              <Link href="/parent/results">
                <Button variant="outline" className="w-full justify-between h-10">
                  <span className="flex items-center gap-2"><Award className="h-4 w-4" /> View Results</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </Link>
              <Link href="/parent/messages">
                <Button variant="outline" className="w-full justify-between h-10">
                  <span className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Contact Teacher</span>
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
