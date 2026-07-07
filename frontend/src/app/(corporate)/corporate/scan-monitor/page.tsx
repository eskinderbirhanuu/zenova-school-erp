"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { Scan, Radio, Wifi, WifiOff, User, Clock } from "lucide-react"

const CARD_COLORS: Record<string, string> = {
  student: "bg-blue-50 border-blue-200 text-blue-700",
  staff: "bg-purple-50 border-purple-200 text-purple-700",
  parent: "bg-teal-50 border-teal-200 text-teal-700",
  employee: "bg-emerald-50 border-emerald-200 text-emerald-700",
}

export default function ScanMonitorPage() {
  const [events, setEvents] = useState<any[]>([])
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const eventsRef = useRef<any[]>([])

  const connect = useCallback(() => {
    const token = localStorage.getItem("zenova_token") || ""
    if (!token) {
      toast({ title: "No auth token", description: "Login required for real-time monitoring", variant: "destructive" })
      return
    }
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const url = `${protocol}//${window.location.host}/api/v1/ws/nfc-scans?token=${token}`
    const ws = new WebSocket(url)
    ws.onopen = () => setConnected(true)
    ws.onclose = () => { setConnected(false); wsRef.current = null }
    ws.onerror = () => { setConnected(false); wsRef.current = null }
    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data)
        if (data.event === "nfc_scan") {
          const updated = [data, ...eventsRef.current].slice(0, 50)
          eventsRef.current = updated
          setEvents(updated)
        }
      } catch { /* ignore */ }
    }
    wsRef.current = ws
  }, [])

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setConnected(false)
  }

  useEffect(() => {
    return () => { if (wsRef.current) wsRef.current.close() }
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scan Monitor"
        description="Real-time NFC scan events"
        actions={
          <div className="flex items-center gap-2">
            {connected ? (
              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                <Wifi className="h-3 w-3 mr-1" /> Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                <WifiOff className="h-3 w-3 mr-1" /> Disconnected
              </Badge>
            )}
            {!connected ? (
              <Button size="sm" onClick={connect}>
                <Radio className="h-4 w-4 mr-2" /> Connect
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={disconnect}>
                Disconnect
              </Button>
            )}
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" /> Live Scan Events
          </CardTitle>
          <CardDescription>Last 50 events shown in real time</CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Radio className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-sm">No scan events yet. Connect and start scanning cards.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((ev, i) => (
                <div key={i} className={`flex items-center gap-3 rounded-lg border p-3 text-sm ${CARD_COLORS[ev.reference_type] || "bg-gray-50"}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 shrink-0" />
                      <span className="font-medium truncate">{ev.person_name || "Unknown"}</span>
                      <Badge variant="outline" className="text-[10px] capitalize">{ev.reference_type}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="font-mono">{ev.card_uid}</span>
                      <span>via {ev.scan_type}</span>
                      {ev.reader_location && <span>@{ev.reader_location}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(ev.scanned_at).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
