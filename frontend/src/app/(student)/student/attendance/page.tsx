"use client"

import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { useAttendance } from "@/hooks/queries"

export default function StudentAttendancePage() {
  const { data: records, isLoading } = useAttendance({ limit: 200 })

  const normalized = ((records as any[]) || []).map((r: any) => ({
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
      loading={isLoading} emptyTitle="No attendance records"
    />
  )
}
