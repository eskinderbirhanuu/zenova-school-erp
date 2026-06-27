"use client"

import { useEffect, useState } from "react"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { studentService } from "@/services/api"

export default function ParentChildrenPage() {
  const [children, setChildren] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    studentService.list({ limit: 10 }).then((r: any) => setChildren(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <GenericListPage
      title="My Children" description="View your children's academic information"
      columns={[
        { key: "id", header: "ID", render: (c) => <span className="font-mono text-xs text-muted-foreground">{c.student_id}</span> },
        { key: "name", header: "Name", render: (c) => <span className="font-medium">{c.first_name} {c.last_name}</span> },
        { key: "class", header: "Class", render: (c) => <span className="text-muted-foreground">{c.grade_id || "-"}</span> },
        { key: "status", header: "Status", render: (c) => <StatusBadge status={c.status} /> },
      ]}
      data={children} keyExtractor={(c) => c.id}
      loading={loading} emptyTitle="No children linked to your account"
    />
  )
}
