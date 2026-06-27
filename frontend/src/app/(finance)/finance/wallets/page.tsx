"use client"

import { useEffect, useState } from "react"
import { GenericListPage } from "@/components/ui/generic-list-page"
import api from "@/services/api"
import { toast } from "@/hooks/use-toast"

export default function FinanceWalletsPage() {
  const [wallets, setWallets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    api.get("/wallet/transactions", { params: { limit: 200, group_by: "student" } })
      .then((res) => {
        const raw = res.data?.data || res.data || []
        setWallets(raw.map((w: any) => ({
          id: w.id,
          user: w.student_name || w.user_name || w.user || "—",
          type: w.account_type || w.type || "Student",
          balance: w.balance ?? 0,
          status: w.status || "active",
          lastTxn: w.last_transaction_date || w.last_txn || w.date || "—",
        })))
      })
      .catch(() => toast({ title: "Error", description: "Failed to load wallets", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [])

  const filtered = wallets.filter(w => !search || w.user?.toLowerCase().includes(search.toLowerCase()))

  return (
    <GenericListPage
      title="Wallets" description="Manage digital wallets across users"
      columns={[
        { key: "user", header: "User", render: (w) => <span className="font-medium">{w.user}</span> },
        { key: "type", header: "Type", render: (w) => <span>{w.type}</span> },
        { key: "balance", header: "Balance", render: (w) => <span className="font-mono">${w.balance.toFixed(2)}</span> },
        { key: "lastTxn", header: "Last Activity", render: (w) => <span className="text-muted-foreground">{w.lastTxn || "\u2014"}</span> },
      ]}
      data={filtered} keyExtractor={(w) => w.id}
      loading={loading} searchPlaceholder="Search user..." onSearch={setSearch}
      emptyTitle="No wallets found"
    />
  )
}
