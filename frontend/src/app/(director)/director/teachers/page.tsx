"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { teacherService } from "@/services/api"
import { toast } from "@/hooks/use-toast"

interface Teacher {
  id: string
  teacher_id: string
  full_name: string
  email: string
  department: string | null
  is_active: boolean
}

export default function DirectorTeachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    setLoading(true)
    teacherService.list().then((res) => setTeachers(res.data)).catch(() => toast({ title: "Failed to load teachers", variant: "destructive" })).finally(() => setLoading(false))
  }, [])

  const filtered = search
    ? teachers.filter((t) =>
        t.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        t.email?.toLowerCase().includes(search.toLowerCase())
      )
    : teachers

  return (
    <GenericListPage
      title="Teachers"
      description="Manage teaching staff and their class assignments"
      columns={[
        { key: "name", header: "Name", render: (t) => <span className="font-medium">{t.full_name}</span> },
        { key: "email", header: "Email", render: (t) => <span className="text-muted-foreground">{t.email}</span> },
        { key: "department", header: "Department", render: (t) => <span className="text-muted-foreground">{t.department || "-"}</span> },
        { key: "status", header: "Status", render: (t) => <StatusBadge status={t.is_active ? "active" : "inactive"} /> },
        { key: "actions", header: "", render: () => <Button variant="ghost" size="sm">View</Button> },
      ]}
      data={filtered}
      keyExtractor={(t) => t.id}
      loading={loading}
      searchPlaceholder="Search teachers..."
      onSearch={setSearch}
      onCreateLabel="Add Teacher"
      onCreateClick={() => window.location.href = "/director/teachers/new"}
      emptyTitle="No teachers found"
    />
  )
}
