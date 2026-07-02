"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { hrService } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export default function NewLeaveRequestPage() {
  const router = useRouter()
  const [leaveTypes, setLeaveTypes] = useState<any[]>([])
  const [staffProfiles, setStaffProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    staff_profile_id: "",
    leave_type_id: "",
    start_date: "",
    end_date: "",
    reason: "",
  })

  useEffect(() => {
    Promise.all([
      hrService.leaveRequests.list({ limit: 1 }).catch(() => ({ data: [] })),
    ])
    Promise.all([
      (async () => {
        const res = await import("@/services/api").then(m => m.default.get("/staff"))
        return res.data || []
      })(),
      fetch("/api/v1/leave-types").then(r => r.json()),
    ]).then(([staff, types]) => {
      setStaffProfiles(staff || [])
      setLeaveTypes(types || [])
    }).finally(() => setLoading(false))
  }, [])

  const handleSubmit = async () => {
    if (!form.staff_profile_id || !form.leave_type_id || !form.start_date || !form.end_date) {
      setError("Please fill in all required fields")
      return
    }
    setSaving(true)
    setError("")
    try {
      await hrService.leaveRequests.create({
        staff_profile_id: form.staff_profile_id,
        leave_type_id: form.leave_type_id,
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason || undefined,
      })
      router.push("/hr/leave-requests")
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to create leave request")
    }
    setSaving(false)
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">New Leave Request</h1>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>}

      <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member *</label>
          <select value={form.staff_profile_id}
            onChange={(e) => setForm({ ...form, staff_profile_id: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm">
            <option value="">Select staff</option>
            {staffProfiles.map((s: any) => (
              <option key={s.id || s.user_id} value={s.id || s.user_id}>{s.full_name || s.name || s.email}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type *</label>
          <select value={form.leave_type_id}
            onChange={(e) => setForm({ ...form, leave_type_id: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm">
            <option value="">Select leave type</option>
            {leaveTypes.map((t: any) => (
              <option key={t.id} value={t.id}>{t.name} ({t.default_days} days) {t.is_paid ? "Paid" : "Unpaid"}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
            <input type="date" value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
            <input type="date" value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
          <textarea value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm" rows={3} />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
          Submit
        </Button>
      </div>
    </div>
  )
}
