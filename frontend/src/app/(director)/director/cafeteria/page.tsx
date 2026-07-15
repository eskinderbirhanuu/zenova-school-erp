"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Coffee, DollarSign, ShoppingCart, Loader2 } from "lucide-react"
import { useCafeteriaProducts, useCafeteriaOrders } from "@/hooks/queries"

export default function DirectorCafeteria() {
  const { data: products, isLoading: productsLoading } = useCafeteriaProducts({ limit: 100 } as any)
  const { data: orders, isLoading: ordersLoading } = useCafeteriaOrders({ limit: 100 } as any)

  const loading = productsLoading || ordersLoading

  const productsList = products || []
  const ordersList = orders || []

  const totalRevenue = ordersList.reduce((s: number, o: any) => s + (o.total || o.amount || 0), 0)

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Cafeteria Overview</h1>
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Cafeteria Overview</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Orders</CardTitle><ShoppingCart className="h-4 w-4 text-blue-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{ordersList.length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Revenue</CardTitle><DollarSign className="h-4 w-4 text-green-600" /></CardHeader><CardContent><div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Products</CardTitle><Coffee className="h-4 w-4 text-purple-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{productsList.length}</div></CardContent></Card>
      </div>
    </div>
  )
}
