"use client"

import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { useAttendance } from "@/hooks/queries"

export default function ParentAttendance() {
  const { data: records, isLoading } = useAttendance({ limit: 200 })

  const normalized = ((records as any[]) || []).map((r: any) => ({
    id: r.id,
    child: r.student_name || r.child_name || r.child || "—",
    date: r.date || r.attendance_date || "—",
    subject: r.subject_name || r.class_name || "—",
    status: r.status || r.attendance_status || "unknown",
  }))

  return (
    <GenericListPage
      title="Attendance" description="View your children's attendance records"
      columns={[
        { key: "child", header: "Child", render: (r) => <span className="font-medium">{r.child}</span> },
        { key: "date", header: "Date", render: (r) => <span className="text-muted-foreground">{r.date}</span> },
        { key: "subject", header: "Subject", render: (r) => <span>{r.subject}</span> },
        { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      data={normalized} keyExtractor={(r) => r.id}
      loading={isLoading} emptyTitle="No attendance records"
    />
  )
}
