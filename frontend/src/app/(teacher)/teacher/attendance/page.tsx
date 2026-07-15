"use client"

import { useRouter } from "next/navigation"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { Button } from "@/components/ui/button"
import { Plus, QrCode } from "lucide-react"
import { useAttendance } from "@/hooks/queries"

export default function TeacherAttendancePage() {
  const router = useRouter()
  const { data: records, isLoading: loading } = useAttendance({ limit: 200 })

  const normalized = (records || []).map((r: any) => ({
    id: r.id,
    date: r.date ? new Date(r.date).toLocaleDateString() : "—",
    student: r.student_id || r.staff_profile_id || "—",
    time: r.check_in ? new Date(r.date + "T" + r.check_in).toLocaleTimeString() : "—",
    status: r.status || "unknown",
  }))

  return (
    <GenericListPage
      title="Attendance" description="Mark and view student attendance"
      columns={[
        { key: "date", header: "Date", render: (r) => <span>{r.date}</span> },
        { key: "student", header: "Student", render: (r) => <span className="font-medium">{r.student}</span> },
        { key: "time", header: "Time", render: (r) => <span className="text-muted-foreground">{r.time}</span> },
        { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      data={normalized} keyExtractor={(r) => r.id}
      loading={loading} emptyTitle="No attendance records"
      actions={<>
        <Button variant="outline" onClick={() => router.push("/teacher/attendance/scanner")}><QrCode className="mr-2 h-4 w-4" /> Scan QR</Button>
        <Button onClick={() => router.push("/teacher/attendance/mark")}><Plus className="mr-2 h-4 w-4" /> Mark Attendance</Button>
      </>}
    />
  )
}
