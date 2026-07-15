"use client"

import { useState } from "react"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { useUsers } from "@/hooks/queries"

export default function SuperAdminUsers() {
  const [search, setSearch] = useState("")
  const { data: users = [], isLoading: loading } = useUsers({ search: search || undefined, limit: 200 } as any)

  return (
    <GenericListPage
      title="Users" description="Manage all system users"
      columns={[
        { key: "name", header: "Name", render: (u) => <span className="font-medium">{u.full_name}</span> },
        { key: "email", header: "Email", render: (u) => <span className="text-muted-foreground">{u.email}</span> },
        { key: "role", header: "Role", render: (u) => <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-medium">{u.role_name || "—"}</span> },
        { key: "lastLogin", header: "Last Login", render: (u) => <span className="text-muted-foreground">{u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : "Never"}</span> },
        { key: "status", header: "Status", render: (u) => <StatusBadge status={u.is_active ? "active" : "inactive"} /> },
      ]}
      data={users} keyExtractor={(u) => u.id}
      loading={loading} searchPlaceholder="Search by name or email..." onSearch={setSearch}
      emptyTitle="No users found"
    />
  )
}
