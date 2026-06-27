"use client"

import { useEffect, useState } from "react"
import { GenericListPage } from "@/components/ui/generic-list-page"
import api from "@/services/api"
import { toast } from "@/hooks/use-toast"

export default function CafeteriaWalletPage() {
  const [txns, setTxns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get("/wallet/transactions", { params: { limit: 200 } })
      .then((res) => {
        const raw = res.data?.data || res.data || []
        setTxns(raw.map((t: any) => ({
          id: t.id,
          user: t.student_name || t.user_name || t.user || "—",
          type: t.transaction_type || t.type || "—",
          amount: t.amount ?? 0,
          balance: t.balance ?? 0,
          date: t.date || t.created_at?.split("T")[0] || "—",
          status: t.status || "completed",
        })))
      })
      .catch(() => toast({ title: "Error", description: "Failed to load wallet transactions", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [])

  return (
    <GenericListPage
      title="Wallet Transactions" description="View wallet top-ups and purchases"
      columns={[
        { key: "user", header: "User", render: (t) => <span className="font-medium">{t.user}</span> },
        { key: "type", header: "Type", render: (t) => <span className={`capitalize ${t.type === "topup" ? "text-green-600" : "text-red-600"}`}>{t.type}</span> },
        { key: "amount", header: "Amount", render: (t) => <span className="font-mono">${t.amount.toFixed(2)}</span> },
        { key: "balance", header: "Balance", render: (t) => <span className="font-mono">${t.balance.toFixed(2)}</span> },
        { key: "date", header: "Date", render: (t) => <span className="text-muted-foreground">{t.date}</span> },
      ]}
      data={txns} keyExtractor={(t) => t.id}
      loading={loading} emptyTitle="No transactions"
    />
  )
}
