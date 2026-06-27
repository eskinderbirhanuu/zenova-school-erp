"use client"

import { useEffect, useState } from "react"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import api from "@/services/api"
import { toast } from "@/hooks/use-toast"

export default function SuperAdminAdmins() {
  const [admins, setAdmins] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const fetchAdmins = () => {
    setLoading(true)
    api.get("/users", { params: { role: "ADMIN", search: search || undefined, limit: 200 } })
      .then(res => setAdmins(res.data || []))
      .catch(err => toast({ title: "Failed to load admins", description: err.response?.data?.detail || err.message, variant: "destructive" }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchAdmins() }, [search])

  const normalized = admins.map(a => ({
    ...a,
    name: a.full_name,
    schools: "—",
    status: a.is_active ? "active" : "inactive",
  }))

  return (
    <GenericListPage
      title="Administrators" description="Manage system administrators"
      columns={[
        { key: "name", header: "Name", render: (a) => <span className="font-medium">{a.full_name}</span> },
        { key: "email", header: "Email", render: (a) => <span className="text-muted-foreground">{a.email}</span> },
        { key: "role", header: "Role", render: (a) => <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-medium">{a.role_name || "ADMIN"}</span> },
        { key: "schools", header: "Schools", render: () => <span className="text-muted-foreground">—</span> },
        { key: "status", header: "Status", render: (a) => <StatusBadge status={a.is_active ? "active" : "inactive"} /> },
      ]}
      data={normalized} keyExtractor={(a) => a.id}
      loading={loading} searchPlaceholder="Search admins..." onSearch={setSearch}
      emptyTitle="No administrators found"
    />
  )
}
