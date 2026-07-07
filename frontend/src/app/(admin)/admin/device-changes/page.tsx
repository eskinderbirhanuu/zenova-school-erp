"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { deviceReviewService } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { HardDrive, RefreshCw } from "lucide-react"

export default function AdminDeviceChanges() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = () => {
    setLoading(true)
    deviceReviewService.list("pending")
      .then(res => {
        const all = res.data.requests || []
        setRequests(all)
      })
      .catch(err => toast({ title: "Failed to load", description: err.response?.data?.detail || err.message, variant: "destructive" }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [])

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Device Changes</h1>
          <p className="text-sm text-muted-foreground mt-1">Pending hardware change requests for your school</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetch} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse" />)}</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <HardDrive className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No pending requests</p>
          <p className="text-sm">All device changes have been reviewed</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted-foreground">{req.id}</span>
                  <StatusBadge status={req.status} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">Match Rate</span>
                  <p>{req.match_count}/{req.total_components} components</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Requested</span>
                  <p>{req.created_at ? new Date(req.created_at).toLocaleString() : "—"}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
