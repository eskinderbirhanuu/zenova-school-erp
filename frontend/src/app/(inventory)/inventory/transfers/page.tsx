"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRightLeft, Clock, Truck, CheckCircle2, Loader2 } from "lucide-react"
import { KPICard } from "@/components/ui/kpi-card"
import { inventoryService } from "@/services/api"
import { toast } from "@/hooks/use-toast"

const statusColor: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700", in_transit: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700",
}

export default function InventoryTransfersPage() {
  const [transfers, setTransfers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    inventoryService.stockMovements.list({ limit: 200 })
      .then(res => setTransfers(res.data || []))
      .catch(err => toast({ title: "Failed to load transfers", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [])

  const pending = transfers.filter((t: any) => t.status === "pending").length
  const inTransit = transfers.filter((t: any) => t.status === "in_transit").length
  const completed = transfers.filter((t: any) => t.status === "completed").length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Stock Transfers</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Pending" value={loading ? "-" : pending} icon={Clock} iconColor="text-yellow-600" />
        <KPICard title="In Transit" value={loading ? "-" : inTransit} icon={Truck} iconColor="text-blue-600" />
        <KPICard title="Completed" value={loading ? "-" : completed} icon={CheckCircle2} iconColor="text-green-600" />
        <KPICard title="Total" value={loading ? "-" : transfers.length} icon={ArrowRightLeft} iconColor="text-purple-600" />
      </div>
      <Card>
        <CardHeader><CardTitle>Transfer History</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-4 font-medium">ID</th><th className="p-4 font-medium">Item</th><th className="p-4 font-medium">From</th><th className="p-4 font-medium">To</th><th className="p-4 font-medium">Qty</th><th className="p-4 font-medium">Status</th><th className="p-4 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>}
              {!loading && transfers.map((t: any) => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="p-4 font-mono text-xs font-medium">{t.reference || t.id?.slice(0, 8)}</td>
                  <td className="p-4 font-medium">{t.item_name || t.item_id || "Item"}</td>
                  <td className="p-4 text-muted-foreground">{t.from_location || "—"}</td>
                  <td className="p-4 text-muted-foreground">{t.to_location || "—"}</td>
                  <td className="p-4">{t.quantity || 0}</td>
                  <td className="p-4"><span className={`rounded-full px-2 py-0.5 text-xs ${statusColor[t.status] || "bg-gray-100 text-gray-700"}`}>{t.status?.replace("_", " ") || t.status}</span></td>
                  <td className="p-4 text-muted-foreground">{t.created_at ? new Date(t.created_at).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
              {!loading && transfers.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground"><ArrowRightLeft className="mx-auto h-8 w-8 mb-2 opacity-50" /><p>No records found</p></td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
