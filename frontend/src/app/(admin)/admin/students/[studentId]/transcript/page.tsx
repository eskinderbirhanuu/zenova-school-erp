"use client"

import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import { Printer, Download, Loader2 } from "lucide-react"
import { useStudentTranscript } from "@/hooks/queries"

export default function StudentTranscriptPage() {
  const params = useParams()
  const { data: transcript, isLoading: loading } = useStudentTranscript(params.studentId as string)

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  if (!transcript) {
    return (
      <Card><CardContent className="py-12 text-center text-gray-500">
        No transcript data available for this student.
      </CardContent></Card>
    )
  }

  const gradeColor = (pct: number) =>
    pct >= 80 ? "text-green-600" : pct >= 60 ? "text-blue-600" : pct >= 50 ? "text-amber-600" : "text-red-600"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Academic Transcript</h1>
          <p className="text-gray-600">{transcript.student_name} — {transcript.student_id}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
          <Button variant="outline" onClick={() => {
            const rows = [["Semester", "Subject", "Average", "Grade"]]
            transcript.semesters.forEach((s: any) =>
              s.subjects.forEach((sub: any) =>
                rows.push([s.semester_name, sub.subject, String(sub.average), sub.grade])
              )
            )
            const csv = rows.map((r: any) => r.join(",")).join("\n")
            const blob = new Blob([csv], { type: "text/csv" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url; a.download = `transcript_${transcript.student_id}.csv`; a.click()
            URL.revokeObjectURL(url)
          }}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Student Name</p>
              <p className="font-medium">{transcript.student_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Student ID</p>
              <p className="font-medium">{transcript.student_id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Current Class</p>
              <p className="font-medium">{transcript.class}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Grade History</p>
              <p className="font-medium">{transcript.grade_history?.join(" → ") || transcript.class}</p>
            </div>
          </div>
          <div className="flex gap-4 pt-4 border-t mt-4">
            <div className="text-center px-6 py-3 bg-indigo-50 rounded-lg">
              <p className="text-sm text-gray-500">Cumulative Average</p>
              <p className={`text-2xl font-bold ${gradeColor(transcript.cumulative_average)}`}>
                {transcript.cumulative_average}%
              </p>
            </div>
            <div className="text-center px-6 py-3 bg-indigo-50 rounded-lg">
              <p className="text-sm text-gray-500">Cumulative Grade</p>
              <p className="text-2xl font-bold text-indigo-600">{transcript.cumulative_grade}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {transcript.semesters.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-gray-500">No graded semesters on record.</CardContent></Card>
      ) : (
        transcript.semesters.map((sem: any, si: number) => (
          <Card key={si}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{sem.semester_name}</span>
                <span className="text-sm font-normal flex items-center gap-2">
                  Average: <span className={`font-bold ${gradeColor(sem.overall_percentage)}`}>{sem.overall_percentage}%</span>
                  <StatusBadge status={sem.overall_grade} />
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="text-left py-2 font-medium">Subject</th>
                    <th className="text-center py-2 font-medium">Average</th>
                    <th className="text-center py-2 font-medium">Percentage</th>
                    <th className="text-center py-2 font-medium">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {sem.subjects.map((sub: any, i: number) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 font-medium">{sub.subject}</td>
                      <td className="py-2 text-center">{sub.average}</td>
                      <td className={`py-2 text-center font-semibold ${gradeColor(sub.percentage)}`}>{sub.percentage}%</td>
                      <td className="py-2 text-center"><StatusBadge status={sub.grade} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
