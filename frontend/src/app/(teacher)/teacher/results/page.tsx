"use client"

import { useState } from "react"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { useExamResults } from "@/hooks/queries"

export default function TeacherResultsPage() {
  const [search, setSearch] = useState("")
  const { data, isLoading } = useExamResults({})

  const results = data || []
  const normalized = results.map((r: any) => ({
    id: r.id,
    student: r.student_name || r.student_id || "—",
    subject: r.subject_name || r.exam_name || "—",
    score: r.score || r.marks_obtained || 0,
    grade: r.grade || "—",
    term: r.term || r.exam_type || "—",
  }))

  const filtered = normalized.filter((r: any) => !search || r.student?.toLowerCase().includes(search.toLowerCase()))

  return (
    <GenericListPage
      title="Exam Results" description="View and manage student exam results"
      columns={[
        { key: "student", header: "Student", render: (r) => <span className="font-medium">{r.student}</span> },
        { key: "subject", header: "Subject", render: (r) => <span className="text-muted-foreground">{r.subject}</span> },
        { key: "score", header: "Score", render: (r) => <span>{r.score}</span> },
        { key: "grade", header: "Grade", render: (r) => <span className="font-mono font-bold">{r.grade}</span> },
        { key: "term", header: "Term", render: (r) => <span className="text-muted-foreground">{r.term}</span> },
      ]}
      data={filtered} keyExtractor={(r) => r.id}
      loading={isLoading} searchPlaceholder="Search student..." onSearch={setSearch}
      emptyTitle="No results found"
    />
  )
}
