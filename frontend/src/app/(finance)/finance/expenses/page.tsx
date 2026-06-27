"use client"

import { useEffect, useState } from "react"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { financeService } from "@/services/api"
import { toast } from "@/hooks/use-toast"

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    financeService.expenses.list({ limit: 100 }).then((r: any) => setExpenses(r.data)).catch(() => toast({ title: "Failed to load expenses", variant: "destructive" })).finally(() => setLoading(false))
  }, [])

  return (
    <GenericListPage
      title="Expenses" description="Track school expenses and costs"
      columns={[
        { key: "date", header: "Date", render: (e) => <span>{e.date || e.created_at?.slice(0, 10) || "\u2014"}</span> },
        { key: "desc", header: "Description", render: (e) => <span className="font-medium">{e.description || e.name || "\u2014"}</span> },
        { key: "category", header: "Category", render: (e) => <span>{e.category || "\u2014"}</span> },
        { key: "amount", header: "Amount", render: (e) => <span className="font-mono text-red-600">${Number(e.amount || 0).toFixed(2)}</span> },
      ]}
      data={expenses} keyExtractor={(e) => e.id}
      loading={loading} emptyTitle="No expenses found"
    />
  )
}
