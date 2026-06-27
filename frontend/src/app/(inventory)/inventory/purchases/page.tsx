"use client"

import { useEffect, useState } from "react"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { inventoryService } from "@/services/api"
import { toast } from "@/hooks/use-toast"

export default function InventoryPurchasesPage() {
  const [purchases, setPurchases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    inventoryService.stockMovements.list({ limit: 200 })
      .then(res => setPurchases((res.data || []).filter((m: any) => m.type === "in" || m.type === "purchase")))
      .catch(err => toast({ title: "Failed to load purchases", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [])

  const normalized = purchases.map((p: any) => ({
    id: p.id,
    item: p.item_name || p.item_id || "Item",
    supplier: p.from_location || p.reference || "—",
    qty: p.quantity || 0,
    total: p.total_amount || 0,
    date: p.created_at ? new Date(p.created_at).toLocaleDateString() : "—",
    status: p.status || "pending",
  }))

  return (
    <GenericListPage
      title="Purchase Orders" description="Track inventory purchases"
      columns={[
        { key: "item", header: "Item", render: (p) => <span className="font-medium">{p.item}</span> },
        { key: "supplier", header: "Supplier", render: (p) => <span className="text-muted-foreground">{p.supplier}</span> },
        { key: "qty", header: "Qty", render: (p) => <span>{p.qty}</span> },
        { key: "total", header: "Total", render: (p) => <span className="font-mono">${(p.total || 0).toFixed(2)}</span> },
        { key: "date", header: "Date", render: (p) => <span className="text-muted-foreground">{p.date}</span> },
        { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
      ]}
      data={normalized} keyExtractor={(p) => p.id}
      loading={loading} emptyTitle="No purchase orders"
    />
  )
}
