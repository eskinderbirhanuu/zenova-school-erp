"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { studentService } from "@/services/api"
import { Upload, Download } from "lucide-react"
import Link from "next/link"
import api from "@/services/api"

interface Student {
  id: string
  student_id: string
  first_name: string
  last_name: string
  grade_id: string | null
  status: string
}

export default function RegistrarStudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    studentService.list({ limit: 50 }).then((res) => setStudents(res.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const exportExcel = () => {
    api.get("/students/export-excel", { responseType: "blob" }).then((res) => {
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement("a"); a.href = url; a.download = "students.xlsx"; a.click()
      URL.revokeObjectURL(url)
    }).catch(() => {})
  }

  const filtered = search
    ? students.filter((s) =>
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
        s.student_id?.includes(search)
      )
    : students

  return (
    <GenericListPage
      title="Students"
      description="Manage student registrations and academic records"
      columns={[
        { key: "id", header: "ID", render: (s) => <span className="font-mono text-xs text-muted-foreground">{s.student_id}</span> },
        { key: "name", header: "Name", render: (s) => <span className="font-medium">{s.first_name} {s.last_name}</span> },
        { key: "class", header: "Class", render: (s) => <span className="text-muted-foreground">{s.grade_id || "-"}</span> },
        { key: "status", header: "Status", render: (s) => <StatusBadge status={s.status} /> },
        { key: "actions", header: "", render: (s) => <Link href={`/registrar/students/${s.id}`}><Button variant="ghost" size="sm">View</Button></Link> },
      ]}
      data={filtered}
      keyExtractor={(s) => s.id}
      loading={loading}
      searchPlaceholder="Search by name or ID..."
      onSearch={setSearch}
      onCreateLabel="Register Student"
      onCreateClick={() => window.location.href = "/registrar/students/new"}
      emptyTitle="No students found"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportExcel}><Download className="h-4 w-4 mr-2" /> Export</Button>
          <Link href="/registrar/students/import">
            <Button variant="outline"><Upload className="h-4 w-4 mr-2" /> Import</Button>
          </Link>
        </div>
      }
    />
  )
}
