"use client"

import { useEffect, useState } from "react"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { licenseService } from "@/services/api"
import { toast } from "@/hooks/use-toast"

export default function SuperAdminLicenses() {
  const [licenses, setLicenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const fetchLicenses = () => {
    setLoading(true)
    licenseService.list()
      .then(res => setLicenses(res.data.licenses || []))
      .catch(err => toast({ title: "Failed to load licenses", description: err.response?.data?.detail || err.message, variant: "destructive" }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchLicenses() }, [])

  const filtered = licenses.filter(l => !search ||
    l.key?.toLowerCase().includes(search.toLowerCase()) ||
    l.school_id?.toLowerCase().includes(search.toLowerCase()) ||
    l.license_type?.toLowerCase().includes(search.toLowerCase()))

  return (
    <GenericListPage
      title="License Keys" description="Manage all license keys across schools"
      columns={[
        { key: "key", header: "Key", render: (l) => <span className="font-mono text-xs">{l.key}</span> },
        { key: "school", header: "School ID", render: (l) => <span className="font-mono text-xs text-muted-foreground">{l.school_id || "—"}</span> },
        { key: "type", header: "Type", render: (l) => <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-medium">{l.license_type}</span> },
        { key: "valid", header: "Valid Until", render: (l) => <span className="text-muted-foreground">{l.valid_until ? new Date(l.valid_until).toLocaleDateString() : "—"}</span> },
        { key: "status", header: "Status", render: (l) => <StatusBadge status={l.status === "active" ? "active" : l.status === "suspended" ? "inactive" : "warning"} /> },
      ]}
      data={filtered} keyExtractor={(l) => l.id}
      loading={loading} searchPlaceholder="Search by key or school..." onSearch={setSearch}
      onCreateLabel="Create License" onCreateClick={() => window.location.href = "/super-admin/licenses/new"}
      emptyTitle="No licenses found"
    />
  )
}
