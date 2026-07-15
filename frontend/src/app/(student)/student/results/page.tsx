"use client"

import { useState } from "react"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { useExamResults } from "@/hooks/queries"

export default function StudentResultsPage() {
  const { data: raw, isLoading } = useExamResults({ limit: 200 })

  const results = (raw || []).map((r: any) => ({
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
      data={results} keyExtractor={(r) => r.id}
      loading={isLoading} emptyTitle="No results available"
    />
  )
}
