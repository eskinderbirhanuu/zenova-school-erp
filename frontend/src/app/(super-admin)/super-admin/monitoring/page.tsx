"use client"

import { useEffect, useState } from "react"
import { KPICard } from "@/components/ui/kpi-card"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Activity, Cloud, Database, Gauge, Timer, Server, HardDrive, Wifi, CheckCircle, XCircle, AlertTriangle } from "lucide-react"

export default function SuperAdminMonitoring() {
  const [uptime, setUptime] = useState(0)

  useEffect(() => {
    const start = Date.now()
    const interval = setInterval(() => {
      setUptime(Math.floor((Date.now() - start) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const formatUptime = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`
  }

  const servers = [
    { name: "Web Server", cpu: 52, memory: 68, disk: 42, status: "healthy" },
    { name: "API Server", cpu: 38, memory: 55, disk: 31, status: "healthy" },
    { name: "Database Server", cpu: 65, memory: 72, disk: 58, status: "healthy" },
    { name: "Cache Server", cpu: 22, memory: 45, disk: 18, status: "healthy" },
  ]

  const dbMetrics = [
    { name: "Connection Pool", value: "42/100", status: "healthy" },
    { name: "Query Latency", value: "12ms avg", status: "healthy" },
    { name: "Replication Lag", value: "0.5s", status: "warning" },
    { name: "Active Queries", value: "7", status: "healthy" },
    { name: "Storage Used", value: "234 GB / 500 GB", status: "healthy" },
  ]

  const apiEndpoints = [
    { endpoint: "/api/v1/auth", status: "operational", latency: "45ms" },
    { endpoint: "/api/v1/schools", status: "operational", latency: "120ms" },
    { endpoint: "/api/v1/licenses", status: "operational", latency: "85ms" },
    { endpoint: "/api/v1/users", status: "operational", latency: "95ms" },
    { endpoint: "/api/v1/audit-logs", status: "operational", latency: "110ms" },
    { endpoint: "/api/v1/reports", status: "degraded", latency: "450ms" },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="System Health" description="Real-time platform monitoring and status" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <KPICard title="Server Status" value="Operational" icon={Server} iconColor="text-green-600" />
        <KPICard title="Cloud Status" value="All Good" icon={Cloud} iconColor="text-sky-600" />
        <KPICard title="Database Health" value="Connected" icon={Database} iconColor="text-purple-600" />
        <KPICard title="API Response" value="98ms avg" icon={Gauge} iconColor="text-orange-600" />
        <KPICard title="Uptime" value={formatUptime(uptime)} icon={Timer} iconColor="text-blue-600" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">Server Resources</CardTitle><CardDescription>CPU, memory, and disk usage across servers</CardDescription></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-4 font-medium">Server</th>
                  <th className="p-4 font-medium">CPU</th>
                  <th className="p-4 font-medium">Memory</th>
                  <th className="p-4 font-medium">Disk</th>
                  <th className="p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {servers.map((s) => (
                  <tr key={s.name} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4 font-medium">{s.name}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${s.cpu > 80 ? "bg-red-500" : s.cpu > 60 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${s.cpu}%` }} />
                        </div>
                        <span className="text-xs">{s.cpu}%</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${s.memory > 80 ? "bg-red-500" : s.memory > 60 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${s.memory}%` }} />
                        </div>
                        <span className="text-xs">{s.memory}%</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${s.disk > 80 ? "bg-red-500" : s.disk > 60 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${s.disk}%` }} />
                        </div>
                        <span className="text-xs">{s.disk}%</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {s.status === "healthy" ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">Database Health</CardTitle><CardDescription>Database performance metrics</CardDescription></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-4 font-medium">Metric</th>
                  <th className="p-4 font-medium">Value</th>
                  <th className="p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {dbMetrics.map((m) => (
                  <tr key={m.name} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4 font-medium">{m.name}</td>
                    <td className="p-4 text-muted-foreground font-mono text-xs">{m.value}</td>
                    <td className="p-4">
                      {m.status === "healthy" ? <CheckCircle className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-lg">API Endpoints Health</CardTitle><CardDescription>Status and response times for all API endpoints</CardDescription></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-4 font-medium">Endpoint</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Latency</th>
              </tr>
            </thead>
            <tbody>
              {apiEndpoints.map((ep) => (
                <tr key={ep.endpoint} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="p-4 font-mono text-xs font-medium">{ep.endpoint}</td>
                  <td className="p-4">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${ep.status === "operational" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{ep.status}</span>
                  </td>
                  <td className="p-4 text-muted-foreground font-mono text-xs">{ep.latency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Network Throughput</CardTitle>
            <Wifi className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.4 Gbps</div>
            <p className="text-xs text-muted-foreground">Inbound / Outbound</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Storage</CardTitle>
            <HardDrive className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1.2 TB</div>
            <p className="text-xs text-muted-foreground">234 GB used (19%)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <Activity className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0.02%</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
