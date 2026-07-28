"use client"

import { GenericListPage } from "@/components/ui/generic-list-page"
import { useJournalEntries } from "@/hooks/queries"
import { formatCurrency } from "@/lib/currency"

export default function JournalPage() {
  const { data: entries, isLoading } = useJournalEntries({ limit: 200 } as any)

  const normalized = (entries || []).map((e: any) => ({
    id: e.id,
    date: e.date || e.entry_date?.split("T")[0] || "—",
    account: e.account_name || e.account || "—",
    debit: e.debit ?? 0,
    credit: e.credit ?? 0,
    description: e.description || "—",
  }))

  return (
    <GenericListPage
      title="Journal Entries" description="Double-entry accounting journal"
      columns={[
        { key: "date", header: "Date", render: (e: any) => <span className="text-muted-foreground">{e.date}</span> },
        { key: "account", header: "Account", render: (e: any) => <span className="font-medium">{e.account}</span> },
        { key: "debit", header: "Debit", render: (e: any) => <span className="font-mono text-red-600">{e.debit ? formatCurrency(e.debit) : "\u2014"}</span> },
        { key: "credit", header: "Credit", render: (e: any) => <span className="font-mono text-green-600">{e.credit ? formatCurrency(e.credit) : "\u2014"}</span> },
        { key: "desc", header: "Description", render: (e: any) => <span className="text-muted-foreground max-w-[200px] truncate block">{e.description}</span> },
      ]}
      data={normalized} keyExtractor={(e: any) => e.id}
      loading={isLoading} emptyTitle="No journal entries"
    />
  )
}
