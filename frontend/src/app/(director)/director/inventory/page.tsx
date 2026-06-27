"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, AlertTriangle, CheckCircle, Loader2 } from "lucide-react"
import { inventoryService } from "@/services/api"
import { toast } from "@/hooks/use-toast"

export default function DirectorInventory() {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      inventoryService.items.list({ limit: 200 }).then(r => setItems(r.data || [])),
      inventoryService.categories.list().then(r => setCategories(r.data || [])),
    ]).catch(err => toast({ title: "Failed to load inventory", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [])

  const lowStock = items.filter((i: any) => i.quantity !== undefined && i.min_stock !== undefined && i.quantity <= i.min_stock)
  const outOfStock = items.filter((i: any) => i.quantity === 0)

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Inventory Overview</h1>
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Inventory Overview</h1>
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Items</CardTitle><Package className="h-4 w-4 text-blue-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{items.length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Low Stock</CardTitle><AlertTriangle className="h-4 w-4 text-orange-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{lowStock.length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Out of Stock</CardTitle><Package className="h-4 w-4 text-red-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{outOfStock.length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Categories</CardTitle><CheckCircle className="h-4 w-4 text-green-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{categories.length}</div></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-lg">Low Stock Items</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-4 font-medium">Item</th>
                <th className="p-4 font-medium">Category</th>
                <th className="p-4 font-medium">Current Stock</th>
                <th className="p-4 font-medium">Min Stock</th>
                <th className="p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">All items well stocked</td></tr>
              ) : lowStock.slice(0, 5).map((i: any, idx: number) => (
                <tr key={idx} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="p-4 font-medium">{i.name || "Item"}</td>
                  <td className="p-4 text-muted-foreground">{i.category_name || i.category_id || "—"}</td>
                  <td className="p-4">{i.quantity}</td>
                  <td className="p-4">{i.min_stock}</td>
                  <td className="p-4"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${i.quantity === 0 ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>{i.quantity === 0 ? "Critical" : "Low"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
