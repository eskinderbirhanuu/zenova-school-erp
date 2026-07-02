"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { hrService } from "@/services/api"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Check, X, Loader2 } from "lucide-react"

export default function LeaveRequestsPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("")

  const fetchRequests = () => {
    setLoading(true)
    const params: any = { limit: 200 }
    if (statusFilter) params.status = statusFilter
    hrService.leaveRequests.list(params)
      .then((res) => setRequests(res.data || []))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchRequests() }, [statusFilter])

  const handleAction = async (id: string, action: "approve" | "reject") => {
    try {
      if (action === "approve") await hrService.leaveRequests.approve(id)
      else await hrService.leaveRequests.reject(id)
      fetchRequests()
    } catch {}
  }

  const normalized = requests.map((r: any) => ({
    id: r.id,
    staff: r.staff_profile_id || "—",
    type: r.leave_type?.name || r.leave_type_id || "—",
    dates: `${r.start_date} to ${r.end_date}`,
    days: r.days || "—",
    status: r.status || "pending",
    reason: r.reason || "",
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leave Requests</h1>
          <p className="text-gray-600">Manage employee leave requests.</p>
        </div>
        <div className="flex gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm">
            <option value="">All status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <Button onClick={() => router.push("/hr/leave-requests/new")}>
            <Plus className="h-4 w-4 mr-1" /> New Request
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
      ) : normalized.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-gray-500">No leave requests found.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {normalized.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{r.staff}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{r.type} — {r.dates} ({r.days} days)</p>
                    {r.reason && <p className="text-xs text-gray-400 mt-0.5">{r.reason}</p>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {r.status === "pending" && (
                      <>
                        <button onClick={() => handleAction(r.id, "approve")}
                          className="p-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100">
                          <Check className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleAction(r.id, "reject")}
                          className="p-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100">
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
