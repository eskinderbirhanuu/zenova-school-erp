"use client"

import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { useLibraryFines } from "@/hooks/queries"

export default function LibraryFinesPage() {
  const { data: fines, isLoading: loading } = useLibraryFines({ limit: 200 })

  const normalized = (fines ?? []).map((f: any) => ({
    id: f.id,
    member: f.member_name || "—",
    book: f.book_title || "—",
    days: f.days_overdue || 0,
    amount: f.amount || 0,
    status: f.status || "unpaid",
  }))

  return (
    <GenericListPage
      title="Fines" description="Manage library late fees"
      columns={[
        { key: "member", header: "Member", render: (f) => <span className="font-medium">{f.member}</span> },
        { key: "book", header: "Book", render: (f) => <span className="text-muted-foreground">{f.book}</span> },
        { key: "days", header: "Days Overdue", render: (f) => <span>{f.days}</span> },
        { key: "amount", header: "Amount", render: (f) => <span className="font-mono font-medium text-red-600">${(f.amount).toFixed(2)}</span> },
        { key: "status", header: "Status", render: (f) => <StatusBadge status={f.status} /> },
      ]}
      data={normalized} keyExtractor={(f) => f.id}
      loading={loading} emptyTitle="No fines"
    />
  )
}
