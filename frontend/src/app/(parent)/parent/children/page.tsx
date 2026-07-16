"use client"

import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { useStudents } from "@/hooks/queries"

export default function ParentChildrenPage() {
  const { data: children, isLoading } = useStudents({ limit: 10 })

  return (
    <GenericListPage
      title="My Children" description="View your children's academic information"
      columns={[
        { key: "id", header: "ID", render: (c) => <span className="font-mono text-xs text-muted-foreground">{c.student_id}</span> },
        { key: "name", header: "Name", render: (c) => <span className="font-medium">{c.first_name} {c.last_name}</span> },
        { key: "class", header: "Class", render: (c) => <span className="text-muted-foreground">{c.grade_id || "-"}</span> },
        { key: "status", header: "Status", render: (c) => <StatusBadge status={c.status} /> },
      ]}
      data={children || []} keyExtractor={(c) => c.id}
      loading={isLoading} emptyTitle="No children linked to your account"
    />
  )
}
