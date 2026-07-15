"use client"

import { KPICard } from "@/components/ui/kpi-card"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DollarSign, TrendingUp, Key, AlertCircle } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ComposedChart, Legend } from "recharts"
import { usePlatformAdminDashboard, useDashboardTrends, usePlatformSchoolReport } from "@/hooks/queries"

export default function SuperAdminRevenue() {
  const { data: dashboardData, isLoading: dashLoading } = usePlatformAdminDashboard()
  const { data: trendsData, isLoading: trendsLoading } = useDashboardTrends(12)
  const { data: schoolReport, isLoading: schoolsLoading } = usePlatformSchoolReport()
  const loading = dashLoading || trendsLoading || schoolsLoading
  const revenueTrend = (trendsData as any)?.revenue_trend || []

  if (loading) return <div className="space-y-6"><PageHeader title="Financial Control" description="Loading..." /></div>

  const d = dashboardData as any
  const monthly = d?.total_revenue ?? 0
  const yearly = d?.total_revenue ?? 0
  const pending = d?.pending_fees ?? 0
  const invoiced = d?.invoiced_fees ?? 0
  const paid = d?.paid_fees ?? 0

  return (
    <div className="space-y-6">
      <PageHeader title="Financial Control" description="Revenue monitoring and financial oversight" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Monthly Revenue" value={`$${(monthly).toLocaleString()}`} icon={DollarSign} iconColor="text-emerald-600" />
        <KPICard title="Paid Fees" value={`$${paid.toLocaleString()}`} icon={TrendingUp} iconColor="text-blue-600" />
        <KPICard title="Invoiced Fees" value={`$${invoiced.toLocaleString()}`} icon={Key} iconColor="text-purple-600" />
        <KPICard title="Pending Fees" value={`$${pending.toLocaleString()}`} icon={AlertCircle} iconColor="text-orange-600" />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-lg">Revenue Overview</CardTitle><CardDescription>Monthly revenue trend</CardDescription></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Revenue" />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Trend" />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">School Revenue Rankings</CardTitle><CardDescription>Revenue by school</CardDescription></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-4 font-medium">School</th>
                  <th className="p-4 font-medium">Revenue</th>
                  <th className="p-4 font-medium">Transactions</th>
                </tr>
              </thead>
              <tbody>
                {(d?.school_rankings ?? schoolReport ?? []).map((s: any) => (
                  <tr key={s.school_id ?? s.school_name} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4 font-medium">{s.school_name}</td>
                    <td className="p-4 font-medium">${(s.revenue ?? 0).toLocaleString()}</td>
                    <td className="p-4">{s.transactions ?? s.transaction_count ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">Revenue Summary</CardTitle><CardDescription>Current period breakdown</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Total Revenue", value: monthly, color: "text-blue-600" },
              { label: "Paid Fees", value: paid, color: "text-emerald-600" },
              { label: "Invoiced Fees", value: invoiced, color: "text-purple-600" },
              { label: "Pending Fees", value: pending, color: "text-orange-600" },
            ].map((item: any) => (
              <div key={item.label} className="flex justify-between items-center border-b pb-2 last:border-0">
                <span className="text-muted-foreground">{item.label}</span>
                <span className={`font-semibold ${item.color}`}>${item.value.toLocaleString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}