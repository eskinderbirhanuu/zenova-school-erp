"use client"

import { useState } from "react"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { useAuditLogs } from "@/hooks/queries"
import { toast } from "@/hooks/use-toast"

const actionColors: Record<string, string> = {
  CREATE: "bg-green-100 text-green-700", UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700", LOGIN: "bg-purple-100 text-purple-700",
}

export default function SuperAdminAudit() {
  const [search, setSearch] = useState("")
  const { data, isLoading } = useAuditLogs({ search: search || undefined, limit: 200 })

  const logs = (data as any)?.logs || []

  return (
    <GenericListPage
      title="Audit Logs" description="Global audit trail across all schools"
      columns={[
        { key: "action", header: "Action", render: (l: any) => <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${actionColors[l.action] || "bg-gray-100 text-gray-700"}`}>{l.action}</span> },
        { key: "user", header: "User", render: (l: any) => <span className="font-medium">{l.user}</span> },
        { key: "resource", header: "Resource", render: (l: any) => <span className="font-mono text-xs text-muted-foreground">{l.resource}</span> },
        { key: "details", header: "Details", render: (l: any) => <span className="text-muted-foreground max-w-[200px] truncate block">{l.details || "-"}</span> },
        { key: "timestamp", header: "Timestamp", render: (l: any) => <span className="text-muted-foreground whitespace-nowrap">{l.created_at ? new Date(l.created_at).toLocaleString() : "-"}</span> },
      ]}
      data={logs} keyExtractor={(l: any) => l.id}
      loading={isLoading} searchPlaceholder="Search logs..." onSearch={setSearch}
      emptyTitle="No audit logs found"
    />
  )
}
