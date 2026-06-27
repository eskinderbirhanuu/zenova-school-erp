"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import api from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { Megaphone, Bell } from "lucide-react"

export default function CommunicationPage() {
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : ""

  const load = () => {
    api.get("/announcements").then((r: any) => setAnnouncements(r.data)).catch(() => {})
    api.get("/notifications").then((r: any) => setNotifications(r.data)).catch(() => {})
  }

  useEffect(() => { load() }, [])

  const markAllRead = async () => {
    await api.post("/notifications/read-all"); load(); toast({ title: "All marked read" })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Notifications</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5" /> Announcements</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {announcements.map((a: any) => (
              <div key={a.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{a.title}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    a.priority === "high" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                  }`}>{a.priority}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{a.message}</p>
                <p className="mt-2 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
              </div>
            ))}
            {announcements.length === 0 && <p className="text-sm text-muted-foreground">No announcements</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Notifications</CardTitle>
              <Button variant="outline" size="sm" onClick={markAllRead}>Mark all read</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {notifications.map((n: any) => (
              <div key={n.id} className={`rounded-lg border p-3 ${!n.is_read ? "border-l-2 border-l-blue-500 bg-blue-50/50" : ""}`}>
                <div className="flex items-start justify-between">
                  <h4 className={`text-sm ${!n.is_read ? "font-semibold" : ""}`}>{n.title}</h4>
                  {!n.is_read && <span className="h-2 w-2 rounded-full bg-blue-500" />}
                </div>
                {n.message && <p className="mt-1 text-xs text-muted-foreground">{n.message}</p>}
                <p className="mt-1 text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
              </div>
            ))}
            {notifications.length === 0 && <p className="text-sm text-muted-foreground">No notifications</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
