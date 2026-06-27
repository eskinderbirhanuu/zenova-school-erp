"use client"

import { useEffect, useState } from "react"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { academicService } from "@/services/api"
import { toast } from "@/hooks/use-toast"

export default function StudentResultsPage() {
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    academicService.examResults.list({ limit: 200 })
      .then(res => setResults(res.data || []))
      .catch(err => toast({ title: "Failed to load results", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [])

  const normalized = results.map((r: any) => ({
    id: r.id,
    subject: r.subject_name || "—",
    exam: r.exam_name || r.term || "Exam",
    score: r.score || r.marks_obtained || 0,
    grade: r.grade || "—",
    term: r.term || "—",
  }))

  return (
    <GenericListPage
      title="My Results" description="View your exam results and grades"
      columns={[
        { key: "subject", header: "Subject", render: (r) => <span className="font-medium">{r.subject}</span> },
        { key: "exam", header: "Exam", render: (r) => <span className="text-muted-foreground">{r.exam}</span> },
        { key: "score", header: "Score", render: (r) => <span>{r.score}</span> },
        { key: "grade", header: "Grade", render: (r) => <span className="font-mono font-bold text-lg">{r.grade}</span> },
        { key: "term", header: "Term", render: (r) => <span className="text-muted-foreground">{r.term}</span> },
      ]}
      data={normalized} keyExtractor={(r) => r.id}
      loading={loading} emptyTitle="No results available"
    />
  )
}
