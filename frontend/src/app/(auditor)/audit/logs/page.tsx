"use client"

import { useState } from "react"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { useAuditLogs } from "@/hooks/queries"

const actionColors: Record<string, string> = {
  CREATE: "bg-green-100 text-green-700", UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700", LOGIN: "bg-purple-100 text-purple-700",
}

export default function AuditorLogs() {
  const [search, setSearch] = useState("")
  const { data: raw, isLoading } = useAuditLogs({ limit: 200 })

  const rawData = (raw as any) || {}
  const logs = ((rawData.logs || raw || []) as any[]).map((l: any) => ({
    id: l.id,
    action: l.action || "—",
    user: l.user || "—",
    resource: l.resource || "—",
    details: l.details || l.description || "—",
    ip_address: l.ip_address || l.ip || "—",
    created_at: l.created_at || l.timestamp || null,
  }))

  const filtered = logs.filter((l: any) => !search || l.action?.toLowerCase().includes(search.toLowerCase()) || l.user?.toLowerCase().includes(search.toLowerCase()))

  return (
    <GenericListPage
      title="Audit Logs" description="View system audit trail"
      columns={[
        { key: "action", header: "Action", render: (l) => <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${actionColors[l.action] || "bg-gray-100 text-gray-700"}`}>{l.action}</span> },
        { key: "user", header: "User", render: (l) => <span className="font-medium">{l.user}</span> },
        { key: "resource", header: "Resource", render: (l) => <span className="font-mono text-xs text-muted-foreground">{l.resource}</span> },
        { key: "details", header: "Details", render: (l) => <span className="text-muted-foreground max-w-[250px] truncate block">{l.details || "-"}</span> },
        { key: "timestamp", header: "Timestamp", render: (l) => <span className="text-muted-foreground whitespace-nowrap">{l.created_at ? new Date(l.created_at).toLocaleString() : "-"}</span> },
      ]}
      data={filtered} keyExtractor={(l) => l.id}
      loading={isLoading} searchPlaceholder="Search logs..." onSearch={setSearch}
      emptyTitle="No audit logs found"
    />
  )
}
