"use client"

import { useEffect, useState } from "react"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { financeService } from "@/services/api"

export default function ParentPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    financeService.payments.list({ limit: 200 })
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : res.data?.data || res.data?.payments || []
        setPayments(
          data.map((p: any) => ({
            id: p.id,
            date: p.date || p.payment_date || p.created_at || "—",
            description: p.description || p.invoice_description || p.invoice_number || "—",
            amount: Number(p.amount) || 0,
            method: p.payment_method || p.method || "—",
            status: p.status || p.payment_status || "unknown",
            invoice: p.invoice_number || p.invoice_id || "—",
          }))
        )
      })
      .catch(() => {
        setPayments([])
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <GenericListPage
      title="Payments" description="View your payment history"
      columns={[
        { key: "date", header: "Date", render: (p) => <span className="text-muted-foreground">{p.date}</span> },
        { key: "desc", header: "Description", render: (p) => <span className="font-medium">{p.description}</span> },
        { key: "amount", header: "Amount", render: (p) => <span className="font-mono">${p.amount.toFixed(2)}</span> },
        { key: "method", header: "Method", render: (p) => <span>{p.method}</span> },
        { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
      ]}
      data={payments} keyExtractor={(p) => p.id}
      loading={loading} emptyTitle="No payments"
    />
  )
}
