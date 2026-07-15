"use client"

import { useState } from "react"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { useLibraryMembers } from "@/hooks/queries"

const statusColor: Record<string, string> = {
  Active: "bg-green-100 text-green-700", Inactive: "bg-gray-100 text-gray-700", Suspended: "bg-red-100 text-red-700",
}

export default function LibraryMembersPage() {
  const [search, setSearch] = useState("")
  const { data: members, isLoading: loading } = useLibraryMembers({ limit: 200 })

  const filtered = (members ?? []).filter((m: any) => !search || m.name?.toLowerCase().includes(search.toLowerCase()) || m.email?.toLowerCase().includes(search.toLowerCase()))

  return (
    <GenericListPage
      title="Members" description="Manage library members"
      columns={[
        { key: "name", header: "Name", render: (m) => <span className="font-medium">{m.name}</span> },
        { key: "email", header: "Email", render: (m) => <span className="text-muted-foreground">{m.email || "—"}</span> },
        { key: "since", header: "Member Since", render: (m) => <span className="text-muted-foreground">{m.member_since ? new Date(m.member_since).toLocaleDateString() : "—"}</span> },
        { key: "borrowed", header: "Borrowed", render: (m) => <span>{m.books_borrowed || 0}</span> },
        { key: "status", header: "Status", render: (m) => <span className={`rounded-full px-2 py-0.5 text-xs ${statusColor[m.status] || "bg-gray-100"}`}>{m.status}</span> },
      ]}
      data={filtered} keyExtractor={(m) => m.id}
      loading={loading} searchPlaceholder="Search by name or email..." onSearch={setSearch}
      emptyTitle="No members found"
    />
  )
}
