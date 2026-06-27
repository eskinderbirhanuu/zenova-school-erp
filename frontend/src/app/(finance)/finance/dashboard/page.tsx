"use client"

import { useEffect, useState } from "react"
import { KPICard } from "@/components/ui/kpi-card"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { SectionHeader } from "@/components/ui/section-header"
import { PageHeader } from "@/components/ui/page-header"
import { financeService } from "@/services/api"
import Link from "next/link"
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import {
  TrendingDown, TrendingUp, Receipt, FileText, Wallet, Scale,
  Loader2, ArrowRight, BarChart3, LineChart, DollarSign, CheckCircle
} from "lucide-react"

import { AnimatedBackground } from "@/components/3d/animated-background"
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/3d/micro-animations"

const revenueData = [
  { month: "Sep", revenue: 45000, expenses: 32000 },
  { month: "Oct", revenue: 52000, expenses: 34000 },
  { month: "Nov", revenue: 48000, expenses: 31000 },
  { month: "Dec", revenue: 61000, expenses: 38000 },
  { month: "Jan", revenue: 58000, expenses: 36000 },
  { month: "Feb", revenue: 63000, expenses: 39000 },
  { month: "Mar", revenue: 72000, expenses: 42000 },
  { month: "Apr", revenue: 68000, expenses: 40000 },
  { month: "May", revenue: 75000, expenses: 43000 },
  { month: "Jun", revenue: 82000, expenses: 45000 },
]

const recentTransactions = [
  { action: "Invoice generated", amount: "$12,500", time: "10 min ago", badge: "success" as const },
  { action: "Payment received", amount: "$8,200", time: "25 min ago", badge: "success" as const },
  { action: "Expense recorded", amount: "$1,450", time: "1 hour ago", badge: "warning" as const },
  { action: "Budget updated", amount: "$50,000", time: "2 hours ago", badge: "info" as const },
  { action: "Payroll processed", amount: "$34,000", time: "3 hours ago", badge: "purple" as const },
]

export default function FinanceDashboard() {
  const [tb, setTb] = useState<any>(null)
  const [invoices, setInvoices] = useState<number | string>("—")
  const [payments, setPayments] = useState<number | string>("—")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      financeService.trialBalance().then((r) => r.data).catch(() => null),
      financeService.invoices.list({ limit: 1 }).then((r) => {
        const total = r.headers?.["x-total-count"]
        return total ? Number(total) : r.data?.length ?? "—"
      }).catch(() => "—"),
      financeService.payments.list({ limit: 1 }).then((r) => {
        const total = r.headers?.["x-total-count"]
        return total ? Number(total) : r.data?.length ?? "—"
      }).catch(() => "—"),
    ]).then(([tb, invoices, payments]) => {
      setTb(tb)
      setInvoices(invoices)
      setPayments(payments)
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

  const debit = tb?.total_debit ?? 0
  const credit = tb?.total_credit ?? 0
  const balance = Math.abs(debit - credit).toFixed(2)
  const balanced = debit === credit

  return (
    <div className="space-y-8 animate-fade-in">
      <AnimatedBackground />

      <FadeInUp>
        <PageHeader
        title="Finance Hub"
        description="Real-time financial overview and transaction monitoring."
      />
      </FadeInUp>

      <StaggerContainer>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StaggerItem><KPICard title="Total Debit" value={`$${debit.toLocaleString()}`} icon={TrendingDown} trend={{ value: "+12%", positive: false }} /></StaggerItem>
          <StaggerItem><KPICard title="Total Credit" value={`$${credit.toLocaleString()}`} icon={TrendingUp} trend={{ value: "+15%", positive: true }} accentColor="bg-emerald-500" /></StaggerItem>
          <StaggerItem><KPICard title="Accounts" value={tb?.rows?.length ?? 0} icon={Receipt} trend={{ value: "0", positive: true }} /></StaggerItem>
          <StaggerItem><KPICard title="Invoices" value={invoices} icon={FileText} trend={{ value: "+4", positive: true }} /></StaggerItem>
          <StaggerItem><KPICard title="Payments" value={payments} icon={Wallet} trend={{ value: "+2", positive: true }} /></StaggerItem>
          <StaggerItem><KPICard title="Balance" value={balanced ? "Balanced" : `$${balance}`} icon={Scale} trend={{ value: balanced ? "0" : "+1", positive: balanced }} accentColor={balanced ? "bg-emerald-500" : "bg-red-500"} /></StaggerItem>
        </div>
      </StaggerContainer>

      <FadeInUp delay={0.2}>
        <SectionHeader title="Financial Analytics" description="Revenue and expense trends over time" />
      </FadeInUp>

      <div className="grid gap-6 lg:grid-cols-7">
        <FadeInUp delay={0.3} className="lg:col-span-4">
          <Card shadow="colored">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <LineChart className="h-4 w-4 text-primary" /> Revenue vs Expenses
            </CardTitle>
            <CardDescription>Monthly comparison over the academic year</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" name="Revenue" strokeWidth={2} />
                <Area type="monotone" dataKey="expenses" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive) / 0.08)" name="Expenses" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
          </Card>
        </FadeInUp>

        <FadeInUp delay={0.4} className="lg:col-span-3">
          <Card shadow="default">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-4 w-4 text-primary" /> Recent Transactions
            </CardTitle>
            <CardDescription>Latest financial activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTransactions.map((t, i) => (
                <div key={i} className="flex items-start gap-3 border-b border-border/50 pb-3 last:border-0 last:pb-0">
                  <div className="rounded-full bg-primary/5 p-1.5 text-primary">
                    <CheckCircle className="h-3 w-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{t.action}</p>
                    <p className="text-xs text-muted-foreground">{t.amount} - {t.time}</p>
                  </div>
                  <StatusBadge status={t.badge === "success" ? "Success" : t.badge === "warning" ? "Pending" : t.badge === "purple" ? "Update" : "Info"} variant={t.badge} />
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
                <BarChart3 className="h-4 w-4 text-primary" /> Monthly Breakdown
            </CardTitle>
            <CardDescription>Revenue by month</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
          </Card>
        </FadeInUp>

        <FadeInUp delay={0.6} className="lg:col-span-3">
          <Card shadow="default">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-4 w-4 text-primary" /> Quick Actions
            </CardTitle>
            <CardDescription>Common finance tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <Link href="/finance/invoices">
                <Button variant="outline" className="w-full justify-between h-10">
                  <span className="flex items-center gap-2"><FileText className="h-4 w-4" /> Create Invoice</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </Link>
              <Link href="/finance/payments">
                <Button variant="outline" className="w-full justify-between h-10">
                  <span className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> Record Payment</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </Link>
              <Link href="/finance/reports">
                <Button variant="outline" className="w-full justify-between h-10">
                  <span className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> View Reports</span>
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
