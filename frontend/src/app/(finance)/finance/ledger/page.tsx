"use client"

import { useEffect, useState } from "react"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { financeService } from "@/services/api"
import { toast } from "@/hooks/use-toast"

export default function LedgerPage() {
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    financeService.journalEntries.list({ limit: 100 }).then((r: any) => setEntries(r.data)).catch(() => toast({ title: "Failed to load ledger", variant: "destructive" })).finally(() => setLoading(false))
  }, [])

  return (
    <GenericListPage
      title="General Ledger" description="Double-entry accounting ledger"
      columns={[
        { key: "date", header: "Date", render: (e) => <span>{e.date || e.created_at?.slice(0, 10) || "\u2014"}</span> },
        { key: "account", header: "Account", render: (e) => <span className="font-medium">{e.account_name || e.account_code || "\u2014"}</span> },
        { key: "debit", header: "Debit", render: (e) => <span className="font-mono text-red-600">{e.debit ? `$${Number(e.debit).toFixed(2)}` : "\u2014"}</span> },
        { key: "credit", header: "Credit", render: (e) => <span className="font-mono text-green-600">{e.credit ? `$${Number(e.credit).toFixed(2)}` : "\u2014"}</span> },
        { key: "desc", header: "Description", render: (e) => <span className="text-muted-foreground max-w-[200px] truncate block">{e.description || "\u2014"}</span> },
      ]}
      data={entries} keyExtractor={(e) => e.id}
      loading={loading} emptyTitle="No ledger entries"
    />
  )
}
