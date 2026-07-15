"use client"

import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { useBudgets } from "@/hooks/queries"

export default function BudgetsPage() {
  const { data: budgets, isLoading } = useBudgets({ limit: 100 } as any)

  return (
    <GenericListPage
      title="Budgets" description="Manage departmental budgets"
      columns={[
        { key: "name", header: "Budget", render: (b: any) => <span className="font-medium">{b.name || b.department || "\u2014"}</span> },
        { key: "allocated", header: "Allocated", render: (b: any) => <span className="font-mono">${Number(b.allocated || b.amount || 0).toFixed(2)}</span> },
        { key: "spent", header: "Spent", render: (b: any) => <span className="font-mono text-red-600">${Number(b.spent || 0).toFixed(2)}</span> },
        { key: "remaining", header: "Remaining", render: (b: any) => <span className="font-mono text-green-600">${Number((b.allocated || b.amount || 0) - (b.spent || 0)).toFixed(2)}</span> },
        { key: "status", header: "Status", render: (b: any) => <StatusBadge status={b.status || "active"} /> },
      ]}
      data={budgets || []} keyExtractor={(b: any) => b.id}
      loading={isLoading} emptyTitle="No budgets found"
    />
  )
}
