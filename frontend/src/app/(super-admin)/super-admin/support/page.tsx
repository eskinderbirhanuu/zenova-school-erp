"use client"

import { useEffect, useState } from "react"
import { KPICard } from "@/components/ui/kpi-card"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import api from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { MessageSquare, Loader2, Search, CheckCircle, Clock, AlertCircle } from "lucide-react"

const priorityBadge = (p: string) => {
  const styles: Record<string, string> = {
    High: "bg-red-100 text-red-700",
    Medium: "bg-yellow-100 text-yellow-700",
    Low: "bg-green-100 text-green-700",
  }
  return <span className={`rounded-full px-2 py-0.5 text-xs ${styles[p] || ""}`}>{p}</span>
}

const statusBadge = (s: string) => {
  const styles: Record<string, string> = {
    Open: "bg-blue-100 text-blue-700",
    "In Progress": "bg-yellow-100 text-yellow-700",
    Resolved: "bg-green-100 text-green-700",
  }
  return <span className={`rounded-full px-2 py-0.5 text-xs ${styles[s] || ""}`}>{s}</span>
}

export default function SuperAdminSupport() {
  const [tickets, setTickets] = useState<any[]>([])
  const [counts, setCounts] = useState({ total: 0, open: 0, in_progress: 0, resolved: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("All")

  useEffect(() => {
    setLoading(true)
    api.get("/support/tickets", { params: { limit: 200 } })
      .then(res => setTickets(res.data || []))
      .catch(err => toast({ title: "Failed to load tickets", variant: "destructive" }))
      .finally(() => setLoading(false))
    api.get("/support/tickets/counts")
      .then(res => setCounts(res.data))
      .catch(() => {})
  }, [])

  const filtered = tickets.filter((t) => {
    const matchesSearch = !search || t.subject?.toLowerCase().includes(search.toLowerCase()) || t.school_name?.toLowerCase().includes(search.toLowerCase()) || t.ticket_number?.toLowerCase().includes(search.toLowerCase())
    const matchesFilter = filter === "All" || t.status === filter || t.priority === filter
    return matchesSearch && matchesFilter
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Support Center" description="Manage support tickets across all schools" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Open Tickets" value={counts.open} icon={AlertCircle} iconColor="text-blue-600" />
        <KPICard title="In Progress" value={counts.in_progress} icon={Clock} iconColor="text-yellow-600" />
        <KPICard title="Resolved" value={counts.resolved} icon={CheckCircle} iconColor="text-green-600" />
        <KPICard title="Total Tickets" value={counts.total} icon={MessageSquare} iconColor="text-purple-600" />
      </div>
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end justify-between">
        <div className="flex flex-col gap-1.5 w-full sm:w-72">
          <label className="text-sm font-medium">Search</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search tickets..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {["All", "Open", "In Progress", "Resolved", "High", "Medium", "Low"].map((f) => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>{f}</Button>
          ))}
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-lg">{loading ? "Loading..." : `${filtered.length} ticket${filtered.length !== 1 ? "s" : ""}`}</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No tickets found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-4 font-medium">ID</th>
                  <th className="p-4 font-medium">School</th>
                  <th className="p-4 font-medium">Subject</th>
                  <th className="p-4 font-medium">Priority</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Created</th>
                  <th className="p-4 font-medium">Assigned To</th>
                  <th className="p-4 font-medium w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4 font-mono text-xs">{t.ticket_number}</td>
                    <td className="p-4 text-muted-foreground">{t.school_name || "—"}</td>
                    <td className="p-4 font-medium max-w-[250px] truncate">{t.subject}</td>
                    <td className="p-4">{priorityBadge(t.priority)}</td>
                    <td className="p-4">{statusBadge(t.status)}</td>
                    <td className="p-4 text-muted-foreground">{t.created_at ? new Date(t.created_at).toLocaleDateString() : "—"}</td>
                    <td className="p-4 text-muted-foreground">{t.assigned_name || "—"}</td>
                    <td className="p-4"><Button variant="ghost" size="sm">View</Button></td>
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
