"use client"

import { useEffect, useState } from "react"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { hrService } from "@/services/api"
import { toast } from "@/hooks/use-toast"

export default function HrAttendancePage() {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    setLoading(true)
    hrService.attendance.list({ limit: 200 })
      .then(res => setRecords(res.data || []))
      .catch(err => toast({ title: "Failed to load attendance", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [])

  const normalized = records.map((r: any) => ({
    id: r.id,
    employee: r.staff_profile_id || "—",
    date: r.date ? new Date(r.date).toLocaleDateString() : "—",
    checkIn: r.check_in || "—",
    checkOut: r.check_out || "—",
    status: r.status || "unknown",
  }))

  const filtered = normalized.filter(r => !search || r.employee?.toLowerCase().includes(search.toLowerCase()))

  return (
    <GenericListPage
      title="Attendance" description="Track employee attendance"
      columns={[
        { key: "employee", header: "Employee", render: (r) => <span className="font-medium">{r.employee}</span> },
        { key: "date", header: "Date", render: (r) => <span>{r.date}</span> },
        { key: "in", header: "Check In", render: (r) => <span>{r.checkIn}</span> },
        { key: "out", header: "Check Out", render: (r) => <span>{r.checkOut}</span> },
        { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      data={filtered} keyExtractor={(r) => r.id}
      loading={loading} searchPlaceholder="Search employee..." onSearch={setSearch}
      emptyTitle="No attendance records"
    />
  )
}
