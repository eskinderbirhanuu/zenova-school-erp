"use client"

import { GenericListPage } from "@/components/ui/generic-list-page"
import { useCafeteriaOrders } from "@/hooks/queries"

export default function CafeteriaSalesPage() {
  const { data: sales, isLoading } = useCafeteriaOrders({ limit: 100 })

  return (
    <GenericListPage
      title="Sales" description="Track cafeteria sales transactions"
      columns={[
        { key: "date", header: "Date", render: (s: any) => <span>{s.date || s.created_at?.slice(0, 10) || "\u2014"}</span> },
        { key: "product", header: "Product", render: (s: any) => <span className="font-medium">{s.product_name || s.name || "\u2014"}</span> },
        { key: "qty", header: "Qty", render: (s: any) => <span>{s.quantity || 1}</span> },
        { key: "total", header: "Total", render: (s: any) => <span className="font-mono">${Number(s.total || s.amount || 0).toFixed(2)}</span> },
        { key: "payment", header: "Payment", render: (s: any) => <span>{s.payment_method || "\u2014"}</span> },
      ]}
      data={sales || []} keyExtractor={(s) => s.id}
      loading={isLoading} emptyTitle="No sales records"
    />
  )
}
