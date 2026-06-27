"use client"

import { useEffect, useState } from "react"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { libraryService } from "@/services/api"
import { toast } from "@/hooks/use-toast"

export default function LibraryReturnsPage() {
  const [returns, setReturns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    setLoading(true)
    libraryService.borrowings.list({ limit: 200 })
      .then(res => setReturns((res.data || []).filter((b: any) => b.returned_at || b.status === "returned")))
      .catch(err => toast({ title: "Failed to load returns", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [])

  const normalized = returns.map((r: any) => ({
    id: r.id,
    member: r.borrower_name || r.student_id || "—",
    book: r.book_title || r.book_id || "—",
    borrowed: r.borrowed_at ? new Date(r.borrowed_at).toLocaleDateString() : "—",
    returned: r.returned_at ? new Date(r.returned_at).toLocaleDateString() : "—",
    fine: r.fine_amount || null,
    status: r.fine_amount ? "overdue" : "on-time",
  }))

  const filtered = normalized.filter(r => !search || r.member?.toLowerCase().includes(search.toLowerCase()) || r.book?.toLowerCase().includes(search.toLowerCase()))

  return (
    <GenericListPage
      title="Returns" description="Track book returns and overdue items"
      columns={[
        { key: "member", header: "Member", render: (r) => <span className="font-medium">{r.member}</span> },
        { key: "book", header: "Book", render: (r) => <span className="text-muted-foreground">{r.book}</span> },
        { key: "borrowed", header: "Borrowed", render: (r) => <span className="text-muted-foreground">{r.borrowed}</span> },
        { key: "returned", header: "Returned", render: (r) => <span className="text-muted-foreground">{r.returned}</span> },
        { key: "fine", header: "Fine", render: (r) => <span className="font-mono text-red-600">{r.fine ? `$${(r.fine).toFixed(2)}` : "-"}</span> },
        { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status === "overdue" ? "warning" : "success"} /> },
      ]}
      data={filtered} keyExtractor={(r) => r.id}
      loading={loading} searchPlaceholder="Search member or book..." onSearch={setSearch}
      emptyTitle="No returns found"
    />
  )
}
