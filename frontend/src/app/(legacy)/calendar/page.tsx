"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import api from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { Plus, CalendarDays, MapPin } from "lucide-react"

const EVENT_TYPES = ["general", "academic", "holiday", "sports", "meeting", "exam", "deadline"]

export default function CalendarPage() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState("")
  const [form, setForm] = useState({ title: "", description: "", event_type: "general", event_date: "", end_date: "", location: "" })

  const load = async () => {
    setLoading(true)
    try {
      const params = filter ? { event_type: filter } : {}
      const res = await api.get("/events", { params })
      setEvents(res.data || [])
    } catch { setEvents([]) }
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post("/events", {
        ...form,
        event_date: new Date(form.event_date).toISOString(),
        end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
      })
      toast({ title: "Event created" }); setShowForm(false)
      setForm({ title: "", description: "", event_type: "general", event_date: "", end_date: "", location: "" })
      load()
    } catch { toast({ title: "Failed", variant: "destructive" }) }
  }

  const handleDelete = async (id: string) => {
    try { await api.delete(`/events/${id}`); toast({ title: "Deleted" }); load() } catch { toast({ title: "Failed", variant: "destructive" }) }
  }

  const typeColors: Record<string, string> = {
    general: "bg-blue-100 text-blue-700", academic: "bg-purple-100 text-purple-700",
    holiday: "bg-green-100 text-green-700", sports: "bg-orange-100 text-orange-700",
    meeting: "bg-pink-100 text-pink-700", exam: "bg-red-100 text-red-700",
    deadline: "bg-yellow-100 text-yellow-700",
  }

  const groupedByDate = events.reduce((acc: Record<string, any[]>, ev: any) => {
    const d = ev.event_date?.substring(0, 10) || "unknown"
    if (!acc[d]) acc[d] = []
    acc[d].push(ev)
    return acc
  }, {} as Record<string, any[]>)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">School Calendar</h1>
        <div className="flex gap-2">
          <select value={filter} onChange={e => setFilter(e.target.value)} className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">All Types</option>
            {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <Button onClick={() => setShowForm(!showForm)}><Plus className="mr-1 h-4 w-4" />{showForm ? "Cancel" : "New Event"}</Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Event</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
              <Input placeholder="Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required className="md:col-span-2" />
              <Input placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="md:col-span-2" />
              <div className="flex flex-col gap-1.5"><label className="text-xs text-muted-foreground">Type</label>
                <select value={form.event_type} onChange={e => setForm({...form, event_type: e.target.value})} className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select></div>
              <div className="flex flex-col gap-1.5"><label className="text-xs text-muted-foreground">Location</label>
                <Input value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></div>
              <div className="flex flex-col gap-1.5"><label className="text-xs text-muted-foreground">Start Date *</label>
                <Input type="date" value={form.event_date} onChange={e => setForm({...form, event_date: e.target.value})} required /></div>
              <div className="flex flex-col gap-1.5"><label className="text-xs text-muted-foreground">End Date</label>
                <Input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} /></div>
              <Button type="submit" className="md:col-span-2">Create Event</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {Object.entries(groupedByDate).sort(([a], [b]) => b.localeCompare(a)).map(([date, dayEvents]) => (
        <div key={date}>
          <h2 className="mb-3 text-lg font-semibold">
            <CalendarDays className="mr-2 inline h-4 w-4 text-muted-foreground" />
            {new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </h2>
          <div className="space-y-2">
            {dayEvents.map((ev: any) => (
              <Card key={ev.id} className="hover:bg-muted/30 transition-colors">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${typeColors[ev.event_type] || typeColors.general}`}>{ev.event_type}</span>
                      <h3 className="font-semibold">{ev.title}</h3>
                    </div>
                    {ev.description && <p className="text-sm text-muted-foreground">{ev.description}</p>}
                    {ev.location && <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{ev.location}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {ev.end_date && <span className="text-xs text-muted-foreground">until {ev.end_date.substring(0, 10)}</span>}
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(ev.id)}>Delete</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
      {!loading && events.length === 0 && <p className="text-center text-muted-foreground py-12">No events. Create one!</p>}
    </div>
  )
}
