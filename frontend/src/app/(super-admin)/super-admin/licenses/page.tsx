"use client"

import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { useLicenses } from "@/hooks/queries"

export default function SuperAdminLicenses() {
  const { data, isLoading } = useLicenses()

  const licenses = (data as any)?.licenses || data || []

  return (
    <GenericListPage
      title="License Keys" description="Manage all license keys across schools"
      columns={[
        { key: "key", header: "Key", render: (l: any) => <span className="font-mono text-xs">{l.key}</span> },
        { key: "school", header: "School ID", render: (l: any) => <span className="font-mono text-xs text-muted-foreground">{l.school_id || "—"}</span> },
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
