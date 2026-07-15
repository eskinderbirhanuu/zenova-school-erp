"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { PageHeader } from "@/components/ui/page-header"
import { studentService } from "@/services/api"
import { useClasses, useSections } from "@/hooks/queries"
import api from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { Loader2, Save, CheckCircle2, XCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

type MarkStatus = "present" | "absent" | "late"

interface StudentRec { id: string; student_id: string; full_name: string }

const STATUS_OPTIONS: { value: MarkStatus; label: string; icon: any; color: string }[] = [
  { value: "present", label: "Present", icon: CheckCircle2, color: "text-green-400 border-green-500/30 bg-green-500/10 hover:bg-green-500/20" },
  { value: "absent", label: "Absent", icon: XCircle, color: "text-red-400 border-red-500/30 bg-red-500/10 hover:bg-red-500/20" },
  { value: "late", label: "Late", icon: Clock, color: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20" },
]

export default function MarkAttendancePage() {
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [students, setStudents] = useState<StudentRec[]>([])
  const [attendance, setAttendance] = useState<Record<string, MarkStatus>>({})

  const [selectedClass, setSelectedClass] = useState("")
  const [selectedSection, setSelectedSection] = useState("")
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const { data: classesData } = useClasses()
  const { data: sectionsData } = useSections({})

  const classes = classesData || []
  const sections = selectedClass ? (sectionsData || []).filter((s: any) => s.class_id === selectedClass) : []

  const handleLoadStudents = async () => {
    if (!selectedSection) return
    setLoading(true)
    try {
      const res = await studentService.list({ section_id: selectedSection, limit: 200 })
      const list: StudentRec[] = (res.data || []) as any
      setStudents(list)
      const init: Record<string, MarkStatus> = {}
      list.forEach((s: any) => { init[s.id] = "present" })
      setAttendance(init)
    } catch {
      toast({ title: "Failed to load students", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const setStatus = (id: string, status: MarkStatus) => {
    setAttendance(prev => ({ ...prev, [id]: status }))
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    const records = Object.entries(attendance).map(([studentId, status]) => ({
      student_id: studentId,
      date: selectedDate,
      status,
    }))

    try {
      await api.post("/attendance/bulk", records)
      toast({ title: `Marked ${records.length} students for ${selectedDate}` })
      setStudents([])
      setAttendance({})
    } catch (err: any) {
      toast({ title: err.response?.data?.detail || "Failed to mark attendance", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const presentCount = Object.values(attendance).filter(s => s === "present").length
  const absentCount = Object.values(attendance).filter(s => s === "absent").length
  const lateCount = Object.values(attendance).filter(s => s === "late").length

  return (
    <div className="space-y-6">
      <PageHeader title="Mark Attendance" description="Select a section and mark student attendance" />

      <Card>
        <CardHeader>
          <CardTitle>Class & Date</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={selectedClass} onValueChange={v => { setSelectedClass(v); setSelectedSection("") }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class..." />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Section</Label>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger>
                  <SelectValue placeholder="Select section..." />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              />
            </div>
          </div>

          {selectedSection && (
            <Button onClick={handleLoadStudents} className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Load Students
            </Button>
          )}
        </CardContent>
      </Card>

      {students.length > 0 && (
        <>
          <div className="flex gap-4 text-sm">
            <span className="text-green-400">Present: {presentCount}</span>
            <span className="text-red-400">Absent: {absentCount}</span>
            <span className="text-yellow-400">Late: {lateCount}</span>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Students</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {students.map((s: any) => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card/50">
                  <span className="flex-1 text-sm font-medium">{s.full_name || s.student_id}</span>
                  <div className="flex gap-1">
                    {STATUS_OPTIONS.map((opt: any) => (
                      <button
                        key={opt.value}
                        onClick={() => setStatus(s.id, opt.value)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                          attendance[s.id] === opt.value
                            ? opt.color + " ring-1 ring-current"
                            : "text-muted-foreground border-border/40 hover:border-border"
                        )}
                      >
                        <opt.icon className="h-3.5 w-3.5" />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
              Save Attendance for {selectedDate}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
