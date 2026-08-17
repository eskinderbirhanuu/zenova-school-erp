"use client"

import { useState } from "react"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { useLicenses, useSchoolList } from "@/hooks/queries"

export default function SuperAdminLicenses() {
  const [search, setSearch] = useState("")
  const { data, isLoading } = useLicenses()
  const { data: schoolsData } = useSchoolList({ limit: 200 } as any)
  const schools = ((schoolsData as any)?.schools ?? schoolsData ?? []) as any[]
  const schoolName = (id: string) => schools.find((s: any) => s.id === id)?.name || id || "—"

  const licenses = ((data as any)?.licenses || data || []).filter((l: any) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      String(l.key || "").toLowerCase().includes(q) ||
      schoolName(l.school_id).toLowerCase().includes(q) ||
      String(l.license_type || "").toLowerCase().includes(q) ||
      String(l.status || "").toLowerCase().includes(q)
    )
  })

  return (
    <GenericListPage
      title="License Keys" description="Manage all license keys across schools"
      columns={[
        { key: "key", header: "Key", render: (l: any) => <span className="font-mono text-xs">{l.key}</span> },
        { key: "school", header: "School", render: (l: any) => <span className="text-xs text-muted-foreground">{schoolName(l.school_id)}</span> },
        { key: "type", header: "Type", render: (l: any) => <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-medium">{l.license_type}</span> },
        { key: "valid", header: "Valid Until", render: (l: any) => <span className="text-muted-foreground">{l.valid_until ? new Date(l.valid_until).toLocaleDateString() : "—"}</span> },
        { key: "status", header: "Status", render: (l: any) => <StatusBadge status={l.status === "active" ? "active" : l.status === "suspended" ? "inactive" : "warning"} /> },
      ]}
      data={licenses} keyExtractor={(l: any) => l.id}
      loading={isLoading} searchPlaceholder="Search by key or school..." onSearch={setSearch}
      onCreateLabel="Create License" onCreateClick={() => window.location.href = "/super-admin/licenses/new"}
      emptyTitle="No licenses found"
    />
  )
}
