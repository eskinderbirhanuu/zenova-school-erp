"use client"

import { useState } from "react"
import { academicService } from "@/services/api"
import { useClasses, useTeachers, useSections, useTimetable, useSubjects } from "@/hooks/queries"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, X, Check, AlertTriangle, Loader2 } from "lucide-react"

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const HOURS = Array.from({ length: 10 }, (_, i) => i + 7)
export default function TimetableBuilderPage() {
  const [selectedClass, setSelectedClass] = useState("")
  const [selectedSection, setSelectedSection] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editEntry, setEditEntry] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    subject: "",
    teacher: "",
    classroom: "",
    day: 0,
    startHour: 8,
    endHour: 9,
  })

  const { data: classes = [], isLoading } = useClasses()
  const { data: teachers = [] } = useTeachers({ limit: 200 })
  const { data: sections = [] } = useSections(selectedClass ? { class_id: selectedClass } : undefined)
  const { data: entries = [], refetch: refetchTimetable } = useTimetable(selectedSection ? { section_id: selectedSection } : undefined)
  const { data: subjects = [] } = useSubjects(selectedClass ? { class_id: selectedClass } : undefined)

  const openAddForm = (day: number, hour: number) => {
    setEditEntry(null)
    setFormData({ subject: "", teacher: "", classroom: "", day, startHour: hour, endHour: hour + 1 })
    setError("")
    setShowForm(true)
  }

  const openEditForm = (entry: any) => {
    setEditEntry(entry)
    setFormData({
      subject: entry.subject_id || "",
      teacher: entry.teacher_id || "",
      classroom: entry.classroom_id || "",
      day: entry.day_of_week,
      startHour: entry.start_time ? parseInt(entry.start_time.split(":")[0] || "8") : 8,
      endHour: entry.end_time ? parseInt(entry.end_time.split(":")[0] || "9") : 9,
    })
    setError("")
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!formData.subject) { setError("Please select a subject"); return }
    setSaving(true)
    setError("")
    try {
      const payload: any = {
        day_of_week: formData.day,
        start_time: `${String(formData.startHour).padStart(2, "0")}:00`,
        end_time: `${String(formData.endHour).padStart(2, "0")}:00`,
        subject_id: formData.subject,
        teacher_id: formData.teacher || null,
        section_id: selectedSection,
        classroom_id: formData.classroom || null,
      }
      const conflicts = await academicService.timetable.checkConflicts(payload)
      if (conflicts.data.conflicts?.length > 0) {
        setError(conflicts.data.conflicts.join("; "))
        setSaving(false)
        return
      }
      if (editEntry) {
        await academicService.timetable.update(editEntry.id, payload)
      } else {
        await academicService.timetable.create(payload)
      }
      refetchTimetable()
      setShowForm(false)
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Save failed")
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this timetable entry?")) return
    try {
      await academicService.timetable.delete(id)
      refetchTimetable()
    } catch {}
  }

  const getEntry = (day: number, hour: number) =>
    entries.find((e: any) => e.day_of_week === day && parseInt(e.start_time) <= hour && parseInt(e.end_time) > hour)

  const teacherName = (id: string) => {
    if (!id) return ""
    const t = teachers.find((t: any) => t.id === id || t.user_id === id || t.teacher_id === id)
    return (t as any)?.full_name || (t as any)?.name || ""
  }

  const entryColor = (entry: any) => {
    const colors = [
      "bg-blue-100 border-blue-300 text-blue-800",
      "bg-green-100 border-green-300 text-green-800",
      "bg-purple-100 border-purple-300 text-purple-800",
      "bg-amber-100 border-amber-300 text-amber-800",
      "bg-pink-100 border-pink-300 text-pink-800",
      "bg-teal-100 border-teal-300 text-teal-800",
      "bg-indigo-100 border-indigo-300 text-indigo-800",
      "bg-rose-100 border-rose-300 text-rose-800",
    ]
    const idx = entry.subject_id ? entry.subject_id.charCodeAt(0) % colors.length : 0
    return colors[idx]
  }

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Timetable Builder</h1>
          <p className="text-gray-600">Create and manage class schedules.</p>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="w-64">
          <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
          <select
            value={selectedClass}
            onChange={(e) => { setSelectedClass(e.target.value); setSelectedSection("") }}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">Select class</option>
            {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="w-64">
          <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">Select section</option>
            {sections.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {selectedSection ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="w-20 p-2 border bg-gray-50 text-left text-gray-600 font-medium">Time</th>
                  {DAYS.map((d: any) => (
                    <th key={d} className="p-2 border bg-gray-50 text-center text-gray-600 font-medium w-32">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map((hour: any) => (
                  <tr key={hour}>
                    <td className="p-2 border text-gray-500 text-xs font-mono">
                      {String(hour).padStart(2, "0")}:00
                    </td>
                    {DAYS.map((_, di) => {
                      const entry = getEntry(di, hour)
                      return (
                        <td
                          key={di}
                          className="p-1 border align-top cursor-pointer hover:bg-gray-50 min-h-[60px] relative group"
                          onClick={() => !entry && openAddForm(di, hour)}
                        >
                          {entry && (
                            <div className={`p-1.5 rounded border text-xs ${entryColor(entry)} relative`}>
                              <div className="flex justify-between items-start">
                                <span className="font-medium truncate">{entry.subject_id?.slice(0, 8) || "—"}</span>
                                <div className="hidden group-hover:flex gap-1 ml-1">
                                  <button onClick={(e) => { e.stopPropagation(); openEditForm(entry) }} className="text-gray-500 hover:text-blue-600">
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); handleDelete(entry.id) }} className="text-gray-500 hover:text-red-600">
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                              {entry.teacher_id && <p className="text-gray-500 truncate mt-0.5">{teacherName(entry.teacher_id)}</p>}
                              <p className="text-gray-400 truncate">
                                {String(parseInt(entry.start_time)).padStart(2, "0")}:00-{String(parseInt(entry.end_time)).padStart(2, "0")}:00
                              </p>
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3 text-xs text-gray-500">
            <span>💡 Click an empty cell to add a lesson. Hover over an entry to edit or delete.</span>
          </div>
        </>
      ) : (
        <div className="text-center py-16 text-gray-500">Select a class and section to view the timetable.</div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editEntry ? "Edit Entry" : "Add Lesson"}</h2>
              <button onClick={() => setShowForm(false)}><X className="h-5 w-5 text-gray-500" /></button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
                <p className="text-sm text-gray-900">{DAYS[formData.day]}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Hour</label>
                  <select
                    value={formData.startHour}
                    onChange={(e) => setFormData({ ...formData, startHour: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    {HOURS.map((h: any) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Hour</label>
                  <select
                    value={formData.endHour}
                    onChange={(e) => setFormData({ ...formData, endHour: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    {HOURS.filter((h: any) => h > formData.startHour).map((h: any) => (
                      <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">Select subject</option>
                  {subjects.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
                <select
                  value={formData.teacher}
                  onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">No teacher</option>
                  {teachers.map((t: any) => (
                    <option key={t.id || t.user_id} value={t.id || t.user_id}>{t.full_name || t.name || t.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Classroom</label>
                <input
                  type="text"
                  value={formData.classroom}
                  onChange={(e) => setFormData({ ...formData, classroom: e.target.value })}
                  placeholder="e.g. Room 101"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                {editEntry ? "Update" : "Add"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
