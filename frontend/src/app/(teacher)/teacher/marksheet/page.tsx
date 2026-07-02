"use client"

import { useEffect, useState } from "react"
import { academicService } from "@/services/api"
import { Loader2, Download } from "lucide-react"

export default function MarkSheetPage() {
  const [classes, setClasses] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [sections, setSections] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState("")
  const [selectedSubject, setSelectedSubject] = useState("")
  const [selectedSection, setSelectedSection] = useState("")
  const [loading, setLoading] = useState(true)
  const [marksheet, setMarksheet] = useState<any>(null)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    Promise.all([
      academicService.classes.list(),
      academicService.sections.list({}),
    ]).then(([cls, sec]) => {
      setClasses(cls.data)
      setSections(sec.data || [])
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (selectedClass) {
      academicService.subjects.list({ class_id: selectedClass }).then((r) => setSubjects(r.data || [])).catch(() => setSubjects([]))
    } else {
      setSubjects([])
    }
  }, [selectedClass])

  const loadMarksheet = async () => {
    if (!selectedSubject || !selectedSection) return
    setFetching(true)
    setError("")
    try {
      const res = await academicService.examResults.marksheet(selectedSubject, selectedSection)
      setMarksheet(res.data)
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to load marksheet")
      setMarksheet(null)
    }
    setFetching(false)
  }

  useEffect(() => {
    if (selectedSubject && selectedSection) loadMarksheet()
  }, [selectedSubject, selectedSection])

  const exportCSV = () => {
    if (!marksheet) return
    const headers = ["Student ID", "Name", ...marksheet.exams.map((e: any) => e.name), "Average"]
    const rows = marksheet.students.map((s: any) => [
      s.student_id,
      s.full_name,
      ...marksheet.exams.map((e: any) => s.results[e.id] ?? ""),
      s.average ?? "",
    ])
    const csv = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = "marksheet.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Consolidated Mark Sheet</h1>
          <p className="text-gray-600">View all student exam results for a subject across exams.</p>
        </div>
        {marksheet && (
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
          <select value={selectedClass} onChange={(e) => { setSelectedClass(e.target.value); setSelectedSubject("") }}
            className="w-full px-3 py-2 border rounded-lg text-sm">
            <option value="">Select class</option>
            {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
          <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm">
            <option value="">Select subject</option>
            {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
          <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm">
            <option value="">Select section</option>
            {sections.filter((s: any) => !selectedClass || s.class_id === selectedClass).map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {fetching && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
      )}

      {marksheet && !fetching && (
        <>
          <p className="text-sm text-gray-500">
            Section: <strong>{marksheet.section_name}</strong> — {marksheet.students.length} students, {marksheet.exams.length} exams
          </p>

          {marksheet.exams.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No exams found for this subject.</div>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-2 border-b text-left text-gray-600 sticky left-0 bg-gray-50 w-10">#</th>
                    <th className="p-2 border-b text-left text-gray-600 sticky left-10 bg-gray-50 min-w-[180px]">Student</th>
                    {marksheet.exams.map((e: any) => (
                      <th key={e.id} className="p-2 border-b text-center text-gray-600 min-w-[80px]">
                        <div className="text-xs font-medium">{e.name}</div>
                        <div className="text-[10px] text-gray-400">/{e.max_score}</div>
                      </th>
                    ))}
                    <th className="p-2 border-b text-center text-gray-600 min-w-[60px]">Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {marksheet.students.map((s: any, i: number) => (
                    <tr key={s.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                      <td className="p-2 border-b text-gray-500 text-xs sticky left-0 bg-inherit">{i + 1}</td>
                      <td className="p-2 border-b font-medium sticky left-10 bg-inherit">{s.full_name}</td>
                      {marksheet.exams.map((e: any) => {
                        const score = s.results[e.id]
                        return (
                          <td key={e.id} className={`p-2 border-b text-center ${score === null || score === undefined ? "text-gray-300" : ""}`}>
                            {score !== null && score !== undefined ? score : "—"}
                          </td>
                        )
                      })}
                      <td className={`p-2 border-b text-center font-semibold ${
                        s.average !== null ? (s.average >= 50 ? "text-green-600" : "text-red-600") : "text-gray-300"
                      }`}>
                        {s.average !== null ? s.average : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {!selectedSubject && !selectedSection && !fetching && !marksheet && (
        <div className="text-center py-16 text-gray-500">Select a class, subject, and section to view the mark sheet.</div>
      )}
    </div>
  )
}
