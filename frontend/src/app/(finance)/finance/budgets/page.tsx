"use client"

import { useEffect, useState } from "react"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { financeService } from "@/services/api"
import { toast } from "@/hooks/use-toast"

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    financeService.budgets.list({ limit: 100 }).then((r: any) => setBudgets(r.data)).catch(() => toast({ title: "Failed to load budgets", variant: "destructive" })).finally(() => setLoading(false))
  }, [])

  return (
    <GenericListPage
      title="Budgets" description="Manage departmental budgets"
      columns={[
        { key: "name", header: "Budget", render: (b) => <span className="font-medium">{b.name || b.department || "\u2014"}</span> },
        { key: "allocated", header: "Allocated", render: (b) => <span className="font-mono">${Number(b.allocated || b.amount || 0).toFixed(2)}</span> },
        { key: "spent", header: "Spent", render: (b) => <span className="font-mono text-red-600">${Number(b.spent || 0).toFixed(2)}</span> },
        { key: "remaining", header: "Remaining", render: (b) => <span className="font-mono text-green-600">${Number((b.allocated || b.amount || 0) - (b.spent || 0)).toFixed(2)}</span> },
        { key: "status", header: "Status", render: (b) => <StatusBadge status={b.status || "active"} /> },
      ]}
      data={budgets} keyExtractor={(b) => b.id}
      loading={loading} emptyTitle="No budgets found"
    />
  )
}
