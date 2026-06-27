"use client"

import { useEffect, useState } from "react"
import { KPICard } from "@/components/ui/kpi-card"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { SectionHeader } from "@/components/ui/section-header"
import { PageHeader } from "@/components/ui/page-header"
import { studentService, parentService } from "@/services/api"
import Link from "next/link"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import {
  Users, UserPlus, Sparkles, QrCode, Loader2, ArrowRight,
  BarChart3, FileText, Upload, Printer, CheckCircle
} from "lucide-react"

import { AnimatedBackground } from "@/components/3d/animated-background"
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/3d/micro-animations"

function getSeason() {
  const m = new Date().getMonth()
  if (m >= 2 && m <= 4) return "Spring Term"
  if (m >= 5 && m <= 7) return "Summer Term"
  if (m >= 8 && m <= 10) return "Fall Term"
  return "Winter Term"
}

const enrollmentData = [
  { month: "Sep", students: 120 },
  { month: "Oct", students: 145 },
  { month: "Nov", students: 162 },
  { month: "Dec", students: 158 },
  { month: "Jan", students: 175 },
  { month: "Feb", students: 190 },
  { month: "Mar", students: 210 },
  { month: "Apr", students: 225 },
]

const recentActivity = [
  { action: "Student registered", user: "John Doe", time: "10 min ago", badge: "success" as const },
  { action: "Transfer request", user: "Jane Smith", time: "25 min ago", badge: "info" as const },
  { action: "QR card printed", user: "Alex Johnson", time: "1 hour ago", badge: "success" as const },
  { action: "Document verified", user: "Sarah Lee", time: "2 hours ago", badge: "purple" as const },
  { action: "Promotion processed", user: "Grade 10A", time: "3 hours ago", badge: "success" as const },
]

export default function RegistrarDashboard() {
  const [students, setStudents] = useState<number | string>("-")
  const [parents, setParents] = useState<number | string>("-")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      studentService.list({ limit: 1 }).then((r) => {
        const total = r.headers?.["x-total-count"]
        return total ? Number(total) : r.data?.length ?? "-"
      }).catch(() => "-"),
      parentService.list({ limit: 1 }).then((r) => {
        const total = r.headers?.["x-total-count"]
        return total ? Number(total) : r.data?.length ?? "-"
      }).catch(() => "-"),
    ]).then(([students, parents]) => {
      setStudents(students)
      setParents(parents)
      setLoading(false)
    })
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
        title="Registrar Workflow"
        description="Student admissions, registration, and academic records management."
        actions={
          <Link href="/registrar/students/new">
            <Button size="sm"><UserPlus className="h-4 w-4 mr-2" /> Register Student</Button>
          </Link>
        }
      />
      </FadeInUp>

      <StaggerContainer>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StaggerItem><KPICard title="Students" value={students} icon={Users} trend={{ value: "+15", positive: true }} /></StaggerItem>
          <StaggerItem><KPICard title="Parents" value={parents} icon={UserPlus} trend={{ value: "+8", positive: true }} /></StaggerItem>
          <StaggerItem><KPICard title="Current Term" value={getSeason()} icon={Sparkles} trend={{ value: "Active", positive: true }} /></StaggerItem>
          <StaggerItem><KPICard title="ID Cards" value="Active" icon={QrCode} trend={{ value: "Ready", positive: true }} /></StaggerItem>
        </div>
      </StaggerContainer>

      <FadeInUp delay={0.2}>
        <SectionHeader title="Enrollment Analytics" description="Student enrollment and registration trends" />
      </FadeInUp>

      <div className="grid gap-6 lg:grid-cols-7">
        <FadeInUp delay={0.3} className="lg:col-span-4">
          <Card shadow="colored">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-primary" /> Enrollment Trend
            </CardTitle>
            <CardDescription>New student registrations over the year</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={enrollmentData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="students" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Students" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
          </Card>
        </FadeInUp>

        <FadeInUp delay={0.4} className="lg:col-span-3">
          <Card shadow="default">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle className="h-4 w-4 text-primary" /> Recent Activity
            </CardTitle>
            <CardDescription>Latest registration events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((a, i) => (
                <div key={i} className="flex items-start gap-3 border-b border-border/50 pb-3 last:border-0 last:pb-0">
                  <div className="rounded-full bg-primary/5 p-1.5 text-primary">
                    <FileText className="h-3 w-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{a.action}</p>
                    <p className="text-xs text-muted-foreground">{a.user} - {a.time}</p>
                  </div>
                  <StatusBadge status={a.badge === "success" ? "Success" : a.badge === "purple" ? "Update" : "Info"} variant={a.badge} />
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
                <BarChart3 className="h-4 w-4 text-primary" /> Distribution
            </CardTitle>
            <CardDescription>Students by grade level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
              Grade distribution chart coming soon
            </div>
          </CardContent>
          </Card>
        </FadeInUp>

        <FadeInUp delay={0.6} className="lg:col-span-3">
          <Card shadow="default">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Printer className="h-4 w-4 text-primary" /> Quick Actions
            </CardTitle>
            <CardDescription>Common registrar tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <Link href="/registrar/students/new">
                <Button variant="outline" className="w-full justify-between h-10">
                  <span className="flex items-center gap-2"><UserPlus className="h-4 w-4" /> Register Student</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </Link>
              <Link href="/registrar/students/import">
                <Button variant="outline" className="w-full justify-between h-10">
                  <span className="flex items-center gap-2"><Upload className="h-4 w-4" /> Import Students</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </Link>
              <Link href="/registrar/qr">
                <Button variant="outline" className="w-full justify-between h-10">
                  <span className="flex items-center gap-2"><QrCode className="h-4 w-4" /> Print QR Cards</span>
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