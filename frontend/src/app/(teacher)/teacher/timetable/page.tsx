"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { academicService } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { Calendar, Loader2 } from "lucide-react"

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

interface TimetableEntry {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  subject_id: string
  subject_name?: string
  room?: string
  class_name?: string
  section_name?: string
}

export default function TeacherTimetable() {
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    academicService.timetable
      .list()
      .then((r: any) => setEntries(r.data || []))
      .catch(() => toast({ title: "Failed to load timetable", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [])

  const grouped: Record<number, TimetableEntry[]> = {}
  entries.forEach((e) => {
    if (!grouped[e.day_of_week]) grouped[e.day_of_week] = []
    grouped[e.day_of_week].push(e)
  })

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
            <p className="text-sm text-muted-foreground">Your schedule has not been assigned yet.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Timetable</h1>
      <div className="grid grid-cols-7 gap-2">
        {DAYS.map((day, i) => (
          <Card key={i}>
            <CardHeader className="p-3">
              <CardTitle className="text-xs font-bold">{day.substring(0, 3)}</CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1 min-h-[120px]">
              {!grouped[i] || grouped[i].length === 0 ? (
                <p className="text-xs text-muted-foreground p-2">No classes</p>
              ) : (
                grouped[i]
                  .sort((a, b) => a.start_time.localeCompare(b.start_time))
                  .map((e) => (
                    <div key={e.id} className="rounded bg-muted p-2 text-xs">
                      <div className="font-medium">{e.subject_name || e.subject_id}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {e.start_time?.substring(0, 5)}-{e.end_time?.substring(0, 5)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {e.class_name || ""} {e.section_name ? `(${e.section_name})` : ""}
                      </div>
                    </div>
                  ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
