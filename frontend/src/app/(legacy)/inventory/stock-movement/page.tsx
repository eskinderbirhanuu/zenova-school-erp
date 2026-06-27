"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { inventoryService } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function StockMovementPage() {
  const router = useRouter()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ item_id: "", quantity: 0, movement_type: "in", reference: "", notes: "" })

  useEffect(() => {
    inventoryService.items.list({ limit: 100 }).then((r: any) => setItems(r.data)).catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.item_id || form.quantity <= 0) { toast({ title: "Item & quantity required", variant: "destructive" }); return }
    setLoading(true)
    try {
      await inventoryService.stockMovements.create(form)
      toast({ title: "Stock movement recorded" }); router.push("/inventory")
    } catch { toast({ title: "Failed", variant: "destructive" }); setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/inventory"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-3xl font-bold">Stock Movement</h1>
      </div>
      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="grid gap-4 md:grid-cols-2 pt-6">
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Item *</label>
              <select value={form.item_id} onChange={e => setForm({...form, item_id: e.target.value})} className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                <option value="">Select item</option>
                {items.map((i: any) => <option key={i.id} value={i.id}>{i.name} (Stock: {i.quantity})</option>)}
              </select></div>
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Type</label>
              <select value={form.movement_type} onChange={e => setForm({...form, movement_type: e.target.value})} className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="in">Stock In</option><option value="out">Stock Out</option>
              </select></div>
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Quantity *</label>
              <Input type="number" min="1" value={form.quantity} onChange={e => setForm({...form, quantity: Number(e.target.value)})} required /></div>
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Reference</label>
              <Input value={form.reference} onChange={e => setForm({...form, reference: e.target.value})} /></div>
            <div className="flex flex-col gap-1.5 md:col-span-2"><label className="text-sm font-medium">Notes</label>
              <Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
          </CardContent>
        </Card>
        <div className="mt-6 flex justify-end gap-3">
          <Link href="/inventory"><Button type="button" variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={loading}>{loading ? "Recording..." : "Record Movement"}</Button>
        </div>
      </form>
    </div>
  )
}
