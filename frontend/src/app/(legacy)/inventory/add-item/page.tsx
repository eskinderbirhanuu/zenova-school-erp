"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { inventoryService } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function AddItemPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: "", sku: "", category_id: "", supplier_id: "", quantity: 0, unit: "pcs", unit_price: 0, reorder_level: 0, description: "" })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try { await inventoryService.items.create(form); toast({ title: "Item added" }); router.push("/inventory") } catch { toast({ title: "Failed", variant: "destructive" }); setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/inventory"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-3xl font-bold">Add Inventory Item</h1>
      </div>
      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="grid gap-4 md:grid-cols-2 pt-6">
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Name *</label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">SKU</label><Input value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} /></div>
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Category ID</label><Input value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})} /></div>
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Supplier ID</label><Input value={form.supplier_id} onChange={e => setForm({...form, supplier_id: e.target.value})} /></div>
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Quantity</label><Input type="number" min="0" value={form.quantity} onChange={e => setForm({...form, quantity: Number(e.target.value)})} /></div>
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Unit</label>
              <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="pcs">Pieces</option><option value="kg">Kg</option><option value="ltr">Liters</option><option value="box">Box</option><option value="pack">Pack</option></select></div>
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Unit Price</label><Input type="number" step="0.01" min="0" value={form.unit_price} onChange={e => setForm({...form, unit_price: Number(e.target.value)})} /></div>
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Reorder Level</label><Input type="number" min="0" value={form.reorder_level} onChange={e => setForm({...form, reorder_level: Number(e.target.value)})} /></div>
            <div className="flex flex-col gap-1.5 md:col-span-2"><label className="text-sm font-medium">Description</label><Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
          </CardContent>
        </Card>
        <div className="mt-6 flex justify-end gap-3">
          <Link href="/inventory"><Button type="button" variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={loading}>{loading ? "Adding..." : "Add Item"}</Button>
        </div>
      </form>
    </div>
  )
}
