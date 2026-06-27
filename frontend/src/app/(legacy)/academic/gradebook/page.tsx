"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { academicService, studentService } from "@/services/api"
import api from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { Save, Download, Upload } from "lucide-react"

export default function GradebookPage() {
  const [exams, setExams] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [selectedExam, setSelectedExam] = useState("")
  const [selectedClass, setSelectedClass] = useState("")
  const [students, setStudents] = useState<any[]>([])
  const [scores, setScores] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([
      academicService.exams.list().then((r: any) => setExams(r.data)),
      academicService.classes.list().then((r: any) => setClasses(r.data)),
    ]).catch(() => toast({ title: "Failed to load", variant: "destructive" }))
  }, [])

  const loadStudents = async () => {
    if (!selectedClass || !selectedExam) return
    setLoading(true)
    try {
      const res = await studentService.list({ class_id: selectedClass, limit: 100 })
      setStudents(res.data || [])
      const existingRes = await academicService.examResults.list({ exam_id: selectedExam }).catch(() => ({ data: [] }))
      const existing = existingRes.data || []
      const scoreMap: Record<string, string> = {}
      existing.forEach((r: any) => { scoreMap[r.student_id] = String(r.score) })
      setScores(scoreMap)
    } catch { toast({ title: "Failed", variant: "destructive" }) }
    setLoading(false)
  }

  const saveAll = async () => {
    setSaving(true)
    const results = students.map((s: any) => ({
      exam_id: selectedExam, student_id: s.id, score: parseFloat(scores[s.id]) || 0
    })).filter(r => r.score > 0)
    if (results.length === 0) { toast({ title: "No scores to save", variant: "destructive" }); setSaving(false); return }
    try {
      await api.post("/exam-results/bulk", { results })
      toast({ title: `${results.length} scores saved` })
    } catch { toast({ title: "Failed to save", variant: "destructive" }) }
    setSaving(false)
  }

  const exportExcel = () => {
    if (!selectedExam) { toast({ title: "Select an exam first", variant: "destructive" }); return }
    api.get("/exam-results/export-excel", { params: { exam_id: selectedExam }, responseType: "blob" }).then((res) => {
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement("a"); a.href = url; a.download = "exam_results.xlsx"; a.click()
      URL.revokeObjectURL(url)
    }).catch(() => toast({ title: "Export failed", variant: "destructive" }))
  }

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setImporting(true)
    const formData = new FormData()
    formData.append("file", f)
    try {
      const res = await api.post("/exam-results/import-excel", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      toast({ title: res.data.message || "Results imported" })
      loadStudents()
    } catch (err: any) {
      toast({ title: err.response?.data?.detail || "Import failed", variant: "destructive" })
    }
    setImporting(false)
    if (fileRef.current) fileRef.current.value = ""
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gradebook</h1>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleExcelImport} className="hidden" />
          <Button variant="outline" size="sm" disabled={!selectedExam || importing} onClick={() => fileRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />{importing ? "Importing..." : "Import Excel"}
          </Button>
          <Button variant="outline" size="sm" disabled={!selectedExam} onClick={exportExcel}>
            <Download className="mr-2 h-4 w-4" />Export Excel
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Class</label>
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-60">
            <option value="">Select class</option>
            {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Exam</label>
          <select value={selectedExam} onChange={e => setSelectedExam(e.target.value)} className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-60">
            <option value="">Select exam</option>
            {exams.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <Button onClick={loadStudents} disabled={!selectedClass || !selectedExam || loading}>Load Students</Button>
        </div>
      </div>

      {students.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Scores for {students.length} students</CardTitle>
              <Button onClick={saveAll} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? "Saving..." : "Save All"}</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-4 font-medium">#</th><th className="p-4 font-medium">Name</th><th className="p-4 font-medium">Student ID</th><th className="p-4 font-medium w-32">Score</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s: any, i: number) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4 text-muted-foreground">{i + 1}</td>
                    <td className="p-4 font-medium">{s.first_name} {s.last_name}</td>
                    <td className="p-4 text-xs">{s.student_id}</td>
                    <td className="p-4">
                      <Input type="number" step="0.5" min="0" max="100" placeholder="Score"
                        value={scores[s.id] || ""}
                        onChange={e => setScores({...scores, [s.id]: e.target.value})}
                        className="h-9 w-24" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
