"use client"

import { useEffect, useState } from "react"
import { GenericListPage } from "@/components/ui/generic-list-page"
import api from "@/services/api"
import { toast } from "@/hooks/use-toast"

export default function StudentWalletPage() {
  const [txns, setTxns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get("/wallet/transactions", { params: { limit: 200 } })
      .then(res => setTxns(res.data || []))
      .catch(err => toast({ title: "Failed to load wallet", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [])

  const normalized = txns.map((t: any) => ({
    id: t.id,
    date: t.created_at ? new Date(t.created_at).toLocaleDateString() : "—",
    description: t.description || t.reason || "Transaction",
    amount: Math.abs(t.amount || 0),
    balance: t.balance_after || t.running_balance || 0,
    type: t.transaction_type || (t.amount >= 0 ? "credit" : "debit"),
  }))

  return (
    <GenericListPage
      title="My Wallet" description="View your wallet balance and transactions"
      columns={[
        { key: "date", header: "Date", render: (t) => <span className="text-muted-foreground">{t.date}</span> },
        { key: "desc", header: "Description", render: (t) => <span className="font-medium">{t.description}</span> },
        { key: "amount", header: "Amount", render: (t) => <span className={`font-mono ${t.type === "credit" ? "text-green-600" : "text-red-600"}`}>{t.type === "credit" ? "+" : "-"}${t.amount.toFixed(2)}</span> },
        { key: "balance", header: "Balance", render: (t) => <span className="font-mono">${t.balance.toFixed(2)}</span> },
      ]}
      data={normalized} keyExtractor={(t) => t.id}
      loading={loading} emptyTitle="No transactions"
    />
  )
}
