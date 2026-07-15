"use client"

import { useRouter } from "next/navigation"
import { useStudents } from "@/hooks/queries"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function AdminStudentsPage() {
  const router = useRouter()
  const { data: students, isLoading } = useStudents({ limit: 200 })

  const normalized = (students || []).map((s) => ({
    id: s.id,
    name: `${s.first_name || ""} ${s.middle_name || ""} ${s.last_name || ""}`.trim(),
    id_number: s.student_id || "—",
    class: s.grade_name || "—",
    status: s.status || "active",
  }))

  return (
    <GenericListPage
      title="Students"
      description="View and manage all enrolled students."
      columns={[
        { key: "name", header: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "id_number", header: "Student ID", render: (r) => <span className="font-mono text-xs">{r.id_number}</span> },
        { key: "class", header: "Class", render: (r) => <span>{r.class}</span> },
        { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      data={normalized}
      keyExtractor={(r) => r.id}
      loading={isLoading}
      emptyTitle="No students enrolled"
      onRowClick={(r) => router.push(`/admin/students/${r.id}`)}
      actions={
        <Button onClick={() => router.push("/admin/students/register")}>
          <Plus className="mr-2 h-4 w-4" /> Register New
        </Button>
      }
    />
  )
}
