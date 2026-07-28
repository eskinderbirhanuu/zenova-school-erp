"use client"

import { KPICard } from "@/components/ui/kpi-card"
import { SectionHeader } from "@/components/ui/section-header"
import { PageHeader } from "@/components/ui/page-header"
import { useInventoryItems, useSuppliers } from "@/hooks/queries"
import { Package, AlertTriangle, Truck, DollarSign, BarChart3, Plus, ClipboardCheck, ListChecks, Warehouse } from "lucide-react"

import DashboardShell from "@/components/dashboard/dashboard-shell"
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/3d/micro-animations"
import { formatCurrency } from "@/lib/currency"
import BarChartCard from "@/components/dashboard/bar-chart-card"
import FeedCard from "@/components/dashboard/feed-card"
import PlaceholderCard from "@/components/dashboard/placeholder-card"
import QuickActionsWidget from "@/components/dashboard/widgets/quick-actions-widget"
import ChartsGrid from "@/components/dashboard/charts-grid"

const stockLevels = [
  { category: "Stationery", qty: 450 },
  { category: "Electronics", qty: 120 },
  { category: "Furniture", qty: 85 },
  { category: "Lab", qty: 200 },
  { category: "Sports", qty: 150 },
]

const recentActivity = [
  { action: "Stock received", item: "Reams of paper", qty: "50", time: "10 min ago", badge: "success" as const },
  { action: "Transfer sent", item: "Projectors", qty: "2", time: "25 min ago", badge: "info" as const },
  { action: "Low stock alert", item: "Whiteboard markers", qty: "3", time: "1 hour ago", badge: "warning" as const },
  { action: "Purchase ordered", item: "Lab chemicals", qty: "10", time: "2 hours ago", badge: "purple" as const },
  { action: "Asset assigned", item: "Laptop", qty: "1", time: "3 hours ago", badge: "success" as const },
]

export default function InventoryDashboard() {
  const { data: items } = useInventoryItems({ limit: 100 })
  const { data: suppliersData } = useSuppliers()

  const itemArr = Array.isArray(items) ? items : []
  const totalItems = itemArr.length
  const lowStock = itemArr.filter((i: any) => (i.quantity ?? 0) <= (i.reorderLevel ?? 0)).length
  const val = itemArr.reduce((sum: number, i: any) => sum + (i.quantity ?? 0) * (i.unitPrice ?? 0), 0)
  const suppliers = Array.isArray(suppliersData) ? suppliersData.length : 0

  return (
    <DashboardShell
      header={
        <FadeInUp>
          <PageHeader title="Inventory Hub" description="Stock levels, suppliers, and asset management." />
        </FadeInUp>
      }
      widgets={[
        <StaggerContainer key="kpi">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StaggerItem><KPICard title="Total Items" value={totalItems} icon={Package} trend={{ value: "+15", positive: true }} /></StaggerItem>
            <StaggerItem><KPICard title="Low Stock Items" value={lowStock} icon={AlertTriangle} trend={{ value: "-2", positive: true }} accentColor="bg-red-500" /></StaggerItem>
            <StaggerItem><KPICard title="Suppliers" value={suppliers} icon={Truck} trend={{ value: "+1", positive: true }} /></StaggerItem>
            <StaggerItem><KPICard title="Stock Value" value={formatCurrency(val)} icon={DollarSign} trend={{ value: "+5%", positive: true }} accentColor="bg-emerald-500" /></StaggerItem>
          </div>
        </StaggerContainer>,
        <FadeInUp delay={0.2} key="section"><SectionHeader title="Stock Analytics" description="Inventory levels and trends" /></FadeInUp>,
        <ChartsGrid key="charts">
          <BarChartCard title="Stock by Category" description="Item count per category" data={stockLevels} xKey="category" dataKey="qty" name="Items" delay={0.3} icon={BarChart3} />
          <FeedCard
            title="Recent Activity"
            description="Latest inventory events"
            items={recentActivity.map((a) => ({
              label: a.action,
              detail: `${a.item} x${a.qty} — ${a.time}`,
              icon: Package,
              badge: {
                text: a.badge === "success" ? "Success" : a.badge === "warning" ? "Pending" : a.badge === "purple" ? "Update" : "Info",
                variant: a.badge,
              },
            }))}
            icon={ListChecks}
            delay={0.4}
          />
        </ChartsGrid>,
        <ChartsGrid key="more">
          <PlaceholderCard title="Stock Movements" description="Recent transfers and adjustments" icon={Warehouse} />
          <QuickActionsWidget
            title="Quick Actions"
            description="Common inventory tasks"
            icon={ClipboardCheck}
            links={[
              { href: "/inventory/items", label: "Add Item", icon: Plus },
              { href: "/inventory/transfers", label: "Transfer Stock", icon: Truck },
              { href: "/inventory/purchases", label: "New Purchase", icon: DollarSign },
            ]}
          />
        </ChartsGrid>,
      ]}
    />
  )
}
