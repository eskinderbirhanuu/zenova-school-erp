"use client"

import { useEffect, useState } from "react"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cafeteriaService } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { Plus } from "lucide-react"

export default function CafeteriaProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: "", price: "", category: "", description: "" })

  const load = () => {
    setLoading(true)
    cafeteriaService.products.list({ limit: 100 }).then((r: any) => setProducts(r.data)).catch(() => toast({ title: "Failed to load products", variant: "destructive" })).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.name || !form.price) { toast({ title: "Name and price are required", variant: "destructive" }); return }
    try {
      await cafeteriaService.products.create({ name: form.name, price: Number(form.price), category: form.category || undefined, description: form.description || undefined })
      toast({ title: "Product created" }); setShowForm(false); setForm({ name: "", price: "", category: "", description: "" }); load()
    } catch { toast({ title: "Failed to create product", variant: "destructive" }) }
  }

  return (
    <div className="space-y-6">
      <GenericListPage
        title="Products" description="Manage cafeteria products and pricing"
        columns={[
          { key: "name", header: "Name", render: (p) => <span className="font-medium">{p.name}</span> },
          { key: "category", header: "Category", render: (p) => <span>{p.category || "\u2014"}</span> },
          { key: "price", header: "Price", render: (p) => <span className="font-mono">${Number(p.price || p.unit_price || 0).toFixed(2)}</span> },
          { key: "desc", header: "Description", render: (p) => <span className="text-muted-foreground">{p.description || "\u2014"}</span> },
        ]}
        data={products} keyExtractor={(p) => p.id}
        loading={loading} emptyTitle="No products found"
        actions={<Button onClick={() => setShowForm(!showForm)}><Plus className="mr-2 h-4 w-4" />Add Product</Button>}
      />
      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Product</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Input placeholder="Product Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input type="number" step="0.01" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <Input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="sm:col-span-2 flex gap-2"><Button onClick={handleCreate}>Create</Button><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button></div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
