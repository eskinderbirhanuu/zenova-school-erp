"use client"

import { useEffect, useState } from "react"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import api from "@/services/api"

export default function ParentAttendance() {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get("/attendance", { params: { limit: 200 } })
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : res.data?.data || res.data?.attendance || []
        setRecords(
          data.map((r: any) => ({
            id: r.id,
            child: r.student_name || r.child_name || r.child || "—",
            date: r.date || r.attendance_date || "—",
            subject: r.subject_name || r.class_name || "—",
            status: r.status || r.attendance_status || "unknown",
          }))
        )
      })
      .catch(() => {
        setRecords([])
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <GenericListPage
      title="Attendance" description="View your children's attendance records"
      columns={[
        { key: "child", header: "Child", render: (r) => <span className="font-medium">{r.child}</span> },
        { key: "date", header: "Date", render: (r) => <span className="text-muted-foreground">{r.date}</span> },
        { key: "subject", header: "Subject", render: (r) => <span>{r.subject}</span> },
        { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      data={records} keyExtractor={(r) => r.id}
      loading={loading} emptyTitle="No attendance records"
    />
  )
}
