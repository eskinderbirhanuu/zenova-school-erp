"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  useStudents, useJournalEntries, useTrialBalance,
  useAttendance, useContracts, useInventoryItems,
  useBooks, useCafeteriaOrders,
} from "@/hooks/queries"
import { Users, DollarSign, GraduationCap, BookOpen, TrendingUp, Activity, ShoppingCart, UserCheck } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]

export default function DashboardPage() {
  const { data: students } = useStudents()
  const { data: trialBalance } = useTrialBalance()
  const { data: journalEntries } = useJournalEntries({ limit: 100 })
  const { data: attendance } = useAttendance()
  const { data: inventoryItems } = useInventoryItems()
  const { data: books } = useBooks()
  const { data: cafeteriaOrders } = useCafeteriaOrders()
  const { data: contracts } = useContracts()

  const stats = useMemo(() => ({
    students: students?.length || 0,
    revenue: (trialBalance as any)?.total_debit || 0,
    teachers: (contracts || []).filter((c: any) => c.employee_type === "teacher").length,
    attendance: attendance?.length || 0,
    inventory: inventoryItems?.length || 0,
    books: books?.length || 0,
    orders: cafeteriaOrders?.length || 0,
  }), [students, trialBalance, contracts, attendance, inventoryItems, books, cafeteriaOrders])

  const journalData = useMemo(() => {
    const grouped: Record<string, any> = {}
    ;(journalEntries || []).forEach((je: any) => {
      const m = (je.entry_date || "").substring(0, 7)
      if (!grouped[m]) grouped[m] = { month: m, debits: 0, credits: 0 }
      grouped[m].debits += Number(je.total_debit) || 0
      grouped[m].credits += Number(je.total_credit) || 0
    })
    return Object.values(grouped).slice(-6)
  }, [journalEntries])

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
        {kpis.map((kpi: any) => (
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
