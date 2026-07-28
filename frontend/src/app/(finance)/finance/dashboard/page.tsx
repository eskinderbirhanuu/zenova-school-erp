"use client"

import { useState } from "react"
import { KPICard } from "@/components/ui/kpi-card"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { SectionHeader } from "@/components/ui/section-header"
import { PageHeader } from "@/components/ui/page-header"
import { useTrialBalance, useInvoices, usePayments } from "@/hooks/queries"
import {
  TrendingDown, TrendingUp, Receipt, FileText, Wallet, Scale,
  DollarSign
} from "lucide-react"
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/3d/micro-animations"
import { revenueData, recentTransactions, cashFlowFunnel, receivableAging } from "@/config/chart-data"
import { formatCurrency } from "@/lib/currency"
import DashboardShell from "@/components/dashboard/dashboard-shell"
import RevenueChartWidget from "@/components/dashboard/widgets/revenue-chart-widget"
import FeedCard from "@/components/dashboard/feed-card"
import FunnelCard from "@/components/dashboard/funnel-card"
import AlertCenterCard from "@/components/dashboard/alert-center-card"

type Period = "this-month" | "last-month" | "this-quarter" | "this-year"

const periodLabels: Record<Period, string> = {
  "this-month": "This Month",
  "last-month": "Last Month",
  "this-quarter": "This Quarter",
  "this-year": "This Year",
}

const periodOrder: Period[] = ["this-month", "last-month", "this-quarter", "this-year"]

const actionAlerts = [
  { label: "Pending Invoices", count: 12, variant: "warning" as const },
  { label: "Overdue Payments", count: 4, variant: "destructive" as const },
  { label: "Budget Warnings", count: 3, variant: "info" as const },
]

const feedItems = recentTransactions.map(t => ({
  label: t.action,
  detail: t.amount,
  time: t.time,
  badge: { text: t.badge === "success" ? "Success" : t.badge === "warning" ? "Pending" : "Info", variant: t.badge }
}))

const cashFlowFunnelStages = cashFlowFunnel.map(f => ({
  name: f.label,
  count: f.value,
  color: f.color
}))

const alertItems = actionAlerts.map(a => ({
  message: `${a.label}: ${a.count} items`,
  severity: a.variant as "warning" | "destructive" | "info",
  time: "Active"
}))

function PeriodSelector({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-border/60 bg-muted/30 p-0.5" role="radiogroup" aria-label="Report period">
      {periodOrder.map((p) => (
        <button
          key={p} role="radio" aria-checked={value === p} onClick={() => onChange(p)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
            value === p ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >{periodLabels[p]}</button>
      ))}
    </div>
  )
}

export default function FinanceDashboard() {
  const [period, setPeriod] = useState<Period>("this-month")
  const { data: tb, isLoading: tbLoading } = useTrialBalance()
  const { data: invoices, isLoading: invLoading } = useInvoices({ limit: 200 } as any)
  const { data: payments, isLoading: payLoading } = usePayments({ limit: 200 } as any)

  const loading = tbLoading || invLoading || payLoading
  const invoicesList = invoices || []
  const paymentsList = payments || []
  const trialBalance = tb as any
  const debit = trialBalance?.total_debit ?? 0
  const credit = trialBalance?.total_credit ?? 0
  const balance = Math.abs(debit - credit).toFixed(2)
  const balanced = debit === credit
  const totalReceivable = receivableAging.reduce((s, a) => s + a.value, 0)

  return (
    <DashboardShell
      isLoading={loading}
      header={
        <PageHeader
          title="Finance Hub"
          description="Real-time financial overview and transaction monitoring."
          actions={<PeriodSelector value={period} onChange={setPeriod} />}
        />
      }
      widgets={[
        <StaggerContainer key="kpi">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StaggerItem><KPICard title="Total Debit" value={formatCurrency(debit)} icon={TrendingDown} trend={{ value: "+12%", positive: false }} sparklineData={[32000, 34000, 31000, 38000, 36000, 39000, 42000, 40000, 43000, 45000]} /></StaggerItem>
            <StaggerItem><KPICard title="Total Credit" value={formatCurrency(credit)} icon={TrendingUp} trend={{ value: "+15%", positive: true }} accentColor="bg-emerald-500" sparklineData={[28000, 30000, 33000, 32000, 35000, 37000, 39000, 41000, 44000, 46000]} /></StaggerItem>
            <StaggerItem><KPICard title="Accounts" value={trialBalance?.rows?.length ?? 0} icon={Receipt} trend={{ value: "0", positive: true }} sparklineData={[12, 12, 13, 13, 14, 14, 14, 15, 15, 15]} /></StaggerItem>
            <StaggerItem><KPICard title="Invoices" value={invoicesList.length} icon={FileText} trend={{ value: "+4", positive: true }} sparklineData={[18, 22, 20, 25, 24, 28, 30, 27, 32, 35]} /></StaggerItem>
            <StaggerItem><KPICard title="Payments" value={paymentsList.length} icon={Wallet} trend={{ value: "+2", positive: true }} sparklineData={[14, 16, 15, 18, 20, 19, 22, 24, 23, 26]} /></StaggerItem>
            <StaggerItem><KPICard title="Balance" value={balanced ? "Balanced" : formatCurrency(Number(balance))} icon={Scale} trend={{ value: balanced ? "0" : "+1", positive: balanced }} accentColor={balanced ? "bg-emerald-500" : "bg-red-500"} sparklineData={[500, 420, 600, 350, 800, 200, 150, 0, 100, 0]} /></StaggerItem>
          </div>
        </StaggerContainer>,
        <FadeInUp delay={0.2} key="section"><SectionHeader title="Financial Analytics" description="Revenue and expense trends over time" /></FadeInUp>,
        <div key="mid" className="grid gap-6 lg:grid-cols-7">
          <div className="lg:col-span-4"><RevenueChartWidget widgetId="finance-revenue-chart" /></div>
          <FeedCard title="Recent Transactions" description="Latest financial activities" items={feedItems} delay={0.4} />
        </div>,
        <div key="bottom" className="grid gap-6 lg:grid-cols-7">
          <FunnelCard title="Cash Flow Funnel" description="Revenue to net conversion pipeline" stages={cashFlowFunnelStages} delay={0.5} />
          <AlertCenterCard title="Action Alerts" description="Items requiring attention" alerts={alertItems} delay={0.6} />
        </div>,
        <FadeInUp delay={0.7} key="receivables">
          <Card shadow="default">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><DollarSign className="h-4 w-4 text-primary" /> Outstanding Receivables</CardTitle><CardDescription>Aging breakdown of unpaid receivables</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-4" aria-label="Outstanding receivables aging breakdown">
                {receivableAging.map((item) => {
                  const pct = (item.value / totalReceivable) * 100
                  return (
                    <div key={item.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-muted-foreground">{item.label}</span>
                        <span className="font-semibold tabular-nums">{formatCurrency(item.value)}</span>
                      </div>
                      <div className="h-3 rounded-full bg-muted/30 overflow-hidden" role="meter" aria-valuenow={item.value} aria-valuemin={0} aria-valuemax={totalReceivable} aria-label={`${item.label} receivables: ${formatCurrency(item.value)}`}>
                        <div className={`h-full rounded-full ${item.color} transition-all duration-700 ease-out`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
                <div className="flex items-center justify-between border-t border-border/50 pt-3 text-sm">
                  <span className="font-semibold">Total Outstanding</span>
                  <span className="text-lg font-bold tabular-nums">{formatCurrency(totalReceivable)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeInUp>,
      ]}
    />
  )
}
