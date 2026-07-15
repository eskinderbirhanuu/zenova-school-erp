"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { KPICard } from "@/components/ui/kpi-card"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts"
import { Users, DollarSign, GraduationCap, TrendingUp, Loader2, ScanLine } from "lucide-react"
import api from "@/services/api"
import { useDashboardOverview, useDashboardTrends } from "@/hooks/queries"

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2, 210 80% 55%))", "hsl(var(--chart-3, 142 70% 50%))", "hsl(var(--chart-4, 30 90% 55%))"]

export default function AdminAnalytics() {
  const [gradeDist, setGradeDist] = useState<any[]>([])
  const [staffDist, setStaffDist] = useState<any[]>([])
  const [attSummary, setAttSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const { data: overview } = useDashboardOverview()
  const { data: trends } = useDashboardTrends(12)

  useEffect(() => {
    Promise.all([
      api.get("/analytics/grade-distribution"),
      api.get("/analytics/staff-distribution"),
      api.get("/analytics/attendance-summary"),
    ]).then(([g, s, a]) => {
      setGradeDist(g.data || [])
      setStaffDist(s.data || [])
      setAttSummary(a.data || null)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  const totals = (overview?.totals || {}) as any
  const finance = (overview?.finance || {}) as any
  const revTrend = trends?.revenue_trend || []
  const enrollTrend = trends?.enrollment_trend || []
  const attTrend = (trends as any)?.attendance_trend || []
  const todayAtt = attSummary?.today || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Data-driven insights and performance metrics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <KPICard title="Total Students" value={String(totals.students || 0)} icon={GraduationCap} iconColor="text-blue-600" />
        <KPICard title="Teachers" value={String(totals.teachers || 0)} icon={Users} iconColor="text-green-600" />
        <KPICard title="Staff" value={String(totals.staff || 0)} icon={Users} iconColor="text-emerald-600" />
        <KPICard title="Revenue" value={`$${Number(finance.revenue || 0).toLocaleString()}`} icon={DollarSign} iconColor="text-yellow-600" />
        <KPICard title="Attendance Today" value={String(todayAtt)} icon={ScanLine} iconColor="text-purple-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Enrollment by Grade</CardTitle>
            <CardDescription>Student distribution by grade level and gender</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {gradeDist.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gradeDist}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="grade" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="boys" name="Boys" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="girls" name="Girls" fill="hsl(var(--chart-2, 210 80% 55%))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">No enrollment data</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Staff Distribution</CardTitle>
            <CardDescription>Staff composition by department type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 flex items-center justify-center">
              {staffDist.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={staffDist} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {staffDist.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-gray-400">No staff data</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue over the past 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-60">
              {revTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">No revenue data</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enrollment Trend</CardTitle>
            <CardDescription>New student enrollment over the past 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-60">
              {enrollTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={enrollTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="students" stroke="hsl(var(--chart-3, 142 70% 50%))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">No enrollment data</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attendance Trend</CardTitle>
            <CardDescription>Monthly scan volume over the past 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-60">
              {attTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={attTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="scans" stroke="hsl(var(--chart-4, 30 90% 55%))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">No attendance data</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
