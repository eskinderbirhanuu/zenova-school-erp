"use client"

import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { useStudentAssignments } from "@/hooks/queries"

export default function StudentAssignmentsPage() {
  const { data: assignments, isLoading: loading } = useStudentAssignments({ limit: 200 })

  const normalized = (assignments ?? []).map((a: any) => ({
    id: a.id,
    title: a.title || "—",
    subject: a.subject || "—",
    dueDate: a.due_date ? new Date(a.due_date).toLocaleDateString() : "—",
    status: a.status || "pending",
    grade: a.grade || null,
  }))

  return (
    <GenericListPage
      title="Assignments" description="View and submit your assignments"
      columns={[
        { key: "title", header: "Title", render: (a) => <span className="font-medium">{a.title}</span> },
        { key: "subject", header: "Subject", render: (a) => <span>{a.subject}</span> },
        { key: "due", header: "Due Date", render: (a) => <span className="text-muted-foreground">{a.dueDate}</span> },
        { key: "status", header: "Status", render: (a) => <StatusBadge status={a.status} /> },
        { key: "grade", header: "Grade", render: (a) => <span className="font-mono font-medium">{a.grade || "\u2014"}</span> },
      ]}
      data={normalized} keyExtractor={(a) => a.id}
      loading={loading} emptyTitle="No assignments"
    />
  )
}
