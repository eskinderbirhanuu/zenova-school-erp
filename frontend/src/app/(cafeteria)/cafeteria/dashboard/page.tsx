"use client"

import { KPICard } from "@/components/ui/kpi-card"
import { SectionHeader } from "@/components/ui/section-header"
import { PageHeader } from "@/components/ui/page-header"
import { useCafeteriaProducts, useCafeteriaOrders } from "@/hooks/queries"
import { Coffee, ShoppingCart, DollarSign, CheckCircle, BarChart3, Plus, ClipboardCheck, Clock, TrendingUp } from "lucide-react"

import DashboardShell from "@/components/dashboard/dashboard-shell"
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/3d/micro-animations"
import BarChartCard from "@/components/dashboard/bar-chart-card"
import FeedCard from "@/components/dashboard/feed-card"
import PlaceholderCard from "@/components/dashboard/placeholder-card"
import QuickActionsWidget from "@/components/dashboard/widgets/quick-actions-widget"
import ChartsGrid from "@/components/dashboard/charts-grid"

const dailySales = [
  { day: "Mon", sales: 120 },
  { day: "Tue", sales: 145 },
  { day: "Wed", sales: 98 },
  { day: "Thu", sales: 167 },
  { day: "Fri", sales: 134 },
  { day: "Sat", sales: 89 },
]

const recentOrders = [
  { item: "Chicken Wrap", qty: 3, amount: "$12.00", time: "10 min ago", badge: "success" as const },
  { item: "Veggie Burger", qty: 2, amount: "$8.50", time: "25 min ago", badge: "success" as const },
  { item: "Fruit Salad", qty: 5, amount: "$15.00", time: "1 hour ago", badge: "info" as const },
  { item: "Smoothie", qty: 1, amount: "$4.25", time: "2 hours ago", badge: "warning" as const },
  { item: "Pizza Slice", qty: 4, amount: "$10.00", time: "3 hours ago", badge: "purple" as const },
]

export default function CafeteriaDashboard() {
  const { data: products } = useCafeteriaProducts({ limit: 1 })
  const { data: orders } = useCafeteriaOrders({ limit: 1 })

  return (
    <DashboardShell
      header={
        <FadeInUp>
          <PageHeader title="Cafeteria Hub" description="Sales, inventory, and order management." />
        </FadeInUp>
      }
      widgets={[
        <StaggerContainer key="kpi">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StaggerItem><KPICard title="Products" value={products?.length || 0} icon={Coffee} trend={{ value: "+5", positive: true }} /></StaggerItem>
            <StaggerItem><KPICard title="Today's Orders" value={orders?.length || 0} icon={ShoppingCart} trend={{ value: "+12", positive: true }} /></StaggerItem>
            <StaggerItem><KPICard title="Revenue" value="$0.00" icon={DollarSign} trend={{ value: "+8%", positive: true }} accentColor="bg-emerald-500" /></StaggerItem>
            <StaggerItem><KPICard title="POS Status" value="Ready" icon={CheckCircle} trend={{ value: "Online", positive: true }} /></StaggerItem>
          </div>
        </StaggerContainer>,
        <FadeInUp delay={0.2} key="section"><SectionHeader title="Sales Analytics" description="Daily sales and revenue trends" /></FadeInUp>,
        <ChartsGrid key="charts">
          <BarChartCard title="Daily Sales" description="Orders processed per day" data={dailySales} xKey="day" dataKey="sales" name="Orders" delay={0.3} icon={BarChart3} />
          <FeedCard
            title="Recent Orders"
            description="Latest transactions"
            items={recentOrders.map((o) => ({
              label: `${o.item} x${o.qty}`,
              detail: `${o.amount} — ${o.time}`,
              icon: Coffee,
              badge: {
                text: o.badge === "success" ? "Success" : o.badge === "warning" ? "Pending" : o.badge === "purple" ? "Update" : "Info",
                variant: o.badge,
              },
            }))}
            icon={ClipboardCheck}
            delay={0.4}
          />
        </ChartsGrid>,
        <ChartsGrid key="more">
          <PlaceholderCard title="Revenue Breakdown" description="By product category" icon={TrendingUp} />
          <QuickActionsWidget
            widgetId="cafeteria-quick-actions"
            title="Quick Actions"
            description="Common cafeteria tasks"
            icon={Clock}
            links={[
              { href: "/cafeteria/pos", label: "New Order", icon: Plus },
              { href: "/cafeteria/products", label: "Manage Products", icon: Coffee },
              { href: "/cafeteria/reports", label: "View Reports", icon: BarChart3 },
            ]}
          />
        </ChartsGrid>,
      ]}
    />
  )
}
