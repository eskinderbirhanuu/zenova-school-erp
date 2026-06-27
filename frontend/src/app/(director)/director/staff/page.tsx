"use client"

import { useEffect, useState } from "react"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { Button } from "@/components/ui/button"
import { staffService } from "@/services/api"
import { toast } from "@/hooks/use-toast"

export default function DirectorStaff() {
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    staffService.list()
      .then(res => setStaff(res.data || []))
      .catch(err => toast({ title: "Failed to load staff", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [])

  return (
    <GenericListPage
      title="Staff" description="Manage school staff members"
      columns={[
        { key: "name", header: "Name", render: (s) => <span className="font-medium">{s.full_name || s.name}</span> },
        { key: "email", header: "Email", render: (s) => <span className="text-muted-foreground">{s.email}</span> },
        { key: "dept", header: "Department", render: (s) => <span className="text-muted-foreground">{s.department || s.role_name || "—"}</span> },
        { key: "role", header: "Role", render: (s) => <span className="text-muted-foreground">{s.employee_type || s.role_name || "—"}</span> },
        { key: "status", header: "Status", render: (s) => <StatusBadge status={s.is_active ? "active" : "inactive"} /> },
        { key: "actions", header: "", render: () => <Button variant="ghost" size="sm">View</Button> },
      ]}
      data={staff} keyExtractor={(s) => s.id}
      loading={loading} onCreateLabel="Add Staff"
      emptyTitle="No staff found"
    />
  )
}
