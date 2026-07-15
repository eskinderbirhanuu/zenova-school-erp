"use client"

import { useState } from "react"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { Button } from "@/components/ui/button"
import { useUsers } from "@/hooks/queries"

export default function DirectorRegistrars() {
  const [search, setSearch] = useState("")
  const { data: registrars = [], isLoading: loading } = useUsers({ role: "REGISTRAR", search: search || undefined, limit: 200 } as any)

  const normalized = (registrars as any[]).map((r: any) => ({
    ...r,
    name: r.full_name,
    phone: r.phone || "—",
    students: "—",
    status: r.is_active ? "active" : "inactive",
  }))

  return (
    <GenericListPage
      title="Registrars" description="Manage school registrars"
      columns={[
        { key: "name", header: "Name", render: (r) => <span className="font-medium">{r.full_name}</span> },
        { key: "email", header: "Email", render: (r) => <span className="text-muted-foreground">{r.email}</span> },
        { key: "phone", header: "Phone", render: (r) => <span className="text-muted-foreground">{r.phone || "—"}</span> },
        { key: "students", header: "Students", render: () => <span className="text-muted-foreground">—</span> },
        { key: "status", header: "Status", render: (r) => <StatusBadge status={r.is_active ? "active" : "inactive"} /> },
        { key: "actions", header: "", render: () => <Button variant="ghost" size="sm">View</Button> },
      ]}
      data={normalized} keyExtractor={(r) => r.id}
      loading={loading} searchPlaceholder="Search registrars..." onSearch={setSearch}
      onCreateLabel="Add Registrar" onCreateClick={() => window.location.href = "/director/registrars/new"}
      emptyTitle="No registrars found"
    />
  )
}
