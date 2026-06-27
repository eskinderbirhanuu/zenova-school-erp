"use client"

import { useEffect, useState } from "react"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { studentService } from "@/services/api"

export default function TeacherStudentsPage() {
  const [students, setStudents] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    studentService.list({ limit: 100 }).then((r: any) => setStudents(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filtered = students.filter(s => !search || `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()) || s.student_id?.includes(search))

  return (
    <GenericListPage
      title="Students" description="View your assigned students"
      columns={[
        { key: "id", header: "ID", render: (s) => <span className="font-mono text-xs text-muted-foreground">{s.student_id}</span> },
        { key: "name", header: "Name", render: (s) => <span className="font-medium">{s.first_name} {s.last_name}</span> },
        { key: "class", header: "Class", render: (s) => <span className="text-muted-foreground">{s.grade_id || "-"}</span> },
        { key: "status", header: "Status", render: (s) => <StatusBadge status={s.status} /> },
      ]}
      data={filtered} keyExtractor={(s) => s.id}
      loading={loading} searchPlaceholder="Search by name or ID..." onSearch={setSearch}
      emptyTitle="No students found"
    />
  )
}
