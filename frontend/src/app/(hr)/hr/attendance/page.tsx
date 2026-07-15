"use client"

import { useState } from "react"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { useAttendance } from "@/hooks/queries"

export default function HrAttendancePage() {
  const { data: records, isLoading } = useAttendance({ limit: 200 } as any)
  const [search, setSearch] = useState("")

  const recordsList = records || []

  const normalized = recordsList.map((r: any) => ({
    id: r.id,
    employee: r.staff_profile_id || "—",
    date: r.date ? new Date(r.date).toLocaleDateString() : "—",
    checkIn: r.check_in || "—",
    checkOut: r.check_out || "—",
    status: r.status || "unknown",
  }))

  const filtered = normalized.filter((r: any) => !search || r.employee?.toLowerCase().includes(search.toLowerCase()))

  return (
    <GenericListPage
      title="Attendance" description="Track employee attendance"
      columns={[
        { key: "employee", header: "Employee", render: (r: any) => <span className="font-medium">{r.employee}</span> },
        { key: "date", header: "Date", render: (r: any) => <span>{r.date}</span> },
        { key: "in", header: "Check In", render: (r: any) => <span>{r.checkIn}</span> },
        { key: "out", header: "Check Out", render: (r: any) => <span>{r.checkOut}</span> },
        { key: "status", header: "Status", render: (r: any) => <StatusBadge status={r.status} /> },
      ]}
      data={filtered} keyExtractor={(r: any) => r.id}
      loading={isLoading} searchPlaceholder="Search employee..." onSearch={setSearch}
      emptyTitle="No attendance records"
    />
  )
}
