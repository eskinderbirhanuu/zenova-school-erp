"use client"

import { useEffect, useState } from "react"
import { useReducedMotion } from "framer-motion"
import { KPICard } from "@/components/ui/kpi-card"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { SectionHeader } from "@/components/ui/section-header"
import { PageHeader } from "@/components/ui/page-header"
import { financeService } from "@/services/api"
import {
  TrendingDown, TrendingUp, Receipt, FileText, Wallet, Scale,
  Loader2, LineChart, DollarSign, CheckCircle, AlertTriangle,
  Clock, ArrowRight, Filter
} from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

import { AnimatedBackground } from "@/components/3d/animated-background"
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/3d/micro-animations"

type Period = "this-month" | "last-month" | "this-quarter" | "this-year"

const periodLabels: Record<Period, string> = {
  "this-month": "This Month",
  "last-month": "Last Month",
  "this-quarter": "This Quarter",
  "this-year": "This Year",
}

const periodOrder: Period[] = ["this-month", "last-month", "this-quarter", "this-year"]

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

const actionAlerts = [
  { label: "Pending Invoices", count: 12, variant: "warning" as const, href: "/finance/invoices?status=pending", icon: FileText },
  { label: "Overdue Payments", count: 4, variant: "destructive" as const, href: "/finance/payments?status=overdue", icon: Clock },
  { label: "Budget Warnings", count: 3, variant: "info" as const, href: "/finance/budgets?alert=true", icon: AlertTriangle },
]

const cashFlowFunnel = [
  { label: "Revenue", value: 82000, color: "bg-primary" },
  { label: "Collections", value: 67500, color: "bg-emerald-500" },
  { label: "Net", value: 37000, color: "bg-sky-500" },
]

const receivableAging = [
  { label: "Current", value: 24500, color: "bg-emerald-500" },
  { label: "30 Days", value: 12800, color: "bg-sky-500" },
  { label: "60 Days", value: 6400, color: "bg-amber-500" },
  { label: "90+ Days", value: 3100, color: "bg-red-500" },
]

