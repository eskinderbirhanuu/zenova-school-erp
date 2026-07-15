"use client"

import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { useInvoices } from "@/hooks/queries"

export default function BillingPage() {
  const { data: invoices, isLoading } = useInvoices({ limit: 100 } as any)

  return (
    <GenericListPage
      title="Billing" description="Manage student billing and fee structures"
      columns={[
        { key: "student", header: "Student", render: (b: any) => <span className="font-medium">{b.student_name || "\u2014"}</span> },
        { key: "fee", header: "Fee Type", render: (b: any) => <span>{b.fee_type || b.description || "\u2014"}</span> },
        { key: "amount", header: "Amount", render: (b: any) => <span className="font-mono">${Number(b.total_amount || b.amount || 0).toFixed(2)}</span> },
        { key: "due", header: "Due Date", render: (b: any) => <span className="text-muted-foreground">{b.due_date || "\u2014"}</span> },
        { key: "status", header: "Status", render: (b: any) => <StatusBadge status={b.status || "pending"} /> },
      ]}
      data={invoices || []} keyExtractor={(b: any) => b.id}
      loading={isLoading} emptyTitle="No billing records"
    />
  )
}
