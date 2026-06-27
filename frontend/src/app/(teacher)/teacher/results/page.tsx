"use client"

import { useEffect, useState } from "react"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { academicService } from "@/services/api"
import { toast } from "@/hooks/use-toast"

export default function TeacherResultsPage() {
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    setLoading(true)
    academicService.examResults.list({ limit: 200 })
      .then(res => setResults(res.data || []))
      .catch(err => toast({ title: "Failed to load results", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [])

  const normalized = results.map((r: any) => ({
    id: r.id,
    student: r.student_name || r.student_id || "—",
    subject: r.subject_name || r.exam_name || "—",
    score: r.score || r.marks_obtained || 0,
    grade: r.grade || "—",
    term: r.term || r.exam_type || "—",
  }))

  const filtered = normalized.filter(r => !search || r.student?.toLowerCase().includes(search.toLowerCase()))

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
      loading={loading} searchPlaceholder="Search student..." onSearch={setSearch}
      emptyTitle="No results found"
    />
  )
}
