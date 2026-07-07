"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { auditService } from "@/services/api"
import { ClipboardList, Search, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function DirectorAudit() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    setLoading(true)
    auditService
      .list({ limit: 50 })
      .then((r: any) => setLogs(r.data?.logs || []))
      .catch(() => toast({ title: "Failed to load audit logs", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [])

  const filtered = logs.filter(
    (l) => !search || l.action?.toLowerCase().includes(search.toLowerCase()) || l.user?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Audit Logs</h1>
      </div>
      <div className="flex gap-4 items-end max-w-xs">
        <div className="flex flex-col gap-1.5 flex-1">
          <label className="text-sm font-medium">Search</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search logs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
          </div>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-lg">{loading ? "Loading..." : `${filtered.length} log${filtered.length !== 1 ? "s" : ""}`}</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-12">
              <ClipboardList className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No records found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-4 font-medium">Action</th>
                  <th className="p-4 font-medium">User</th>
                  <th className="p-4 font-medium">Resource</th>
                  <th className="p-4 font-medium">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l: any) => (
                  <tr key={l.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4"><span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs">{l.action}</span></td>
                    <td className="p-4 font-medium">{l.user}</td>
                    <td className="p-4 text-muted-foreground">{l.resource}</td>
                    <td className="p-4 text-muted-foreground">{new Date(l.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
