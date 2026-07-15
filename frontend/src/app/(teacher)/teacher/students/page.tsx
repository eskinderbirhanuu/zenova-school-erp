"use client"

import { useState } from "react"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { useMyStudents } from "@/hooks/queries"

export default function TeacherStudentsPage() {
  const [search, setSearch] = useState("")
  const { data, isLoading } = useMyStudents()

  const students = data || []
  const filtered = students.filter((s: any) => !search || `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()) || s.student_id?.includes(search))

  return (
    <GenericListPage
      title="Students" description="View your assigned students"
      columns={[
        { key: "id", header: "ID", render: (s) => <span className="font-mono text-xs text-muted-foreground">{s.student_id}</span> },
        { key: "name", header: "Name", render: (s) => <span className="font-medium">{s.first_name} {s.last_name}</span> },
        { key: "class", header: "Class", render: (s) => <span className="text-muted-foreground">{s.grade_name || "-"}</span> },
        { key: "status", header: "Status", render: (s) => <StatusBadge status={s.status} /> },
      ]}
      data={filtered} keyExtractor={(s) => s.id}
      loading={isLoading} searchPlaceholder="Search by name or ID..." onSearch={setSearch}
      emptyTitle="No students found"
    />
  )
}
