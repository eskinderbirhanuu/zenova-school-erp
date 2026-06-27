"use client"

import { useEffect, useState } from "react"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { auditService } from "@/services/api"
import { toast } from "@/hooks/use-toast"

export default function AuditorSecurity() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    auditService.list({ limit: 200, type: "security" })
      .then((res) => {
        const raw = res.data?.data || res.data || []
        setEvents(raw.map((l: any) => ({
          id: l.id,
          event: l.action || l.event || l.description || "—",
          source: l.ip_address || l.source || "—",
          user: l.user || "—",
          severity: l.severity || "info",
          timestamp: l.created_at ? new Date(l.created_at).toLocaleString() : l.timestamp || "—",
        })))
      })
      .catch(() => toast({ title: "Error", description: "Failed to load security events", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [])

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
      loading={loading} emptyTitle="No security events"
    />
  )
}
