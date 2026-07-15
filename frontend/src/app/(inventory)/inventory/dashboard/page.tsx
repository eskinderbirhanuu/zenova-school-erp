"use client"

import { useState } from "react"
import { KPICard } from "@/components/ui/kpi-card"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { SectionHeader } from "@/components/ui/section-header"
import { PageHeader } from "@/components/ui/page-header"
import { useInventoryItems, useSuppliers } from "@/hooks/queries"
import Link from "next/link"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import {
  Package, AlertTriangle, Truck, DollarSign, Loader2, ArrowRight,
  BarChart3, Plus, ClipboardCheck, ListChecks, Warehouse
} from "lucide-react"

import { DynamicAnimatedBackground } from "@/components/3d/dynamic"
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/3d/micro-animations"

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
  const loading = false

  const itemArr = Array.isArray(items) ? items : []
  const totalItems = itemArr.length
  const lowStock = itemArr.filter((i: any) => (i.quantity ?? 0) <= (i.reorderLevel ?? 0)).length
  const val = itemArr.reduce((sum: number, i: any) => sum + (i.quantity ?? 0) * (i.unitPrice ?? 0), 0)
  const suppliers = Array.isArray(suppliersData) ? suppliersData.length : 0

  return (
    <div className="space-y-8 animate-fade-in">
      <DynamicAnimatedBackground />

      <FadeInUp>
        <PageHeader
        title="Inventory Hub"
        description="Stock levels, suppliers, and asset management."
      />
      </FadeInUp>

      <StaggerContainer>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StaggerItem><KPICard title="Total Items" value={totalItems} icon={Package} trend={{ value: "+15", positive: true }} /></StaggerItem>
          <StaggerItem><KPICard title="Low Stock Items" value={lowStock} icon={AlertTriangle} trend={{ value: "-2", positive: true }} accentColor="bg-red-500" /></StaggerItem>
          <StaggerItem><KPICard title="Suppliers" value={suppliers} icon={Truck} trend={{ value: "+1", positive: true }} /></StaggerItem>
          <StaggerItem><KPICard title="Stock Value" value={`$${val.toLocaleString()}`} icon={DollarSign} trend={{ value: "+5%", positive: true }} accentColor="bg-emerald-500" /></StaggerItem>
        </div>
      </StaggerContainer>

      <FadeInUp delay={0.2}>
        <SectionHeader title="Stock Analytics" description="Inventory levels and trends" />
      </FadeInUp>

      <div className="grid gap-6 lg:grid-cols-7">
        <FadeInUp delay={0.3} className="lg:col-span-4">
          <Card shadow="colored">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-primary" /> Stock by Category
            </CardTitle>
            <CardDescription>Item count per category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stockLevels}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="qty" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Items" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
          </Card>
        </FadeInUp>

        <FadeInUp delay={0.4} className="lg:col-span-3">
          <Card shadow="default">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ListChecks className="h-4 w-4 text-primary" /> Recent Activity
            </CardTitle>
            <CardDescription>Latest inventory events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((a, i) => (
                <div key={i} className="flex items-start gap-3 border-b border-border/50 pb-3 last:border-0 last:pb-0">
                  <div className="rounded-full bg-primary/5 p-1.5 text-primary">
                    <Package className="h-3 w-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{a.action}</p>
                    <p className="text-xs text-muted-foreground">{a.item} x{a.qty} - {a.time}</p>
                  </div>
                  <StatusBadge status={a.badge === "success" ? "Success" : a.badge === "warning" ? "Pending" : a.badge === "purple" ? "Update" : "Info"} variant={a.badge} />
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
                <Warehouse className="h-4 w-4 text-primary" /> Stock Movements
            </CardTitle>
            <CardDescription>Recent transfers and adjustments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
              Stock movement chart coming soon
            </div>
          </CardContent>
          </Card>
        </FadeInUp>

        <FadeInUp delay={0.6} className="lg:col-span-3">
          <Card shadow="default">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardCheck className="h-4 w-4 text-primary" /> Quick Actions
            </CardTitle>
            <CardDescription>Common inventory tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <Link href="/inventory/items">
                <Button variant="outline" className="w-full justify-between h-10">
                  <span className="flex items-center gap-2"><Plus className="h-4 w-4" /> Add Item</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </Link>
              <Link href="/inventory/transfers">
                <Button variant="outline" className="w-full justify-between h-10">
                  <span className="flex items-center gap-2"><Truck className="h-4 w-4" /> Transfer Stock</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </Link>
              <Link href="/inventory/purchases">
                <Button variant="outline" className="w-full justify-between h-10">
                  <span className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> New Purchase</span>
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
