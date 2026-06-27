"use client"

import { useEffect, useState } from "react"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { cafeteriaService } from "@/services/api"
import { toast } from "@/hooks/use-toast"

export default function CafeteriaSalesPage() {
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    cafeteriaService.sales.list({ limit: 100 }).then((r: any) => setSales(r.data)).catch(() => toast({ title: "Failed to load sales", variant: "destructive" })).finally(() => setLoading(false))
  }, [])

  return (
    <GenericListPage
      title="Sales" description="Track cafeteria sales transactions"
      columns={[
        { key: "date", header: "Date", render: (s) => <span>{s.date || s.created_at?.slice(0, 10) || "\u2014"}</span> },
        { key: "product", header: "Product", render: (s) => <span className="font-medium">{s.product_name || s.name || "\u2014"}</span> },
        { key: "qty", header: "Qty", render: (s) => <span>{s.quantity || 1}</span> },
        { key: "total", header: "Total", render: (s) => <span className="font-mono">${Number(s.total || s.amount || 0).toFixed(2)}</span> },
        { key: "payment", header: "Payment", render: (s) => <span>{s.payment_method || "\u2014"}</span> },
      ]}
      data={sales} keyExtractor={(s) => s.id}
      loading={loading} emptyTitle="No sales records"
    />
  )
}
