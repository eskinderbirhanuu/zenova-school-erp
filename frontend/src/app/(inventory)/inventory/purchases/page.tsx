"use client"

import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { useStockMovements } from "@/hooks/queries"

export default function InventoryPurchasesPage() {
  const { data: movements, isLoading } = useStockMovements({ limit: 200 })

  const purchases = (movements || []).filter((m: any) => m.type === "in" || m.type === "purchase")
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
      loading={isLoading} emptyTitle="No purchase orders"
    />
  )
}
