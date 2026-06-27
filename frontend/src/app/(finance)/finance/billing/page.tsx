"use client"

import { useEffect, useState } from "react"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { financeService } from "@/services/api"
import { toast } from "@/hooks/use-toast"

export default function BillingPage() {
  const [bills, setBills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    financeService.invoices.list({ limit: 100 }).then((r: any) => setBills(r.data)).catch(() => toast({ title: "Failed to load billing", variant: "destructive" })).finally(() => setLoading(false))
  }, [])

  return (
    <GenericListPage
      title="Billing" description="Manage student billing and fee structures"
      columns={[
        { key: "student", header: "Student", render: (b) => <span className="font-medium">{b.student_name || "\u2014"}</span> },
        { key: "fee", header: "Fee Type", render: (b) => <span>{b.fee_type || b.description || "\u2014"}</span> },
        { key: "amount", header: "Amount", render: (b) => <span className="font-mono">${Number(b.total_amount || b.amount || 0).toFixed(2)}</span> },
        { key: "due", header: "Due Date", render: (b) => <span className="text-muted-foreground">{b.due_date || "\u2014"}</span> },
        { key: "status", header: "Status", render: (b) => <StatusBadge status={b.status || "pending"} /> },
      ]}
      data={bills} keyExtractor={(b) => b.id}
      loading={loading} emptyTitle="No billing records"
    />
  )
}
