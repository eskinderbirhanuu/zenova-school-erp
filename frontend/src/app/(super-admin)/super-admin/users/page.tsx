"use client"

import { useEffect, useState } from "react"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import api from "@/services/api"
import { toast } from "@/hooks/use-toast"

export default function SuperAdminUsers() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const fetchUsers = () => {
    setLoading(true)
    api.get("/users", { params: { search: search || undefined, limit: 200 } })
      .then(res => setUsers(res.data || []))
      .catch(err => toast({ title: "Failed to load users", description: err.response?.data?.detail || err.message, variant: "destructive" }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchUsers() }, [search])

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
