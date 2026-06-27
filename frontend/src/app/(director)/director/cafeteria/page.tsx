"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Coffee, DollarSign, ShoppingCart, Loader2 } from "lucide-react"
import { cafeteriaService } from "@/services/api"
import { toast } from "@/hooks/use-toast"

export default function DirectorCafeteria() {
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      cafeteriaService.products.list({ limit: 100 }).then(r => setProducts(r.data || [])),
      cafeteriaService.orders.list({ limit: 100 }).then(r => setOrders(r.data || [])),
    ]).catch(err => toast({ title: "Failed to load cafeteria data", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [])

  const totalRevenue = orders.reduce((s: number, o: any) => s + (o.total || o.amount || 0), 0)

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
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Orders</CardTitle><ShoppingCart className="h-4 w-4 text-blue-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{orders.length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Revenue</CardTitle><DollarSign className="h-4 w-4 text-green-600" /></CardHeader><CardContent><div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Products</CardTitle><Coffee className="h-4 w-4 text-purple-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{products.length}</div></CardContent></Card>
      </div>
    </div>
  )
}
