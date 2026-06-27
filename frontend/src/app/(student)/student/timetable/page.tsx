"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { academicService } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { Calendar, Loader2 } from "lucide-react"

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const HOURS = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"]

interface TimetableEntry {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  subject_id: string
  subject_name?: string
  teacher_name?: string
  room?: string
}

export default function StudentTimetable() {
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    academicService.timetable
      .list()
      .then((r: any) => {
        const data = r.data || []
        if (data.length === 0) {
          const mock: TimetableEntry[] = [
            { id: "1", day_of_week: 1, start_time: "08:00", end_time: "09:00", subject_id: "subj-1", subject_name: "Mathematics", teacher_name: "Mr. Smith", room: "101" },
            { id: "2", day_of_week: 1, start_time: "09:00", end_time: "10:00", subject_id: "subj-2", subject_name: "English", teacher_name: "Ms. Johnson", room: "102" },
            { id: "3", day_of_week: 1, start_time: "10:00", end_time: "11:00", subject_id: "subj-3", subject_name: "Science", teacher_name: "Dr. Brown", room: "201" },
            { id: "4", day_of_week: 2, start_time: "08:00", end_time: "09:00", subject_id: "subj-4", subject_name: "History", teacher_name: "Mr. Davis", room: "103" },
            { id: "5", day_of_week: 2, start_time: "09:00", end_time: "10:00", subject_id: "subj-1", subject_name: "Mathematics", teacher_name: "Mr. Smith", room: "101" },
            { id: "6", day_of_week: 2, start_time: "10:00", end_time: "11:00", subject_id: "subj-5", subject_name: "Geography", teacher_name: "Ms. Wilson", room: "104" },
            { id: "7", day_of_week: 3, start_time: "08:00", end_time: "10:00", subject_id: "subj-3", subject_name: "Science Lab", teacher_name: "Dr. Brown", room: "Lab 1" },
            { id: "8", day_of_week: 3, start_time: "10:00", end_time: "11:00", subject_id: "subj-2", subject_name: "English", teacher_name: "Ms. Johnson", room: "102" },
            { id: "9", day_of_week: 4, start_time: "08:00", end_time: "09:00", subject_id: "subj-1", subject_name: "Mathematics", teacher_name: "Mr. Smith", room: "101" },
            { id: "10", day_of_week: 4, start_time: "09:00", end_time: "10:00", subject_id: "subj-4", subject_name: "History", teacher_name: "Mr. Davis", room: "103" },
            { id: "11", day_of_week: 4, start_time: "11:00", end_time: "12:00", subject_id: "subj-6", subject_name: "Physical Education", teacher_name: "Coach Taylor", room: "Gym" },
            { id: "12", day_of_week: 5, start_time: "08:00", end_time: "09:00", subject_id: "subj-5", subject_name: "Geography", teacher_name: "Ms. Wilson", room: "104" },
            { id: "13", day_of_week: 5, start_time: "09:00", end_time: "10:00", subject_id: "subj-3", subject_name: "Science", teacher_name: "Dr. Brown", room: "201" },
          ]
          setEntries(mock)
        } else {
          setEntries(data)
        }
      })
      .catch(() => {
        toast({ title: "Failed to load timetable", variant: "destructive" })
        setEntries([])
      })
      .finally(() => setLoading(false))
  }, [])

  const getEntryForDayHour = (day: number, hour: string): TimetableEntry | undefined => {
    return entries.find(
      (e) =>
        e.day_of_week === day &&
        e.start_time <= hour &&
        e.end_time > hour
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">My Timetable</h1>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading...</span>
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
            <p className="text-sm text-muted-foreground">No records found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Timetable</h1>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="p-2 border bg-muted/50 text-muted-foreground font-medium w-16 text-xs">
                Time
              </th>
              {DAYS.map((day, i) => (
                <th key={i} className="p-2 border bg-muted/50 text-muted-foreground font-medium text-xs min-w-[120px]">
                  {day.substring(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((hour) => (
              <tr key={hour}>
                <td className="p-2 border text-xs text-muted-foreground font-mono text-center">
                  {hour}
                </td>
                {DAYS.map((_, dayIdx) => {
                  const entry = getEntryForDayHour(dayIdx, hour)
                  return (
                    <td key={dayIdx} className="p-1 border align-top">
                      {entry ? (
                        <div className="rounded bg-primary/10 p-1.5 text-xs h-full">
                          <div className="font-medium text-primary">{entry.subject_name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {entry.start_time?.substring(0, 5)}-{entry.end_time?.substring(0, 5)}
                          </div>
                          {entry.teacher_name && (
                            <div className="text-[10px] text-muted-foreground">{entry.teacher_name}</div>
                          )}
                          {entry.room && (
                            <div className="text-[10px] text-muted-foreground">Room {entry.room}</div>
                          )}
                        </div>
                      ) : (
                        <div className="h-8" />
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
