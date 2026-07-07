"use client"

import { useEffect, useState } from "react"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { auditService } from "@/services/api"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"

const actionColors: Record<string, string> = {
  CREATE: "bg-green-100 text-green-700 border border-green-200",
  UPDATE: "bg-blue-100 text-blue-700 border border-blue-200",
  DELETE: "bg-red-100 text-red-700 border border-red-200",
  LOGIN: "bg-purple-100 text-purple-700 border border-purple-200",
}

export default function AdminAudit() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    setLoading(true)
    auditService.list({ limit: 100 }).then((r: any) => setLogs(r.data?.logs || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filtered = logs.filter(l => !search || l.action?.toLowerCase().includes(search.toLowerCase()) || l.user?.toLowerCase().includes(search.toLowerCase()))

  return (
    <GenericListPage
      title="Audit Logs" description="Track all system activities and changes"
      columns={[
        { key: "action", header: "Action", render: (l) => <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${actionColors[l.action] || "bg-gray-100 text-gray-700"}`}>{l.action}</span> },
        { key: "user", header: "User", render: (l) => <span className="font-medium">{l.user}</span> },
        { key: "resource", header: "Resource", render: (l) => <span className="font-mono text-xs text-muted-foreground">{l.resource}</span> },
        { key: "details", header: "Details", render: (l) => <span className="text-muted-foreground max-w-[200px] truncate block">{l.details || "-"}</span> },
        { key: "timestamp", header: "Timestamp", render: (l) => <span className="text-muted-foreground whitespace-nowrap">{l.created_at ? new Date(l.created_at).toLocaleString() : "-"}</span> },
      ]}
      data={filtered} keyExtractor={(l) => l.id}
      loading={loading} searchPlaceholder="Search by action, user, or resource..." onSearch={setSearch}
      emptyTitle="No audit logs found"
      actions={<Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" /> Export</Button>}
    />
  )
}
