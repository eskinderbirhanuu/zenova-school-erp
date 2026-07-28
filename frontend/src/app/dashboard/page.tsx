"use client"

import { useMemo } from "react"
import {
  useStudents, useJournalEntries, useTrialBalance,
  useAttendance, useContracts, useInventoryItems,
  useBooks, useCafeteriaOrders,
} from "@/hooks/queries"
import { formatCurrency } from "@/lib/currency"
import { Users, DollarSign, GraduationCap, BookOpen, TrendingUp, Activity, ShoppingCart, UserCheck } from "lucide-react"

import DashboardShell from "@/components/dashboard/dashboard-shell"
import { PageHeader } from "@/components/ui/page-header"
import { KPICard } from "@/components/ui/kpi-card"
import ChartsGrid from "@/components/dashboard/charts-grid"
import BarChartCard from "@/components/dashboard/bar-chart-card"
import AreaChartCard from "@/components/dashboard/area-chart-card"
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/3d/micro-animations"

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

  const moduleData = useMemo(() => [
    { name: "Students", value: Math.max(stats.students, 1) },
    { name: "Teachers", value: Math.max(stats.teachers, 1) },
    { name: "Inventory", value: Math.max(stats.inventory, 1) },
    { name: "Books", value: Math.max(stats.books, 1) },
    { name: "Orders", value: Math.max(stats.orders, 1) },
  ], [stats])

  return (
    <DashboardShell
      header={
        <FadeInUp>
          <PageHeader
            title="Dashboard"
            description={new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          />
        </FadeInUp>
      }
      widgets={[
        <StaggerContainer key="kpi">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StaggerItem><KPICard title="Students" value={stats.students} icon={Users} /></StaggerItem>
            <StaggerItem><KPICard title="Revenue" value={formatCurrency(stats.revenue)} icon={DollarSign} /></StaggerItem>
            <StaggerItem><KPICard title="Teachers" value={stats.teachers} icon={GraduationCap} /></StaggerItem>
            <StaggerItem><KPICard title="Attendance" value={stats.attendance} icon={UserCheck} /></StaggerItem>
            <StaggerItem><KPICard title="Inventory" value={stats.inventory} icon={ShoppingCart} /></StaggerItem>
            <StaggerItem><KPICard title="Books" value={stats.books} icon={BookOpen} /></StaggerItem>
            <StaggerItem><KPICard title="Orders" value={stats.orders} icon={Activity} /></StaggerItem>
          </div>
        </StaggerContainer>,
        <ChartsGrid key="charts">
          <AreaChartCard
            title="Financial Trend"
            description="Monthly debits and credits"
            data={journalData}
            xKey="month"
            series={[
              { dataKey: "debits", name: "Debits", color: "#3b82f6" },
              { dataKey: "credits", name: "Credits", color: "#10b981" },
            ]}
            icon={TrendingUp}
            height={300}
          />
          <BarChartCard
            title="Module Distribution"
            description="Entity counts across modules"
            data={moduleData}
            xKey="name"
            dataKey="value"
            icon={Activity}
            height={300}
          />
        </ChartsGrid>,
      ]}
    />
  )
}
