"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { inventoryService } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { Package, AlertTriangle, DollarSign, Truck } from "lucide-react"

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [name, setName] = useState(""); const [sku, setSku] = useState(""); const [qty, setQty] = useState(""); const [price, setPrice] = useState("")
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    inventoryService.items.list().then((r) => setItems(r.data)).catch(() => {})
    inventoryService.suppliers.list().then((r) => setSuppliers(r.data)).catch(() => {})
  }, [])

  const createItem = async () => {
    try {
      await inventoryService.items.create({ name, sku, quantity: Number(qty) || 0, unit_price: Number(price) || 0 })
      toast({ title: "Item created" }); setName(""); setSku(""); setQty(""); setPrice(""); setShowForm(false)
      inventoryService.items.list().then((r) => setItems(r.data))
    } catch (e: any) { toast({ title: "Error", description: e.response?.data?.detail, variant: "destructive" }) }
  }

  const lowStock = items.filter((i: any) => i.quantity <= i.min_quantity)
  const totalValue = items.reduce((sum: number, i: any) => sum + (i.quantity * i.unit_price), 0)

  const stats = [
    { title: "Total Items", value: items.length, icon: Package, color: "text-blue-600" },
    { title: "Low Stock", value: lowStock.length, icon: AlertTriangle, color: lowStock.length > 0 ? "text-red-600" : "text-green-600" },
    { title: "Stock Value", value: `$${totalValue.toLocaleString()}`, icon: DollarSign, color: "text-green-600" },
    { title: "Suppliers", value: suppliers.length, icon: Truck, color: "text-purple-600" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Inventory</h1>
        <Button onClick={() => setShowForm(!showForm)}><Package className="mr-2 h-4 w-4" />Add Item</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{s.title}</CardTitle>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{s.value}</div></CardContent>
          </Card>
        ))}
      </div>
      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Item</CardTitle></CardHeader>
          <CardContent className="flex gap-4 items-end flex-wrap">
            <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name" /></div>
            <div className="space-y-2"><Label>SKU</Label><Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU-001" /></div>
            <div className="space-y-2"><Label>Qty</Label><Input value={qty} onChange={(e) => setQty(e.target.value)} type="number" /></div>
            <div className="space-y-2"><Label>Unit Price</Label><Input value={price} onChange={(e) => setPrice(e.target.value)} type="number" step="0.01" /></div>
            <Button onClick={createItem}>Save</Button>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle>Inventory Items</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-3 font-medium">SKU</th><th className="pb-3 font-medium">Name</th><th className="pb-3 font-medium">Qty</th><th className="pb-3 font-medium">Price</th><th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i: any) => (
                <tr key={i.id} className="border-b last:border-0">
                  <td className="py-3">{i.sku}</td>
                  <td className="py-3">{i.name}</td>
                  <td className="py-3">{i.quantity}</td>
                  <td className="py-3">${i.unit_price}</td>
                  <td className="py-3">
                    {i.quantity <= i.min_quantity
                      ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Low Stock</span>
                      : <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">In Stock</span>}
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No items</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
