"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useClasses, useSections } from "@/hooks/queries"

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export default function TimetablePage() {
  const [classId, setClassId] = useState("")
  const [sectionId, setSectionId] = useState("")
  const [entries, setEntries] = useState<any[]>([])

  const { data: classes } = useClasses()
  const { data: sections } = useSections(classId ? { class_id: classId } as any : undefined)

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

  useEffect(() => {
    if (sectionId) {
      fetch(`${API}/timetable?section_id=${sectionId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` }
      }).then((r: any) => r.json()).then(setEntries).catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId])

  const grouped: Record<number, any[]> = {}
  entries.forEach((e: any) => {
    if (!grouped[e.day_of_week]) grouped[e.day_of_week] = []
    grouped[e.day_of_week].push(e)
  })

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Timetable</h1>
      <div className="flex gap-4">
        <select value={classId} onChange={(e) => setClassId(e.target.value)} className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm">
          <option value="">Select Class</option>
          {(classes || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={sectionId} onChange={(e) => setSectionId(e.target.value)} className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm">
          <option value="">Select Section</option>
          {(sections || []).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {DAYS.map((day, i) => (
          <Card key={i}>
            <CardHeader className="p-3"><CardTitle className="text-xs">{day.substring(0, 3)}</CardTitle></CardHeader>
            <CardContent className="p-2 space-y-1">
              {(grouped[i] || []).map((e: any) => (
                <div key={e.id} className="rounded bg-muted p-1.5 text-xs">
                  <div className="font-medium">{e.subject_id?.substring(0, 8) || "—"}</div>
                  <div className="text-muted-foreground">{e.start_time?.substring(0, 5)}-{e.end_time?.substring(0, 5)}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
