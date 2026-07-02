"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { academicService, authService } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { Calendar, Loader2 } from "lucide-react"

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const HOURS = Array.from({ length: 11 }, (_, i) => `${String(i + 7).padStart(2, "0")}:00`)

export default function StudentTimetable() {
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    authService
      .me()
      .then(async (res) => {
        const user = res.data
        if (user.student?.section_id) {
          const r = await academicService.timetable.list({ section_id: user.student.section_id })
          return r.data
        }
        if (user.student_id) {
          const r = await academicService.timetable.list({ student_id: user.student_id })
          return r.data
        }
        return []
      })
      .then((data: any) => setEntries(data || []))
      .catch(() => toast({ title: "Failed to load timetable", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">My Timetable</h1>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading timetable...</span>
        </div>
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">My Timetable</h1>
        <Card>
          <CardContent className="flex flex-col items-center py-16">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No timetable entries</p>
            <p className="text-sm text-muted-foreground">Your class schedule has not been assigned yet.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getEntry = (day: number, hourStr: string) => {
    const h = parseInt(hourStr)
    return entries.find(
      (e) => e.day_of_week === day && parseInt(e.start_time) <= h && parseInt(e.end_time) > h
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Timetable</h1>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="p-2 border bg-gray-50 text-left text-gray-600 w-16">Time</th>
              {DAYS.map((d) => (
                <th key={d} className="p-2 border bg-gray-50 text-center text-gray-600 w-28">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((hour) => (
              <tr key={hour}>
                <td className="p-2 border text-gray-500 text-xs font-mono">{hour}</td>
                {DAYS.map((_, di) => {
                  const entry = getEntry(di, hour)
                  return (
                    <td key={di} className="p-1 border align-top text-center text-xs min-h-[48px]">
                      {entry && (
                        <div className="rounded bg-blue-50 border border-blue-200 p-1.5">
                          <div className="font-medium text-blue-800">{entry.subject_name || entry.subject_id || "—"}</div>
                          <div className="text-blue-600">
                            {entry.start_time?.substring(0, 5)}-{entry.end_time?.substring(0, 5)}
                          </div>
                          {entry.teacher_name && <div className="text-blue-500">{entry.teacher_name}</div>}
                          {entry.classroom_id && <div className="text-blue-400">Room {entry.classroom_id}</div>}
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
    </div>
  )
}
