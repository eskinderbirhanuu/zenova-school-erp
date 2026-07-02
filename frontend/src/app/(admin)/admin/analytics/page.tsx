"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { KPICard } from "@/components/ui/kpi-card"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts"
import { Users, DollarSign, GraduationCap, TrendingUp, Loader2 } from "lucide-react"
import api from "@/services/api"
import { dashboardService } from "@/services/api"

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2, 210 80% 55%))", "hsl(var(--chart-3, 142 70% 50%))", "hsl(var(--chart-4, 30 90% 55%))"]

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true)
  const [gradeDist, setGradeDist] = useState<any[]>([])
  const [staffDist, setStaffDist] = useState<any[]>([])
  const [overview, setOverview] = useState<any>(null)

  useEffect(() => {
    Promise.all([
      api.get("/analytics/grade-distribution"),
      api.get("/analytics/staff-distribution"),
      dashboardService.overview().catch(() => ({ data: null })),
    ]).then(([g, s, o]) => {
      setGradeDist(g.data || [])
      setStaffDist(s.data || [])
      setOverview(o.data || null)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  const totals = overview?.totals || {}
  const totalEnrolled = (totals.students || 0) + (totals.teachers || 0)
  const staffCount = staffDist.reduce((sum: number, s: any) => sum + s.value, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Data-driven insights and performance metrics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Total Students" value={String(totals.students || 0)} icon={GraduationCap} iconColor="text-blue-600" />
        <KPICard title="Teachers" value={String(totals.teachers || 0)} icon={Users} iconColor="text-green-600" />
        <KPICard title="Staff" value={String(totals.staff || 0)} icon={Users} iconColor="text-emerald-600" />
        <KPICard title="Classes" value={String(totals.classes || 0)} icon={TrendingUp} iconColor="text-purple-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Enrollment by Grade</CardTitle>
            <CardDescription>Student distribution by grade level and gender</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
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
            <div className="h-80 flex items-center justify-center">
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
    </div>
  )
}
