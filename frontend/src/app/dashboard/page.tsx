"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { studentService, financeService, hrService, inventoryService, libraryService, cafeteriaService } from "@/services/api"
import { Users, DollarSign, GraduationCap, BookOpen, TrendingUp, Activity, ShoppingCart, UserCheck } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts"

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]

export default function DashboardPage() {
  const [stats, setStats] = useState({ students: 0, teachers: 0, staff: 0, revenue: 0, inventory: 0, books: 0, orders: 0, attendance: 0 })
  const [journalData, setJournalData] = useState<any[]>([])
  const [studentTrend, setStudentTrend] = useState<any[]>([])

  useEffect(() => {
    Promise.allSettled([
      studentService.list({ limit: 1 }).then(r => setStats(s => ({ ...s, students: r.headers?.["x-total-count"] || r.data?.length || 0 }))),
      financeService.trialBalance().then(r => setStats(s => ({ ...s, revenue: r.data?.total_debit || 0 }))),
      financeService.journalEntries.list({ limit: 100 }).then(r => {
        const grouped: Record<string, any> = {}
        ;(r.data || []).forEach((je: any) => {
          const m = (je.entry_date || "").substring(0, 7)
          if (!grouped[m]) grouped[m] = { month: m, debits: 0, credits: 0 }
          grouped[m].debits += Number(je.total_debit) || 0
          grouped[m].credits += Number(je.total_credit) || 0
        })
        setJournalData(Object.values(grouped).slice(-6))
      }),
      hrService.attendance.list({ limit: 1 }).then(r => setStats(s => ({ ...s, attendance: r.data?.length || 0 }))),
      inventoryService.items.list({ limit: 1 }).then(r => setStats(s => ({ ...s, inventory: r.data?.length || 0 }))),
      libraryService.books.list({ limit: 1 }).then(r => setStats(s => ({ ...s, books: r.data?.length || 0 }))),
      cafeteriaService.orders.list({ limit: 1 }).then(r => setStats(s => ({ ...s, orders: r.data?.length || 0 }))),
      hrService.contracts.list({ limit: 1 }).then(r => setStats(s => ({ ...s, teachers: r.data?.filter((c: any) => c.employee_type === "teacher")?.length || 0 }))),
    ])
  }, [])

  const kpis = [
    { title: "Students", value: stats.students, icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
    { title: "Revenue", value: `$${stats.revenue.toLocaleString()}`, icon: DollarSign, color: "text-green-600", bg: "bg-green-100" },
    { title: "Teachers", value: stats.teachers, icon: GraduationCap, color: "text-purple-600", bg: "bg-purple-100" },
    { title: "Attendance", value: stats.attendance, icon: UserCheck, color: "text-cyan-600", bg: "bg-cyan-100" },
    { title: "Inventory", value: stats.inventory, icon: ShoppingCart, color: "text-orange-600", bg: "bg-orange-100" },
    { title: "Books", value: stats.books, icon: BookOpen, color: "text-indigo-600", bg: "bg-indigo-100" },
    { title: "Orders", value: stats.orders, icon: Activity, color: "text-pink-600", bg: "bg-pink-100" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              <div className={`rounded-lg ${kpi.bg} p-2`}><kpi.icon className={`h-4 w-4 ${kpi.color}`} /></div>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{kpi.value}</div></CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Financial Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={journalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="debits" fill="#3b82f6" name="Debits" radius={[4, 4, 0, 0]} />
                <Bar dataKey="credits" fill="#10b981" name="Credits" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Module Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={[
                  { name: "Students", value: Math.max(stats.students, 1) },
                  { name: "Teachers", value: Math.max(stats.teachers, 1) },
                  { name: "Inventory", value: Math.max(stats.inventory, 1) },
                  { name: "Books", value: Math.max(stats.books, 1) },
                  { name: "Orders", value: Math.max(stats.orders, 1) },
                ]} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name }) => name}>
                  {COLORS.slice(0, 5).map((c, i) => <Cell key={i} fill={c} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
