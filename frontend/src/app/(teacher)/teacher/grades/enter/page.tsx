"use client"

import { useState, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { academicService, studentService } from "@/services/api"
import { useMyProfile, useMySubjects, useExams } from "@/hooks/queries"
import { toast } from "@/hooks/use-toast"
import { Loader2, ArrowLeft, Save, AlertCircle } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"

interface Student { id: string; student_id: string; full_name: string }

export default function GradeEntryPage() {
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState<"select" | "enter">("select")

  const [students, setStudents] = useState<Student[]>([])

  const [selectedSubject, setSelectedSubject] = useState("")
  const [selectedExam, setSelectedExam] = useState("")
  const [scores, setScores] = useState<Record<string, string>>({})
  const { data: meData, isLoading: loadingProfile } = useMyProfile()
  const { data: subjectsData, isLoading: loadingSubjects } = useMySubjects()
  const { data: examsData } = useExams(selectedSubject ? { subject_id: selectedSubject } : {})

  const subjects = subjectsData || []
  const exams = useMemo(() => selectedSubject ? (examsData || []) : [], [selectedSubject, examsData])
  const me = meData

  const [, setLoadingStudents] = useState(false)

  const handleLoadStudents = useCallback(async () => {
    if (!selectedExam) return
    setLoadingStudents(true)
    try {
      const exam = exams.find((e: any) => e.id === selectedExam)
      if (!exam) return
      const res = await studentService.list({ limit: 200 })
      const allStudents: Student[] = (res.data || []) as any
      const existing = await academicService.examResults.list({ exam_id: selectedExam })
      const existingStudentIds = new Set((existing.data || []).map((r: any) => r.student_id))

      const initialScores: Record<string, string> = {}
      existing.data?.forEach((r: any) => { initialScores[r.student_id] = String(r.score ?? "") })

      setStudents(allStudents.filter((s: any) => !existingStudentIds.has(s.id)))
      setScores(initialScores)
      setStep("enter")
    } catch {
      toast({ title: "Failed to load students", variant: "destructive" })
    } finally {
      setLoadingStudents(false)
    }
  }, [selectedExam, exams])

  const handleSubmit = async () => {
    if (!selectedExam) return
    setSubmitting(true)
    const results = students
      .filter(s => scores[s.id] && scores[s.id].trim() !== "")
      .map(s => ({
        exam_id: selectedExam,
        student_id: s.id,
        score: parseFloat(scores[s.id]),
      }))

    if (results.length === 0) {
      toast({ title: "No scores entered", variant: "destructive" })
      setSubmitting(false)
      return
    }

    try {
      await academicService.examResults.bulkCreate(results as any)
      toast({ title: `Saved ${results.length} grades successfully` })
      setStep("select")
      setSelectedExam("")
      setScores({})
      setStudents([])
    } catch (err: any) {
      toast({ title: err.response?.data?.detail || "Failed to save grades", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  if ((loadingProfile || loadingSubjects) && !me) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (step === "enter") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setStep("select")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <PageHeader
            title="Enter Grades"
            description={`${students.length} students • ${exams.find((e: any) => e.id === selectedExam)?.name || ""}`}
          />
        </div>

        {students.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-lg font-medium">All students have grades</p>
              <p className="text-sm text-muted-foreground mt-1">Every student in this class already has a score for this exam.</p>
              <Button variant="outline" className="mt-4" onClick={() => setStep("select")}>Back to selection</Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Student Scores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {students.map((s: any) => (
                  <div key={s.id} className="flex items-center gap-4 p-3 rounded-lg border bg-card/50">
                    <span className="flex-1 text-sm font-medium truncate">{s.full_name || s.student_id}</span>
                    <Input
                      type="number"
                      min="0"
                      max={exams.find((e: any) => e.id === selectedExam)?.max_score || 100}
                      step="0.5"
                      placeholder="Score"
                      className="w-24 h-9 text-sm text-right"
                      value={scores[s.id] || ""}
                      onChange={e => setScores(prev => ({ ...prev, [s.id]: e.target.value }))}
                    />
                    <span className="text-xs text-muted-foreground w-8 text-center">
                      / {exams.find((e: any) => e.id === selectedExam)?.max_score || "—"}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {students.length > 0 && (
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setStep("select")}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
              Save {students.filter((s: any) => scores[s.id] && scores[s.id].trim() !== "").length} Grades
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Grade Entry" description="Select a subject and exam to enter scores" />

      <Card>
        <CardHeader>
          <CardTitle>Select Exam</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Subject</Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a subject..." />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedSubject && (
            <div className="space-y-2">
              <Label>Exam</Label>
              <Select value={selectedExam} onValueChange={setSelectedExam}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an exam..." />
                </SelectTrigger>
                <SelectContent>
                  {exams.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} (max: {e.max_score})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedExam && (
            <Button onClick={handleLoadStudents} className="w-full">
              Load Students
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
