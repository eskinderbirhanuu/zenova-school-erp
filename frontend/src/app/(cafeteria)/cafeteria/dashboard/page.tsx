"use client"

import { useEffect, useState } from "react"
import { KPICard } from "@/components/ui/kpi-card"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { SectionHeader } from "@/components/ui/section-header"
import { PageHeader } from "@/components/ui/page-header"
import { useCafeteriaProducts, useCafeteriaOrders } from "@/hooks/queries"
import Link from "next/link"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import {
  Coffee, ShoppingCart, DollarSign, CheckCircle, Loader2, ArrowRight,
  BarChart3, Plus, ClipboardCheck, Clock, TrendingUp
} from "lucide-react"

import { DynamicAnimatedBackground } from "@/components/3d/dynamic"
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/3d/micro-animations"

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
  const [stats, setStats] = useState({ products: "—", orders: "—" })
  const { data: products } = useCafeteriaProducts({ limit: 1 })
  const { data: orders } = useCafeteriaOrders({ limit: 1 })
  const loading = false

  return (
    <div className="space-y-8 animate-fade-in">
      <DynamicAnimatedBackground />

      <FadeInUp>
        <PageHeader
        title="Cafeteria Hub"
        description="Sales, inventory, and order management."
      />
      </FadeInUp>

      <StaggerContainer>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StaggerItem><KPICard title="Products" value={products?.length || 0} icon={Coffee} trend={{ value: "+5", positive: true }} /></StaggerItem>
          <StaggerItem><KPICard title="Today's Orders" value={orders?.length || 0} icon={ShoppingCart} trend={{ value: "+12", positive: true }} /></StaggerItem>
          <StaggerItem><KPICard title="Revenue" value="$0.00" icon={DollarSign} trend={{ value: "+8%", positive: true }} accentColor="bg-emerald-500" /></StaggerItem>
          <StaggerItem><KPICard title="POS Status" value="Ready" icon={CheckCircle} trend={{ value: "Online", positive: true }} /></StaggerItem>
        </div>
      </StaggerContainer>

      <FadeInUp delay={0.2}>
        <SectionHeader title="Sales Analytics" description="Daily sales and revenue trends" />
      </FadeInUp>

      <div className="grid gap-6 lg:grid-cols-7">
        <FadeInUp delay={0.3} className="lg:col-span-4">
          <Card shadow="colored">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-primary" /> Daily Sales
            </CardTitle>
            <CardDescription>Orders processed per day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailySales}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
          </Card>
        </FadeInUp>

        <FadeInUp delay={0.4} className="lg:col-span-3">
          <Card shadow="default">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardCheck className="h-4 w-4 text-primary" /> Recent Orders
            </CardTitle>
            <CardDescription>Latest transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentOrders.map((o, i) => (
                <div key={i} className="flex items-start gap-3 border-b border-border/50 pb-3 last:border-0 last:pb-0">
                  <div className="rounded-full bg-primary/5 p-1.5 text-primary">
                    <Coffee className="h-3 w-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{o.item} x{o.qty}</p>
                    <p className="text-xs text-muted-foreground">{o.amount} - {o.time}</p>
                  </div>
                  <StatusBadge status={o.badge === "success" ? "Success" : o.badge === "warning" ? "Pending" : o.badge === "purple" ? "Update" : "Info"} variant={o.badge} />
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
                <TrendingUp className="h-4 w-4 text-primary" /> Revenue Breakdown
            </CardTitle>
            <CardDescription>By product category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
              Revenue breakdown chart coming soon
            </div>
          </CardContent>
          </Card>
        </FadeInUp>

        <FadeInUp delay={0.6} className="lg:col-span-3">
          <Card shadow="default">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-primary" /> Quick Actions
            </CardTitle>
            <CardDescription>Common cafeteria tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <Link href="/cafeteria/pos">
                <Button variant="outline" className="w-full justify-between h-10">
                  <span className="flex items-center gap-2"><Plus className="h-4 w-4" /> New Order</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </Link>
              <Link href="/cafeteria/products">
                <Button variant="outline" className="w-full justify-between h-10">
                  <span className="flex items-center gap-2"><Coffee className="h-4 w-4" /> Manage Products</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </Link>
              <Link href="/cafeteria/reports">
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
