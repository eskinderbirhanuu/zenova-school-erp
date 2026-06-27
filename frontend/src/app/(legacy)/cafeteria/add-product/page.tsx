"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cafeteriaService } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function AddProductPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: "", price: 0, category: "", stock: 0, unit: "pcs", description: "" })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try { await cafeteriaService.products.create(form); toast({ title: "Product added" }); router.push("/cafeteria") } catch { toast({ title: "Failed", variant: "destructive" }); setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/cafeteria"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-3xl font-bold">Add Cafeteria Product</h1>
      </div>
      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="grid gap-4 md:grid-cols-2 pt-6">
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Name *</label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Price *</label><Input type="number" step="0.01" min="0" value={form.price} onChange={e => setForm({...form, price: Number(e.target.value)})} required /></div>
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Category</label><Input value={form.category} onChange={e => setForm({...form, category: e.target.value})} /></div>
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Stock</label><Input type="number" min="0" value={form.stock} onChange={e => setForm({...form, stock: Number(e.target.value)})} /></div>
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Unit</label>
              <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="pcs">Pieces</option><option value="plate">Plate</option><option value="cup">Cup</option><option value="bowl">Bowl</option></select></div>
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Description</label><Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
          </CardContent>
        </Card>
        <div className="mt-6 flex justify-end gap-3">
          <Link href="/cafeteria"><Button type="button" variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={loading}>{loading ? "Adding..." : "Add Product"}</Button>
        </div>
      </form>
    </div>
  )
}
