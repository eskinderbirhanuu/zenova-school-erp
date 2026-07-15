"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTimetable, useClasses, useSections, useCreateTimetableEntry } from "@/hooks/queries"
import { toast } from "@/hooks/use-toast"

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export default function TimetableEditorPage() {
  const [classId, setClassId] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ class_id: "", section_id: "", subject_id: "", day_of_week: "Monday", start_time: "08:00", end_time: "08:45", room: "" })
  const { data: entries } = useTimetable()
  const { data: classes } = useClasses()
  const { data: sections } = useSections()
  const createMutation = useCreateTimetableEntry()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try { await createMutation.mutateAsync(form as any); toast({ title: "Entry added" }); setShowForm(false) } catch { toast({ title: "Failed", variant: "destructive" }) }
  }

  const filtered = (entries || []).filter((e: any) => !classId || e.class_id === classId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Timetable Editor</h1>
        <div className="flex gap-2">
          <select value={classId} onChange={e => setClassId(e.target.value)} className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">All Classes</option>
            {(classes || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Button onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "Add Entry"}</Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Timetable Entry</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-4">
              <select value={form.class_id} onChange={e => setForm({...form, class_id: e.target.value})} className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                <option value="">Class</option>
                {(classes || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={form.section_id} onChange={e => setForm({...form, section_id: e.target.value})} className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Section</option>
                {(sections || []).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <Input placeholder="Subject ID" value={form.subject_id} onChange={e => setForm({...form, subject_id: e.target.value})} required />
              <select value={form.day_of_week} onChange={e => setForm({...form, day_of_week: e.target.value})} className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                {DAYS.map((d: any) => <option key={d} value={d}>{d}</option>)}
              </select>
              <Input type="time" value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})} required />
              <Input type="time" value={form.end_time} onChange={e => setForm({...form, end_time: e.target.value})} required />
              <Input placeholder="Room" value={form.room} onChange={e => setForm({...form, room: e.target.value})} />
              <Button type="submit">Add</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Timetable</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-3 font-medium">Day</th><th className="p-3 font-medium">Class</th><th className="p-3 font-medium">Section</th>
                  <th className="p-3 font-medium">Subject</th><th className="p-3 font-medium">Start</th><th className="p-3 font-medium">End</th><th className="p-3 font-medium">Room</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e: any) => (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-3">{e.day_of_week}</td><td className="p-3">{e.class_name || e.class_id}</td>
                    <td className="p-3">{e.section_name || e.section_id || "—"}</td>
                    <td className="p-3">{e.subject_name || e.subject_id}</td>
                    <td className="p-3">{e.start_time}</td><td className="p-3">{e.end_time}</td><td className="p-3">{e.room || "—"}</td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No entries</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
