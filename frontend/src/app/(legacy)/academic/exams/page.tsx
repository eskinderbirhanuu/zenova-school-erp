"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { academicService } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { Plus } from "lucide-react"

export default function ExamsPage() {
  const [exams, setExams] = useState<any[]>([])
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"exams" | "results">("exams")
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ exam_type_id: "", class_id: "", section_id: "", subject_id: "", name: "", max_score: 100, date: "" })

  const load = async () => {
    setLoading(true)
    try { const [e, r] = await Promise.all([academicService.exams.list(), academicService.examResults.list()]); setExams(e.data); setResults(r.data) } catch { toast({ title: "Failed to load", variant: "destructive" }) }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try { await academicService.exams.create(form); toast({ title: "Exam created" }); setShowForm(false); setForm({ exam_type_id: "", class_id: "", section_id: "", subject_id: "", name: "", max_score: 100, date: "" }); load() } catch { toast({ title: "Failed", variant: "destructive" }) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Exams & Results</h1>
        <div className="flex gap-2">
          <Button variant={tab === "exams" ? "default" : "outline"} size="sm" onClick={() => setTab("exams")}>Exams</Button>
          <Button variant={tab === "results" ? "default" : "outline"} size="sm" onClick={() => setTab("results")}>Results</Button>
          {tab === "exams" && <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="mr-1 h-4 w-4" />New Exam</Button>}
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Create Exam</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-3">
              <Input placeholder="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              <Input placeholder="Exam Type ID" value={form.exam_type_id} onChange={e => setForm({...form, exam_type_id: e.target.value})} required />
              <Input placeholder="Class ID" value={form.class_id} onChange={e => setForm({...form, class_id: e.target.value})} required />
              <Input placeholder="Section ID" value={form.section_id} onChange={e => setForm({...form, section_id: e.target.value})} />
              <Input placeholder="Subject ID" value={form.subject_id} onChange={e => setForm({...form, subject_id: e.target.value})} required />
              <Input placeholder="Max Score" type="number" value={form.max_score} onChange={e => setForm({...form, max_score: Number(e.target.value)})} />
              <Input placeholder="Date" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              <Button type="submit">Create</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {tab === "exams" && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-4 font-medium">Name</th><th className="p-4 font-medium">Type</th><th className="p-4 font-medium">Subject</th><th className="p-4 font-medium">Max</th><th className="p-4 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={5} className="p-8 text-center">Loading...</td></tr>}
                {!loading && exams.map((e: any) => (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4">{e.name}</td><td className="p-4">{e.exam_type_name || e.exam_type_id}</td>
                    <td className="p-4">{e.subject_name || e.subject_id}</td><td className="p-4">{e.max_score}</td>
                    <td className="p-4">{e.date}</td>
                  </tr>
                ))}
                {!loading && exams.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No exams</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {tab === "results" && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-4 font-medium">Student</th><th className="p-4 font-medium">Exam</th><th className="p-4 font-medium">Score</th><th className="p-4 font-medium">Grade</th><th className="p-4 font-medium">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={5} className="p-8 text-center">Loading...</td></tr>}
                {!loading && results.map((r: any) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4">{r.student_name || r.student_id}</td>
                    <td className="p-4">{r.exam_name || r.exam_id}</td>
                    <td className="p-4">{r.score}</td>
                    <td className="p-4">{r.grade || "—"}</td>
                    <td className="p-4">{r.remarks || "—"}</td>
                  </tr>
                ))}
                {!loading && results.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No results</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
