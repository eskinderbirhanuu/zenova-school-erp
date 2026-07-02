"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { PageHeader } from "@/components/ui/page-header"
import { studentService, academicService } from "@/services/api"
import api from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { Loader2, FileText, Download, Plus } from "lucide-react"

export default function ReportCardsPage() {
  const [students, setStudents] = useState<any[]>([])
  const [semesters, setSemesters] = useState<any[]>([])
  const [cards, setCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const [selectedStudent, setSelectedStudent] = useState("")
  const [selectedSemester, setSelectedSemester] = useState("")

  const fetchCards = () => {
    setLoading(true)
    api.get("/report-cards").then(r => setCards(r.data || [])).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => {
    Promise.all([
      studentService.list({ limit: 500 }),
      academicService.semesters.list(),
      api.get("/report-cards"),
    ]).then(([sRes, semRes, cRes]) => {
      setStudents(sRes.data || [])
      setSemesters(semRes.data || [])
      setCards(cRes.data || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleGenerate = async () => {
    if (!selectedStudent || !selectedSemester) {
      toast({ title: "Select student and semester", variant: "destructive" })
      return
    }
    setGenerating(true)
    try {
      const res = await api.post("/report-cards/generate", null, {
        params: { student_id: selectedStudent, semester_id: selectedSemester },
      })
      toast({ title: `Report card generated for ${res.data.student_name}` })
      fetchCards()
    } catch (err: any) {
      toast({ title: err.response?.data?.detail || "Failed to generate", variant: "destructive" })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Report Cards" description="Generate and view student report cards" />

      <Card>
        <CardHeader><CardTitle>Generate Report Card</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Student</label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger><SelectValue placeholder="Select student..." /></SelectTrigger>
                <SelectContent>
                  {students.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name || s.student_id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Semester</label>
              <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                <SelectTrigger><SelectValue placeholder="Select semester..." /></SelectTrigger>
                <SelectContent>
                  {semesters.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleGenerate} disabled={generating} className="w-full">
                {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="mr-2 h-4 w-4" />}
                Generate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Generated Report Cards</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : cards.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <FileText className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No report cards generated yet.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-4 font-medium">Student</th>
                  <th className="p-4 font-medium">Semester</th>
                  <th className="p-4 font-medium">Generated</th>
                  <th className="p-4 font-medium w-24"></th>
                </tr>
              </thead>
              <tbody>
                {cards.map((c: any) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4 font-medium">{c.student_id}</td>
                    <td className="p-4 text-muted-foreground">{c.semester_id}</td>
                    <td className="p-4 text-muted-foreground">
                      {c.generated_at ? new Date(c.generated_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="p-4">
                      <Button variant="ghost" size="sm" onClick={() => window.open(`/admin/report-cards/${c.id}`, "_blank")}>
                        <Download className="h-3.5 w-3.5 mr-1" /> View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
