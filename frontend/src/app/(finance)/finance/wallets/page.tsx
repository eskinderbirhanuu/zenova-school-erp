"use client"

import { useState } from "react"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { useWalletTransactions } from "@/hooks/queries"

export default function FinanceWalletsPage() {
  const [search, setSearch] = useState("")
  const { data: raw, isLoading } = useWalletTransactions({ limit: 200, group_by: "student" })

  const wallets = (raw || []).map((w: any) => ({
    id: w.id,
    user: w.student_name || w.user_name || w.user || "—",
    type: w.account_type || w.type || "Student",
    balance: w.balance ?? 0,
    status: w.status || "active",
    lastTxn: w.last_transaction_date || w.last_txn || w.date || "—",
  }))

  const filtered = wallets.filter((w: any) => !search || w.user?.toLowerCase().includes(search.toLowerCase()))

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
      loading={isLoading} searchPlaceholder="Search user..." onSearch={setSearch}
      emptyTitle="No wallets found"
    />
  )
}
