"use client"

import { useEffect, useState } from "react"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { financeService } from "@/services/api"
import { toast } from "@/hooks/use-toast"

export default function JournalPage() {
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    financeService.journalEntries.list({ limit: 200 })
      .then((res) => {
        const raw = res.data?.data || res.data || []
        setEntries(raw.map((e: any) => ({
          id: e.id,
          date: e.date || e.entry_date?.split("T")[0] || "—",
          account: e.account_name || e.account || "—",
          debit: e.debit ?? 0,
          credit: e.credit ?? 0,
          description: e.description || "—",
        })))
      })
      .catch(() => toast({ title: "Error", description: "Failed to load journal entries", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [])

  return (
    <GenericListPage
      title="Journal Entries" description="Double-entry accounting journal"
      columns={[
        { key: "date", header: "Date", render: (e) => <span className="text-muted-foreground">{e.date}</span> },
        { key: "account", header: "Account", render: (e) => <span className="font-medium">{e.account}</span> },
        { key: "debit", header: "Debit", render: (e) => <span className="font-mono text-red-600">{e.debit ? `$${e.debit.toFixed(2)}` : "\u2014"}</span> },
        { key: "credit", header: "Credit", render: (e) => <span className="font-mono text-green-600">{e.credit ? `$${e.credit.toFixed(2)}` : "\u2014"}</span> },
        { key: "desc", header: "Description", render: (e) => <span className="text-muted-foreground max-w-[200px] truncate block">{e.description}</span> },
      ]}
      data={entries} keyExtractor={(e) => e.id}
      loading={loading} emptyTitle="No journal entries"
    />
  )
}
