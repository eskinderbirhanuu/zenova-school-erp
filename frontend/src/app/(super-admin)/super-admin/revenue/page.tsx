"use client"

import { KPICard } from "@/components/ui/kpi-card"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DollarSign, TrendingUp, Key, AlertCircle } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ComposedChart, Legend } from "recharts"

const revenueData = [
  { month: "Jan", revenue: 12000, licenses: 8000 },
  { month: "Feb", revenue: 18000, licenses: 11000 },
  { month: "Mar", revenue: 15000, licenses: 9000 },
  { month: "Apr", revenue: 22000, licenses: 14000 },
  { month: "May", revenue: 19000, licenses: 12000 },
  { month: "Jun", revenue: 28000, licenses: 18000 },
  { month: "Jul", revenue: 24000, licenses: 16000 },
  { month: "Aug", revenue: 21000, licenses: 13000 },
  { month: "Sep", revenue: 30000, licenses: 20000 },
  { month: "Oct", revenue: 35000, licenses: 23000 },
  { month: "Nov", revenue: 26000, licenses: 17000 },
  { month: "Dec", revenue: 42000, licenses: 28000 },
]

const recentTransactions = [
  { id: "TX-001", school: "Springfield Elementary", amount: 1200, type: "License Renewal", date: "2026-06-21", status: "Completed" },
  { id: "TX-002", school: "Westside Academy", amount: 2400, type: "New License", date: "2026-06-20", status: "Completed" },
  { id: "TX-003", school: "Northridge Prep", amount: 600, type: "Branch License", date: "2026-06-19", status: "Pending" },
  { id: "TX-004", school: "Eastwood High", amount: 3600, type: "Enterprise Plan", date: "2026-06-18", status: "Completed" },
  { id: "TX-005", school: "Riverside Academy", amount: 1800, type: "License Renewal", date: "2026-06-17", status: "Completed" },
]

const revenueBySchool = [
  { school: "Springfield Elementary", revenue: 24000, licenses: 4, status: "active" },
  { school: "Eastwood High", revenue: 18500, licenses: 3, status: "active" },
  { school: "Riverside Academy", revenue: 15200, licenses: 3, status: "active" },
  { school: "Westside Academy", revenue: 12800, licenses: 2, status: "active" },
  { school: "Northridge Prep", revenue: 9600, licenses: 2, status: "suspended" },
]

export default function SuperAdminRevenue() {
  return (
    <div className="space-y-6">
      <PageHeader title="Financial Control" description="Revenue monitoring and financial oversight" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Monthly Revenue" value="$42,000" icon={DollarSign} iconColor="text-emerald-600" description="+12% vs last month" />
        <KPICard title="Yearly Revenue" value="$312,000" icon={TrendingUp} iconColor="text-blue-600" />
        <KPICard title="License Revenue" value="$198,000" icon={Key} iconColor="text-purple-600" />
        <KPICard title="Outstanding Payments" value="$8,400" icon={AlertCircle} iconColor="text-orange-600" description="3 invoices pending" />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-lg">Revenue Overview</CardTitle><CardDescription>Monthly revenue vs license revenue</CardDescription></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Total Revenue" />
              <Line type="monotone" dataKey="licenses" stroke="#10b981" strokeWidth={2} name="License Revenue" />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">Recent Transactions</CardTitle><CardDescription>Latest payment activity</CardDescription></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-4 font-medium">ID</th>
                  <th className="p-4 font-medium">School</th>
                  <th className="p-4 font-medium">Amount</th>
                  <th className="p-4 font-medium">Type</th>
                  <th className="p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4 font-mono text-xs">{t.id}</td>
                    <td className="p-4 font-medium">{t.school}</td>
                    <td className="p-4 font-medium">${t.amount.toLocaleString()}</td>
                    <td className="p-4 text-muted-foreground">{t.type}</td>
                    <td className="p-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${t.status === "Completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{t.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">Revenue by School</CardTitle><CardDescription>Top revenue generating schools</CardDescription></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-4 font-medium">School</th>
                  <th className="p-4 font-medium">Revenue</th>
                  <th className="p-4 font-medium">Licenses</th>
                  <th className="p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {revenueBySchool.map((s) => (
                  <tr key={s.school} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4 font-medium">{s.school}</td>
                    <td className="p-4 font-medium">${s.revenue.toLocaleString()}</td>
                    <td className="p-4">{s.licenses}</td>
                    <td className="p-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${s.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{s.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
