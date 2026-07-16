"use client"

import { GenericListPage } from "@/components/ui/generic-list-page"
import { useExamResults } from "@/hooks/queries"

export default function ParentResults() {
  const { data: rawResults, isLoading } = useExamResults({ limit: 200 })

  const results = (rawResults || []).map((r: any) => ({
    id: r.id,
    child: r.student_name || r.child_name || r.child || "—",
    subject: r.subject_name || r.subject || "—",
    score: r.score ?? r.marks_obtained ?? r.total_marks ?? 0,
    grade: r.grade || r.grading || "—",
    term: r.term || r.term_name || "—",
    exam: r.exam_name || r.term || "Exam",
  }))

  return (
    <GenericListPage
      title="Results" description="View your children's exam results"
      columns={[
        { key: "child", header: "Child", render: (r) => <span className="font-medium">{r.child}</span> },
        { key: "subject", header: "Subject", render: (r) => <span className="text-muted-foreground">{r.subject}</span> },
        { key: "score", header: "Score", render: (r) => <span>{r.score}</span> },
        { key: "grade", header: "Grade", render: (r) => <span className="font-mono font-bold">{r.grade}</span> },
        { key: "term", header: "Term", render: (r) => <span className="text-muted-foreground">{r.term}</span> },
      ]}
      data={results} keyExtractor={(r) => r.id}
      loading={isLoading} emptyTitle="No results available"
    />
  )
}
