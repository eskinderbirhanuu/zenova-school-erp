"use client"

import { useEffect, useState } from "react"
import { KPICard } from "@/components/ui/kpi-card"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, Activity, Cloud, Database, Gauge, Timer, Server, HardDrive, Wifi, CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import api from "@/services/api"

export default function SuperAdminMonitoring() {
  const [metrics, setMetrics] = useState<any>(null)
  const [health, setHealth] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [uptime, setUptime] = useState(0)

  useEffect(() => {
    const start = Date.now()
    const interval = setInterval(() => setUptime(Math.floor((Date.now() - start) / 1000)), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    Promise.all([
      api.get("/iga/metrics"),
      api.get("/iga/health-summary"),
    ]).then(([m, h]) => {
      setMetrics(m.data)
      setHealth(h.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const formatUptime = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const s = metrics?.summary || {}
  const f = metrics?.finance || {}
  const u = metrics?.users || {}
  const servers = health?.servers || []

  return (
    <div className="space-y-6">
      <PageHeader title="IGA System Health" description="Platform-wide monitoring and performance metrics" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <KPICard title="Server Status" value={health?.status === "healthy" ? "Healthy" : "Degraded"} icon={Server} iconColor={health?.status === "healthy" ? "text-green-600" : "text-yellow-600"} />
        <KPICard title="Database" value={health?.checks?.database === "healthy" ? "Connected" : "Unhealthy"} icon={Database} iconColor="text-purple-600" />
        <KPICard title="Server ID" value={health?.checks?.server_identity === "healthy" ? "Registered" : "Missing"} icon={Cloud} iconColor="text-sky-600" />
        <KPICard title="Revenue MTD" value={`$${(f.revenue_last_30d || 0).toLocaleString()}`} icon={Gauge} iconColor="text-orange-600" />
        <KPICard title="Uptime" value={formatUptime(uptime)} icon={Timer} iconColor="text-blue-600" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">Registered Servers</CardTitle><CardDescription>All server identities across the platform</CardDescription></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-4 font-medium">Server ID</th>
                  <th className="p-4 font-medium">Role</th>
                  <th className="p-4 font-medium">VPS</th>
                  <th className="p-4 font-medium">Sync</th>
                </tr>
              </thead>
              <tbody>
                {servers.length === 0 && (
                  <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No servers registered</td></tr>
                )}
                {servers.map((sv: any, i: number) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4 font-mono text-xs font-medium">{sv.server_id?.slice(0, 12)}...</td>
                    <td className="p-4">
                      <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary">{sv.role || "—"}</span>
                    </td>
                    <td className="p-4 text-muted-foreground font-mono text-xs">{sv.vps_url || "Local"}</td>
                    <td className="p-4">{sv.sync_enabled ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">Platform Summary</CardTitle><CardDescription>Aggregate platform metrics</CardDescription></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-4 font-medium">Metric</th>
                  <th className="p-4 font-medium">Value</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "Total Schools", value: String(s.total_schools || 0) },
                  { name: "Active Licenses", value: String(s.active_licenses || 0) },
                  { name: "Expiring (30d)", value: String(s.expiring_within_30d || 0), warn: (s.expiring_within_30d || 0) > 0 },
                  { name: "Total Revenue", value: `$${(f.total_revenue || 0).toLocaleString()}` },
                  { name: "Students", value: String(u.students || 0) },
                  { name: "Teachers", value: String(u.teachers || 0) },
                  { name: "Staff", value: String(u.staff || 0) },
                  { name: "Parents", value: String(u.parents || 0) },
                  { name: "Branches", value: String(u.branches || 0) },
                  { name: "Audit Events (30d)", value: String(metrics?.activity?.audit_events_last_30d || 0) },
                ].map((m, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4 font-medium">{m.name}</td>
                    <td className={`p-4 font-mono text-xs ${m.warn ? "text-yellow-600" : "text-muted-foreground"}`}>
                      {m.warn && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                      {m.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-lg">Recent Audit Activity</CardTitle><CardDescription>Latest 20 audit events across the platform</CardDescription></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-4 font-medium">Action</th>
                <th className="p-4 font-medium">Table</th>
                <th className="p-4 font-medium">User</th>
                <th className="p-4 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {(metrics?.activity?.recent_audit || []).length === 0 && (
                <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No audit events</td></tr>
              )}
              {(metrics?.activity?.recent_audit || []).map((a: any, i: number) => (
                <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="p-4 font-medium">{a.action || "—"}</td>
                  <td className="p-4 font-mono text-xs">{a.table_name || "—"}</td>
                  <td className="p-4 text-muted-foreground font-mono text-xs">{a.user_id?.slice(0, 8) || "—"}</td>
                  <td className="p-4 text-muted-foreground text-xs">
                    {a.created_at ? new Date(a.created_at).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
