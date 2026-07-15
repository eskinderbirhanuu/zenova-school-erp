"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { useExamResults } from "@/hooks/queries"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function TeacherGradesPage() {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const { data, isLoading } = useExamResults({ limit: 200 })

  const grades = data || []
  const normalized = grades.map((g: any) => ({
    id: g.id,
    student: g.student_name || g.student_id || "—",
    subject: g.subject_name || "—",
    assignment: g.exam_name || g.assessment_name || "Assignment",
    score: g.score || g.marks_obtained || 0,
    grade: g.grade || "—",
    date: g.created_at ? new Date(g.created_at).toLocaleDateString() : "—",
  }))

  const filtered = normalized.filter((g: any) => !search || g.student?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-4">
      <GenericListPage
        title="Gradebook" description="Enter and manage student grades"
        columns={[
          { key: "student", header: "Student", render: (g) => <span className="font-medium">{g.student}</span> },
          { key: "assignment", header: "Assignment", render: (g) => <span className="text-muted-foreground">{g.assignment}</span> },
          { key: "score", header: "Score", render: (g) => <span>{g.score}</span> },
          { key: "grade", header: "Grade", render: (g) => <span className="font-mono font-bold">{g.grade}</span> },
          { key: "date", header: "Date", render: (g) => <span className="text-muted-foreground">{g.date}</span> },
        ]}
        data={filtered} keyExtractor={(g) => g.id}
        loading={isLoading} searchPlaceholder="Search student..." onSearch={setSearch}
        emptyTitle="No grades entered"
        actions={
          <Button onClick={() => router.push("/teacher/grades/enter")}>
            <Plus className="mr-2 h-4 w-4" /> Enter Grades
          </Button>
        }
      />
    </div>
  )
}
