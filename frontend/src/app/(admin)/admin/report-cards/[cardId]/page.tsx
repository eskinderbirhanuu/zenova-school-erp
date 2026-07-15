"use client"

import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowLeft, Printer } from "lucide-react"
import { useReportCard } from "@/hooks/queries"

interface SubjectGrade {
  subject: string
  average: number
  max: number
  percentage: number
  grade: string
  exams: { exam_name: string; score: number; max_score: number; grade: string | null }[]
}

interface CardData {
  id: string
  student_name: string
  student_id: string
  class_name: string
  semester_name: string
  overall_percentage: number
  overall_grade: string
  subject_grades: SubjectGrade[]
  generated_at: string
}

export default function ReportCardDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: raw, isLoading: loading } = useReportCard(params.cardId as string)
  const data = raw as CardData | null

  const gradeColor = (grade: string) => {
    if (grade.startsWith("A")) return "text-green-500"
    if (grade.startsWith("B")) return "text-blue-500"
    if (grade.startsWith("C")) return "text-yellow-500"
    if (grade.startsWith("D")) return "text-orange-500"
    return "text-red-500"
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }
  if (!data) {
    return <div className="text-center py-20 text-muted-foreground">Report card not found</div>
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 print:space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" /> Print
        </Button>
      </div>

      <Card className="print:shadow-none print:border-0">
        <CardHeader className="text-center border-b pb-6">
          <CardTitle className="text-2xl">Student Report Card</CardTitle>
          <div className="text-sm text-muted-foreground space-y-1 mt-2">
            <p className="text-lg font-semibold text-foreground">{data.student_name}</p>
            <p>ID: {data.student_id} | Class: {data.class_name}</p>
            <p>Semester: {data.semester_name}</p>
            <p>Generated: {data.generated_at ? new Date(data.generated_at).toLocaleDateString() : "—"}</p>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-3 font-medium">Subject</th>
                <th className="pb-3 font-medium text-right">Average</th>
                <th className="pb-3 font-medium text-right">Max</th>
                <th className="pb-3 font-medium text-right">%</th>
                <th className="pb-3 font-medium text-right">Grade</th>
              </tr>
            </thead>
            <tbody>
              {data.subject_grades.map((sg, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-3 font-medium">{sg.subject}</td>
                  <td className="py-3 text-right">{sg.average}</td>
                  <td className="py-3 text-right text-muted-foreground">{sg.max}</td>
                  <td className="py-3 text-right font-mono">{sg.percentage}%</td>
                  <td className={`py-3 text-right font-bold text-lg ${gradeColor(sg.grade)}`}>{sg.grade}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {data.subject_grades.map((sg, i) => (
            <div key={i} className="mt-4 pt-4 border-t">
              <p className="text-sm font-semibold mb-2">{sg.subject} — Exams</p>
              <div className="flex flex-wrap gap-2">
                {sg.exams.map((ex, j) => (
                  <Badge key={j} variant="outline" className="text-xs">
                    {ex.exam_name}: {ex.score}/{ex.max_score} {ex.grade ? `(${ex.grade})` : ""}
                  </Badge>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-8 pt-6 border-t flex justify-between items-center">
            <p className="text-lg font-semibold">Overall Performance</p>
            <div className="text-right">
              <p className="text-3xl font-bold" style={{ color: data.overall_percentage >= 50 ? "#22c55e" : "#ef4444" }}>
                {data.overall_percentage}%
              </p>
              <p className="text-xl font-bold">Grade: {data.overall_grade}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
