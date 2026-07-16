"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { useDeviceReviews, useApproveDeviceReview, useRejectDeviceReview } from "@/hooks/queries"
import { toast } from "@/hooks/use-toast"
import { CheckCircle2, XCircle, HardDrive } from "lucide-react"

export default function SuperAdminDeviceChanges() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const { data, isLoading } = useDeviceReviews(statusFilter)
  const approveMutation = useApproveDeviceReview()
  const rejectMutation = useRejectDeviceReview()

  const requests = (data as any)?.requests || []

  const handleApprove = async (id: string) => {
    try {
      await approveMutation.mutateAsync({ id })
      toast({ title: "Approved", description: "Device change approved" })
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.detail || err.message, variant: "destructive" })
    }
  }

  const handleReject = async (id: string) => {
    try {
      await rejectMutation.mutateAsync({ id, note: "Rejected by admin" })
      toast({ title: "Rejected", description: "Device change rejected" })
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.detail || err.message, variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Device Change Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">Review and approve hardware change requests across all schools</p>
        </div>
        <div className="flex gap-2">
          {["pending", "approved", "rejected", "auto_approved"].map((s: any) => (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? undefined : s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
              }`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i: any) => <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse" />)}</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <HardDrive className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No device change requests</p>
          <p className="text-sm">All hardware matches are within tolerance</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req: any) => (
            <div key={req.id} className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted-foreground">{req.id}</span>
                  <StatusBadge status={req.status} />
                </div>
                {req.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                      onClick={() => handleApprove(req.id)} disabled={approveMutation.isPending}>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50"
                      onClick={() => handleReject(req.id)} disabled={rejectMutation.isPending}>
                      <XCircle className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">License</span>
                  <p className="font-mono text-xs">{req.license_id}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">School</span>
                  <p className="font-mono text-xs">{req.school_id || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Match</span>
                  <p>{req.match_count}/{req.total_components} components</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Expires</span>
                  <p>{req.expires_at ? new Date(req.expires_at).toLocaleString() : "—"}</p>
                </div>
              </div>
              {req.review_note && <p className="text-xs text-muted-foreground border-t pt-2 mt-1">Note: {req.review_note}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
