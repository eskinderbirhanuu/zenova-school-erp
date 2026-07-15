"use client"

import { useState } from "react"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { useAuditLogs } from "@/hooks/queries"

export default function AuditorSecurity() {
  const [search, setSearch] = useState("")
  const { data: raw, isLoading } = useAuditLogs({ limit: 200, type: "security" })

  const events = ((raw || []) as any[]).map((l: any) => ({
    id: l.id,
    event: l.action || l.event || l.description || "—",
    source: l.ip_address || l.source || "—",
    user: l.user || "—",
    severity: l.severity || "info",
    timestamp: l.created_at ? new Date(l.created_at).toLocaleString() : l.timestamp || "—",
  }))

  return (
    <GenericListPage
      title="Security Events" description="Monitor security-related events"
      columns={[
        { key: "event", header: "Event", render: (e) => <span className="font-medium">{e.event}</span> },
        { key: "source", header: "Source", render: (e) => <span className="font-mono text-xs text-muted-foreground">{e.source}</span> },
        { key: "user", header: "User", render: (e) => <span className="text-muted-foreground">{e.user}</span> },
        { key: "severity", header: "Severity", render: (e) => <StatusBadge status={e.severity === "high" ? "error" : e.severity === "medium" ? "warning" : "info"} /> },
        { key: "timestamp", header: "Timestamp", render: (e) => <span className="text-muted-foreground">{e.timestamp}</span> },
      ]}
      data={events} keyExtractor={(e) => e.id}
      loading={isLoading} emptyTitle="No security events"
    />
  )
}
