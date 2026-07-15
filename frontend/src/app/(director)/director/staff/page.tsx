"use client"

import { useRouter } from "next/navigation"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { Button } from "@/components/ui/button"
import { useStaff } from "@/hooks/queries"

export default function DirectorStaff() {
  const router = useRouter()
  const { data: staff, isLoading } = useStaff()

  return (
    <GenericListPage
      title="Staff" description="Manage school staff members"
      columns={[
        { key: "name", header: "Name", render: (s: any) => <span className="font-medium">{s.full_name || s.name}</span> },
        { key: "email", header: "Email", render: (s: any) => <span className="text-muted-foreground">{s.email}</span> },
        { key: "dept", header: "Department", render: (s: any) => <span className="text-muted-foreground">{s.department || s.role_name || "—"}</span> },
        { key: "role", header: "Role", render: (s: any) => <span className="text-muted-foreground">{s.employee_type || s.role_name || "—"}</span> },
        { key: "status", header: "Status", render: (s: any) => <StatusBadge status={s.is_active ? "active" : "inactive"} /> },
        { key: "actions", header: "", render: () => <Button variant="ghost" size="sm">View</Button> },
      ]}
      data={staff || []} keyExtractor={(s: any) => s.id}
      loading={isLoading} onCreateLabel="Add Staff" onCreateClick={() => router.push("/director/staff/new")}
      emptyTitle="No staff found"
    />
  )
}