function PeriodSelector({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div
      className="inline-flex rounded-lg border border-border/60 bg-muted/30 p-0.5"
      role="radiogroup"
      aria-label="Report period"
    >
      {periodOrder.map((p) => (
        <button
          key={p}
          role="radio"
          aria-checked={value === p}
          onClick={() => onChange(p)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
            value === p
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {periodLabels[p]}
        </button>
      ))}
    </div>
  )
}

function CashFlowFunnel() {
  const max = Math.max(...cashFlowFunnel.map((d) => d.value))
  return (
    <div className="space-y-4" aria-label="Cash flow funnel">
      {cashFlowFunnel.map((item) => {
        const pct = (item.value / max) * 100
        return (
          <div key={item.label} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-muted-foreground">{item.label}</span>
              <span className="font-semibold tabular-nums">${item.value.toLocaleString()}</span>
            </div>
            <div
              className="h-8 rounded-lg bg-muted/30 overflow-hidden"
              role="meter"
              aria-valuenow={item.value}
              aria-valuemin={0}
              aria-valuemax={max}
              aria-label={`${item.label}: $${item.value.toLocaleString()}`}
            >
              <div
                className={`h-full rounded-lg ${item.color} transition-all duration-700 ease-out`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function OutstandingReceivables() {
  const total = receivableAging.reduce((s, a) => s + a.value, 0)
  return (
    <div className="space-y-4" aria-label="Outstanding receivables aging breakdown">
      {receivableAging.map((item) => {
        const pct = (item.value / total) * 100
        return (
          <div key={item.label} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-muted-foreground">{item.label}</span>
              <span className="font-semibold tabular-nums">${item.value.toLocaleString()}</span>
            </div>
            <div
              className="h-3 rounded-full bg-muted/30 overflow-hidden"
              role="meter"
              aria-valuenow={item.value}
              aria-valuemin={0}
              aria-valuemax={total}
              aria-label={`${item.label} receivables: $${item.value.toLocaleString()}`}
            >
              <div
                className={`h-full rounded-full ${item.color} transition-all duration-700 ease-out`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
      <div className="flex items-center justify-between border-t border-border/50 pt-3 text-sm">
        <span className="font-semibold">Total Outstanding</span>
        <span className="text-lg font-bold tabular-nums">${total.toLocaleString()}</span>
      </div>
    </div>
  )
}

export default function FinanceDashboard() {
  const prefersReducedMotion = useReducedMotion()
  const [period, setPeriod] = useState<Period>("this-month")
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
          actions={<PeriodSelector value={period} onChange={setPeriod} />}
        />
      </FadeInUp>

      <StaggerContainer>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StaggerItem>
            <KPICard
              title="Total Debit"
              value={`$${debit.toLocaleString()}`}
              icon={TrendingDown}
              trend={{ value: "+12%", positive: false }}
              sparklineData={[32000, 34000, 31000, 38000, 36000, 39000, 42000, 40000, 43000, 45000]}
            />
          </StaggerItem>
          <StaggerItem>
            <KPICard
              title="Total Credit"
              value={`$${credit.toLocaleString()}`}
              icon={TrendingUp}
              trend={{ value: "+15%", positive: true }}
              accentColor="bg-emerald-500"
              sparklineData={[28000, 30000, 33000, 32000, 35000, 37000, 39000, 41000, 44000, 46000]}
            />
          </StaggerItem>
          <StaggerItem>
            <KPICard
              title="Accounts"
              value={tb?.rows?.length ?? 0}
              icon={Receipt}
              trend={{ value: "0", positive: true }}
              sparklineData={[12, 12, 13, 13, 14, 14, 14, 15, 15, 15]}
            />
          </StaggerItem>
          <StaggerItem>
            <KPICard
              title="Invoices"
              value={invoices}
              icon={FileText}
              trend={{ value: "+4", positive: true }}
              sparklineData={[18, 22, 20, 25, 24, 28, 30, 27, 32, 35]}
            />
          </StaggerItem>
          <StaggerItem>
            <KPICard
              title="Payments"
              value={payments}
              icon={Wallet}
              trend={{ value: "+2", positive: true }}
              sparklineData={[14, 16, 15, 18, 20, 19, 22, 24, 23, 26]}
            />
          </StaggerItem>
          <StaggerItem>
            <KPICard
              title="Balance"
              value={balanced ? "Balanced" : `$${balance}`}
              icon={Scale}
              trend={{ value: balanced ? "0" : "+1", positive: balanced }}
              accentColor={balanced ? "bg-emerald-500" : "bg-red-500"}
              sparklineData={[500, 420, 600, 350, 800, 200, 150, 0, 100, 0]}
            />
          </StaggerItem>
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
                <Filter className="h-4 w-4 text-primary" /> Cash Flow Funnel
              </CardTitle>
              <CardDescription>Revenue to net conversion pipeline</CardDescription>
            </CardHeader>
            <CardContent>
              <CashFlowFunnel />
            </CardContent>
          </Card>
        </FadeInUp>

        <FadeInUp delay={0.6} className="lg:col-span-3">
          <Card shadow="default">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Action Alerts
              </CardTitle>
              <CardDescription>Items requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {actionAlerts.map((alert) => {
                  const AlertIcon = alert.icon
                  return (
                    <a
                      key={alert.label}
                      href={alert.href}
                      className="flex items-center gap-3 rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`${alert.label}: ${alert.count} items`}
                    >
                      <div className={`rounded-lg p-2 ${
                        alert.variant === "destructive"
                          ? "bg-red-500/10 text-red-500"
                          : alert.variant === "warning"
                          ? "bg-amber-500/10 text-amber-500"
                          : "bg-blue-500/10 text-blue-500"
                      }`}>
                        <AlertIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{alert.label}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold tabular-nums">{alert.count}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </a>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </FadeInUp>
      </div>

      <FadeInUp delay={0.7}>
        <Card shadow="default">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4 text-primary" /> Outstanding Receivables
            </CardTitle>
            <CardDescription>Aging breakdown of unpaid receivables</CardDescription>
          </CardHeader>
          <CardContent>
            <OutstandingReceivables />
          </CardContent>
        </Card>
      </FadeInUp>
    </div>
  )
}
