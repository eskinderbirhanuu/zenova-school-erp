"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { KPICard } from "@/components/ui/kpi-card"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts"
import { Users, DollarSign, GraduationCap, TrendingUp } from "lucide-react"

const enrollmentByGrade = [
  { grade: "Grade 1", boys: 45, girls: 38 }, { grade: "Grade 2", boys: 52, girls: 41 },
  { grade: "Grade 3", boys: 38, girls: 44 }, { grade: "Grade 4", boys: 48, girls: 36 },
  { grade: "Grade 5", boys: 55, girls: 49 }, { grade: "Grade 6", boys: 42, girls: 47 },
  { grade: "Grade 7", boys: 50, girls: 43 }, { grade: "Grade 8", boys: 44, girls: 39 },
]

const staffDistribution = [
  { name: "Teachers", value: 45 }, { name: "Admin", value: 12 },
  { name: "Support", value: 18 }, { name: "Management", value: 8 },
]

const feeCollection = [
  { month: "Sep", collected: 85 }, { month: "Oct", collected: 78 },
  { month: "Nov", collected: 82 }, { month: "Dec", collected: 90 },
  { month: "Jan", collected: 75 }, { month: "Feb", collected: 88 },
  { month: "Mar", collected: 92 }, { month: "Apr", collected: 80 },
  { month: "May", collected: 86 }, { month: "Jun", collected: 95 },
]

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2, 210 80% 55%))", "hsl(var(--chart-3, 142 70% 50%))", "hsl(var(--chart-4, 30 90% 55%))"]

export default function AdminAnalytics() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Data-driven insights and performance metrics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Total Enrollment" value="786" icon={GraduationCap} iconColor="text-blue-600" description="+12.4% vs last year" />
        <KPICard title="Staff Count" value="83" icon={Users} iconColor="text-green-600" description="5 departments" />
        <KPICard title="Fee Collection Rate" value="85.1%" icon={DollarSign} iconColor="text-emerald-600" description="+3.2% vs last month" />
        <KPICard title="Year-over-Year" value="+15.3%" icon={TrendingUp} iconColor="text-purple-600" description="Student growth rate" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Enrollment by Grade</CardTitle>
            <CardDescription>Student distribution by grade level and gender</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={enrollmentByGrade}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="grade" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="boys" name="Boys" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="girls" name="Girls" fill="hsl(var(--chart-2, 210 80% 55%))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
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
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={staffDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {staffDistribution.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fee Collection Rate</CardTitle>
          <CardDescription>Monthly fee collection percentage across all branches</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={feeCollection}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v: number) => [`${v}%`, "Collection Rate"]} />
                <Line type="monotone" dataKey="collected" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} name="Collection Rate" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
