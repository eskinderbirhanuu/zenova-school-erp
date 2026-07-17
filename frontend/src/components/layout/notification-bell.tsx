"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useMe } from "@/hooks/queries"

export function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const { data: user } = useMe()
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"
  const WS_BASE = API_BASE.replace(/^http/, "ws")

  const load = useCallback(() => {
    const opts: RequestInit = {
      credentials: "include",
      headers: { "X-CSRF-Token": document.cookie.replace(/(?:(?:^|.*;\s*)csrf_token\s*=\s*([^;]*).*$)|^.*$/, "$1") },
    }
    fetch(`${API_BASE}/notifications?unread_only=true`, opts)
      .then((r) => r.json())
      .then((data: unknown) => { if (Array.isArray(data)) setNotifications(data as any[]) })
      .catch(() => {})
  }, [API_BASE])

  useEffect(() => {
    if (!user) return
    load()
    const wsUrl = `${WS_BASE}/ws/notifications`
    let ws: WebSocket | null = null
    try {
      ws = new WebSocket(wsUrl)
      ws.onmessage = (e) => {
        try {
          const n = JSON.parse(e.data)
          setNotifications(prev => [n, ...prev].slice(0, 50))
        } catch {}
      }
      ws.onclose = () => { setTimeout(load, 30000) }
      wsRef.current = ws
    } catch { load() }
    return () => { ws?.close() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, load])

  const markRead = async (id: string) => {
    await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: "POST",
      credentials: "include",
      headers: { "X-CSRF-Token": document.cookie.replace(/(?:(?:^|.*;\s*)csrf_token\s*=\s*([^;]*).*$)|^.*$/, "$1") },
    })
    setNotifications(prev => prev.filter((n) => n.id !== id))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {notifications.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
              {notifications.length > 9 ? "9+" : notifications.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {notifications.length === 0 && <DropdownMenuItem className="text-muted-foreground">No new notifications</DropdownMenuItem>}
        {notifications.map((n: any) => (
          <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-1 py-2" onClick={() => markRead(n.id)}>
            <span className="font-medium text-sm">{n.title}</span>
            {n.message && <span className="text-xs text-muted-foreground line-clamp-2">{n.message}</span>}
            <span className="text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleDateString()}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
