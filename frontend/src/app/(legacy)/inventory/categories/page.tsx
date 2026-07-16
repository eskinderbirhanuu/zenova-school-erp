"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useInventoryCategories, useCreateInventoryCategory } from "@/hooks/queries"
import { toast } from "@/hooks/use-toast"
import { Plus } from "lucide-react"

export default function InventoryCategoriesPage() {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: "", description: "" })
  const { data: categories, isLoading } = useInventoryCategories()
  const createMutation = useCreateInventoryCategory()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try { await createMutation.mutateAsync(form as any); toast({ title: "Category created" }); setShowForm(false); setForm({ name: "", description: "" }) } catch { toast({ title: "Failed", variant: "destructive" }) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Inventory Categories</h1>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="mr-1 h-4 w-4" />{showForm ? "Cancel" : "New Category"}</Button>
      </div>
      {showForm && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleCreate} className="flex gap-4">
              <Input placeholder="Category name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="max-w-xs" />
              <Input placeholder="Description (optional)" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="max-w-sm" />
              <Button type="submit">Create</Button>
            </form>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-4 font-medium">Name</th><th className="p-4 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={2} className="p-8 text-center">Loading...</td></tr>}
              {!isLoading && (categories || []).map((c: any) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="p-4 font-medium">{c.name}</td><td className="p-4 text-muted-foreground">{c.description || "—"}</td>
                </tr>
              ))}
              {!isLoading && (categories || []).length === 0 && <tr><td colSpan={2} className="p-8 text-center text-muted-foreground">No categories</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
