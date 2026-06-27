"use client"

import { useEffect, useState } from "react"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import api from "@/services/api"
import { toast } from "@/hooks/use-toast"

export default function StudentAttendancePage() {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get("/attendance", { params: { limit: 200 } })
      .then(res => setRecords(res.data || []))
      .catch(err => toast({ title: "Failed to load attendance", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [])

  const normalized = records.map((r: any) => ({
    id: r.id,
    date: r.date ? new Date(r.date).toLocaleDateString() : "—",
    subject: r.subject_name || r.class_name || "—",
    time: r.check_in ? r.check_in : "—",
    status: r.status || "unknown",
  }))

  return (
    <GenericListPage
      title="My Attendance" description="View your attendance records"
      columns={[
        { key: "date", header: "Date", render: (r) => <span className="text-muted-foreground">{r.date}</span> },
        { key: "subject", header: "Subject", render: (r) => <span className="font-medium">{r.subject}</span> },
        { key: "time", header: "Time", render: (r) => <span>{r.time}</span> },
        { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      data={normalized} keyExtractor={(r) => r.id}
      loading={loading} emptyTitle="No attendance records"
    />
  )
}
