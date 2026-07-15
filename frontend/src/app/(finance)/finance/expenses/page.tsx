"use client"

import { GenericListPage } from "@/components/ui/generic-list-page"
import { useJournalEntries } from "@/hooks/queries"

export default function ExpensesPage() {
  const { data: entries, isLoading } = useJournalEntries({ limit: 100 } as any)

  const expenses = (entries || []).filter((e: any) => e.type === "expense" || e.entry_type === "expense")

  return (
    <GenericListPage
      title="Expenses" description="Track school expenses and costs"
      columns={[
        { key: "date", header: "Date", render: (e: any) => <span>{e.date || e.created_at?.slice(0, 10) || "\u2014"}</span> },
        { key: "desc", header: "Description", render: (e: any) => <span className="font-medium">{e.description || e.name || "\u2014"}</span> },
        { key: "category", header: "Category", render: (e: any) => <span>{e.category || "\u2014"}</span> },
        { key: "amount", header: "Amount", render: (e: any) => <span className="font-mono text-red-600">${Number(e.amount || 0).toFixed(2)}</span> },
      ]}
      data={expenses} keyExtractor={(e: any) => e.id}
      loading={isLoading} emptyTitle="No expenses found"
    />
  )
}
