"use client"

import { GenericListPage } from "@/components/ui/generic-list-page"
import { useJournalEntries } from "@/hooks/queries"

export default function LedgerPage() {
  const { data: entries, isLoading } = useJournalEntries({ limit: 100 } as any)

  return (
    <GenericListPage
      title="General Ledger" description="Double-entry accounting ledger"
      columns={[
        { key: "date", header: "Date", render: (e: any) => <span>{e.date || e.created_at?.slice(0, 10) || "\u2014"}</span> },
        { key: "account", header: "Account", render: (e: any) => <span className="font-medium">{e.account_name || e.account_code || "\u2014"}</span> },
        { key: "debit", header: "Debit", render: (e: any) => <span className="font-mono text-red-600">{e.debit ? `$${Number(e.debit).toFixed(2)}` : "\u2014"}</span> },
        { key: "credit", header: "Credit", render: (e: any) => <span className="font-mono text-green-600">{e.credit ? `$${Number(e.credit).toFixed(2)}` : "\u2014"}</span> },
        { key: "desc", header: "Description", render: (e: any) => <span className="text-muted-foreground max-w-[200px] truncate block">{e.description || "\u2014"}</span> },
      ]}
      data={entries || []} keyExtractor={(e: any) => e.id}
      loading={isLoading} emptyTitle="No ledger entries"
    />
  )
}
