"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import api from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { Plus, FileText, ClipboardList, PackageCheck } from "lucide-react"

export default function ProcurementPage() {
  const [tab, setTab] = useState<"requests" | "orders" | "receipts">("requests")
  const [items, setItems] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ item_id: "", quantity: 0, expected_date: "", notes: "", vendor: "" })

  const load = async () => {
    setLoading(true)
    try {
      const endpoints: Record<string, string> = { requests: "/purchase-requests", orders: "/purchase-orders", receipts: "/goods-receipts" }
      const res = await api.get(endpoints[tab], { params: { limit: 50 } })
      setItems(res.data || [])
    } catch { setItems([]) }
    setLoading(false)
  }

  useEffect(() => { load() }, [tab])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const endpoints: Record<string, string> = { requests: "/purchase-requests", orders: "/purchase-orders", receipts: "/goods-receipts" }
      await api.post(endpoints[tab], form)
      toast({ title: `${tab.slice(0, -1)} created` }); setShowForm(false); setForm({ item_id: "", quantity: 0, expected_date: "", notes: "", vendor: "" }); load()
    } catch { toast({ title: "Failed", variant: "destructive" }) }
  }

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = { pending: "bg-yellow-100 text-yellow-700", approved: "bg-green-100 text-green-700", rejected: "bg-red-100 text-red-700", ordered: "bg-blue-100 text-blue-700", received: "bg-green-100 text-green-700" }
    return <span className={`rounded-full px-2 py-0.5 text-xs ${colors[status] || "bg-gray-100"}`}>{status || "draft"}</span>
  }

  const icons: Record<string, any> = { requests: FileText, orders: ClipboardList, receipts: PackageCheck }
  const Icon = icons[tab]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Procurement</h1>
        <div className="flex gap-2">
          <Button variant={tab === "requests" ? "default" : "outline"} size="sm" onClick={() => setTab("requests")}><FileText className="mr-1 h-4 w-4" />Requests</Button>
          <Button variant={tab === "orders" ? "default" : "outline"} size="sm" onClick={() => setTab("orders")}><ClipboardList className="mr-1 h-4 w-4" />Orders</Button>
          <Button variant={tab === "receipts" ? "default" : "outline"} size="sm" onClick={() => setTab("receipts")}><PackageCheck className="mr-1 h-4 w-4" />Receipts</Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="mr-1 h-4 w-4" />New</Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Icon className="h-5 w-5" /> New {tab.slice(0, -1).charAt(0).toUpperCase() + tab.slice(0, -1).slice(1)}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-3">
              <Input placeholder="Item ID" value={form.item_id} onChange={e => setForm({...form, item_id: e.target.value})} required />
              <Input placeholder="Quantity" type="number" min="1" value={form.quantity} onChange={e => setForm({...form, quantity: Number(e.target.value)})} required />
              <Input placeholder="Expected Date" type="date" value={form.expected_date} onChange={e => setForm({...form, expected_date: e.target.value})} />
              <Input placeholder="Vendor / Supplier" value={form.vendor} onChange={e => setForm({...form, vendor: e.target.value})} />
              <Input placeholder="Notes" className="md:col-span-2" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              <Button type="submit" className="md:col-start-3">Create</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-4 font-medium">Item</th><th className="p-4 font-medium">Qty</th><th className="p-4 font-medium">Date</th><th className="p-4 font-medium">Vendor</th><th className="p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="p-8 text-center">Loading...</td></tr>}
              {!loading && items.map((i: any) => (
                <tr key={i.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="p-4">{i.item_name || i.item_id}</td>
                  <td className="p-4">{i.quantity}</td>
                  <td className="p-4">{i.expected_date || i.created_at?.substring(0, 10)}</td>
                  <td className="p-4">{i.vendor || "—"}</td>
                  <td className="p-4">{statusBadge(i.status)}</td>
                </tr>
              ))}
              {!loading && items.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No {tab}</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
