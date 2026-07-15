"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { useTeachers } from "@/hooks/queries"

interface Teacher {
  id: string
  teacher_id: string
  full_name: string
  email: string
  department: string | null
  is_active: boolean
}

export default function DirectorTeachers() {
  const { data: teachers, isLoading } = useTeachers()
  const [search, setSearch] = useState("")

  const teachersList = teachers || []

  const filtered = search
    ? teachersList.filter((t: any) =>
        t.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        t.email?.toLowerCase().includes(search.toLowerCase())
      )
    : teachersList

  return (
    <GenericListPage
      title="Teachers"
      description="Manage teaching staff and their class assignments"
      columns={[
        { key: "name", header: "Name", render: (t: any) => <span className="font-medium">{t.full_name}</span> },
        { key: "email", header: "Email", render: (t: any) => <span className="text-muted-foreground">{t.email}</span> },
        { key: "department", header: "Department", render: (t: any) => <span className="text-muted-foreground">{t.department || "-"}</span> },
        { key: "status", header: "Status", render: (t: any) => <StatusBadge status={t.is_active ? "active" : "inactive"} /> },
        { key: "actions", header: "", render: () => <Button variant="ghost" size="sm">View</Button> },
      ]}
      data={filtered}
      keyExtractor={(t: any) => t.id}
      loading={isLoading}
      searchPlaceholder="Search teachers..."
      onSearch={setSearch}
      onCreateLabel="Add Teacher"
      onCreateClick={() => window.location.href = "/director/teachers/new"}
      emptyTitle="No teachers found"
    />
  )
}
