"use client"

import { useEffect, useState } from "react"
import { GenericListPage } from "@/components/ui/generic-list-page"
import api from "@/services/api"

export default function ParentWalletPage() {
  const [txns, setTxns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get("/wallet/transactions", { params: { limit: 200 } })
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : res.data?.data || res.data?.transactions || []
        setTxns(
          data.map((t: any) => {
            const amount = Number(t.amount) || 0
            const type = t.type || (amount >= 0 ? "credit" : "debit")
            return {
              id: t.id,
              date: t.date || t.transaction_date || t.created_at || "—",
              description: t.description || t.narration || "—",
              amount: Math.abs(amount),
              balance: Number(t.balance) || 0,
              type,
            }
          })
        )
      })
      .catch(() => {
        setTxns([])
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <GenericListPage
      title="Wallet" description="View your wallet transactions"
      columns={[
        { key: "date", header: "Date", render: (t) => <span className="text-muted-foreground">{t.date}</span> },
        { key: "desc", header: "Description", render: (t) => <span className="font-medium">{t.description}</span> },
        { key: "amount", header: "Amount", render: (t) => <span className={`font-mono ${t.type === "credit" ? "text-green-600" : "text-red-600"}`}>{t.type === "credit" ? "+" : "-"}${t.amount.toFixed(2)}</span> },
        { key: "balance", header: "Balance", render: (t) => <span className="font-mono">${t.balance.toFixed(2)}</span> },
      ]}
      data={txns} keyExtractor={(t) => t.id}
      loading={loading} emptyTitle="No transactions"
    />
  )
}
