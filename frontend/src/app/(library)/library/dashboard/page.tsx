"use client"

import { useEffect, useState } from "react"
import { KPICard } from "@/components/ui/kpi-card"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { SectionHeader } from "@/components/ui/section-header"
import { PageHeader } from "@/components/ui/page-header"
import { libraryService } from "@/services/api"
import Link from "next/link"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import {
  BookOpen, ArrowUp, ArrowDown, DollarSign, Loader2, ArrowRight,
  BarChart3, BookPlus, ClipboardCheck, Calendar, Users
} from "lucide-react"

import { AnimatedBackground } from "@/components/3d/animated-background"
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/3d/micro-animations"

const borrowTrend = [
  { day: "Mon", borrowed: 12, returned: 8 },
  { day: "Tue", borrowed: 19, returned: 15 },
  { day: "Wed", borrowed: 15, returned: 10 },
  { day: "Thu", borrowed: 22, returned: 18 },
  { day: "Fri", borrowed: 18, returned: 12 },
  { day: "Sat", borrowed: 5, returned: 3 },
]

const recentLibrary = [
  { action: "Book borrowed", book: "The Great Gatsby", time: "10 min ago", badge: "success" as const },
  { action: "Book returned", book: "1984", time: "25 min ago", badge: "info" as const },
  { action: "Overdue notice", book: "To Kill a Mockingbird", time: "1 hour ago", badge: "warning" as const },
  { action: "New book added", book: "Sapiens", time: "2 hours ago", badge: "purple" as const },
  { action: "Fine collected", book: "The Catcher in the Rye", time: "3 hours ago", badge: "success" as const },
]

export default function LibraryDashboard() {
  const [stats, setStats] = useState({ books: "—", borrowed: "—" })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      libraryService.books.list({ limit: 1 }).then(r => r.data?.length || 0).catch(() => 0),
      libraryService.borrowings.list({ limit: 1 }).then(r => r.data?.length || 0).catch(() => 0),
    ]).then(([books, borrowed]) => {
      setStats({ books, borrowed })
      setLoading(false)
    })
  }, [])

  const available = typeof stats.books === "number" && typeof stats.borrowed === "number"
    ? stats.books - stats.borrowed
    : "—"

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
        title="Library Hub"
        description="Catalogue, borrowings, and circulation management."
      />
      </FadeInUp>

      <StaggerContainer>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StaggerItem><KPICard title="Total Books" value={stats.books} icon={BookOpen} trend={{ value: "+24", positive: true }} /></StaggerItem>
          <StaggerItem><KPICard title="Currently Borrowed" value={stats.borrowed} icon={ArrowUp} trend={{ value: "+5", positive: true }} accentColor="bg-amber-500" /></StaggerItem>
          <StaggerItem><KPICard title="Available" value={available} icon={ArrowDown} trend={{ value: "-3", positive: false }} /></StaggerItem>
          <StaggerItem><KPICard title="Overdue Fines" value="$0.00" icon={DollarSign} trend={{ value: "0", positive: true }} /></StaggerItem>
        </div>
      </StaggerContainer>

      <FadeInUp delay={0.2}>
        <SectionHeader title="Circulation Analytics" description="Daily borrowing and returns" />
      </FadeInUp>

      <div className="grid gap-6 lg:grid-cols-7">
        <FadeInUp delay={0.3} className="lg:col-span-4">
          <Card shadow="colored">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-primary" /> Borrowing Trend
            </CardTitle>
            <CardDescription>Books borrowed and returned this week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={borrowTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="borrowed" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" name="Borrowed" strokeWidth={2} />
                <Area type="monotone" dataKey="returned" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2) / 0.15)" name="Returned" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
          </Card>
        </FadeInUp>

        <FadeInUp delay={0.4} className="lg:col-span-3">
          <Card shadow="default">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardCheck className="h-4 w-4 text-primary" /> Recent Activity
            </CardTitle>
            <CardDescription>Latest library events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentLibrary.map((a, i) => (
                <div key={i} className="flex items-start gap-3 border-b border-border/50 pb-3 last:border-0 last:pb-0">
                  <div className="rounded-full bg-primary/5 p-1.5 text-primary">
                    <BookOpen className="h-3 w-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{a.action}</p>
                    <p className="text-xs text-muted-foreground">{a.book} - {a.time}</p>
                  </div>
                  <StatusBadge status={a.badge === "success" ? "Success" : a.badge === "warning" ? "Pending" : a.badge === "purple" ? "Update" : "Info"} variant={a.badge} />
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
                <Users className="h-4 w-4 text-primary" /> Member Stats
            </CardTitle>
            <CardDescription>Active library members this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
              Member statistics coming soon
            </div>
          </CardContent>
          </Card>
        </FadeInUp>

        <FadeInUp delay={0.6} className="lg:col-span-3">
          <Card shadow="default">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookPlus className="h-4 w-4 text-primary" /> Quick Actions
            </CardTitle>
            <CardDescription>Common library tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <Link href="/library/books">
                <Button variant="outline" className="w-full justify-between h-10">
                  <span className="flex items-center gap-2"><BookPlus className="h-4 w-4" /> Add Book</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </Link>
              <Link href="/library/borrow">
                <Button variant="outline" className="w-full justify-between h-10">
                  <span className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4" /> Borrow Book</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </Link>
              <Link href="/library/returns">
                <Button variant="outline" className="w-full justify-between h-10">
                  <span className="flex items-center gap-2"><ArrowDown className="h-4 w-4" /> Process Return</span>
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
