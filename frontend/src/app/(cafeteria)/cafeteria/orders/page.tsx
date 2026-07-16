"use client"

import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { useCafeteriaOrders } from "@/hooks/queries"

export default function CafeteriaOrdersPage() {
  const { data: rawOrders, isLoading } = useCafeteriaOrders({ limit: 200 })

  const orders = (rawOrders || []).map((o: any) => ({
    id: o.id,
    customer: o.student_name || o.customer_name || o.customer || "—",
    items: o.items ? (Array.isArray(o.items) ? o.items.map((i: any) => i.name || i).join(", ") : o.items) : "—",
    total: o.total ?? o.total_amount ?? 0,
    status: o.status || "pending",
    time: o.time || o.created_at ? new Date(o.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—",
  }))

  return (
    <GenericListPage
      title="Orders" description="Manage cafeteria orders"
      columns={[
        { key: "customer", header: "Customer", render: (o) => <span className="font-medium">{o.customer}</span> },
        { key: "items", header: "Items", render: (o) => <span className="text-muted-foreground">{o.items}</span> },
        { key: "total", header: "Total", render: (o) => <span className="font-mono">${o.total.toFixed(2)}</span> },
        { key: "time", header: "Time", render: (o) => <span className="text-muted-foreground">{o.time}</span> },
        { key: "status", header: "Status", render: (o) => <StatusBadge status={o.status} /> },
      ]}
      data={orders} keyExtractor={(o) => o.id}
      loading={isLoading} emptyTitle="No orders"
    />
  )
}
