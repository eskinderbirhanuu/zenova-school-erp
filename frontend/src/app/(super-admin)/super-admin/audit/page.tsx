"use client"

import { useEffect, useState } from "react"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { auditService } from "@/services/api"
import { toast } from "@/hooks/use-toast"

const actionColors: Record<string, string> = {
  CREATE: "bg-green-100 text-green-700", UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700", LOGIN: "bg-purple-100 text-purple-700",
}

export default function SuperAdminAudit() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const fetchLogs = () => {
    setLoading(true)
    auditService.list({ search: search || undefined, limit: 200 })
      .then(res => setLogs(res.data.logs || []))
      .catch(err => toast({ title: "Failed to load audit logs", description: err.response?.data?.detail || err.message, variant: "destructive" }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchLogs() }, [search])

  return (
    <GenericListPage
      title="Audit Logs" description="Global audit trail across all schools"
      columns={[
        { key: "action", header: "Action", render: (l) => <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${actionColors[l.action] || "bg-gray-100 text-gray-700"}`}>{l.action}</span> },
        { key: "user", header: "User", render: (l) => <span className="font-medium">{l.user}</span> },
        { key: "resource", header: "Resource", render: (l) => <span className="font-mono text-xs text-muted-foreground">{l.resource}</span> },
        { key: "details", header: "Details", render: (l) => <span className="text-muted-foreground max-w-[200px] truncate block">{l.details || "-"}</span> },
        { key: "timestamp", header: "Timestamp", render: (l) => <span className="text-muted-foreground whitespace-nowrap">{l.created_at ? new Date(l.created_at).toLocaleString() : "-"}</span> },
      ]}
      data={logs} keyExtractor={(l) => l.id}
      loading={loading} searchPlaceholder="Search logs..." onSearch={setSearch}
      emptyTitle="No audit logs found"
    />
  )
}
