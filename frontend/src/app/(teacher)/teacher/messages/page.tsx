"use client"

import { useEffect, useState } from "react"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import api from "@/services/api"
import { toast } from "@/hooks/use-toast"

export default function TeacherMessagesPage() {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get("/messages", { params: { limit: 200 } })
      .then(res => setMessages(res.data || []))
      .catch(err => toast({ title: "Failed to load messages", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [])

  const normalized = messages.map((m: any) => ({
    id: m.id,
    from: m.sender_name || m.sender_id || "System",
    subject: m.subject || "(No subject)",
    message: m.message || m.body || "",
    date: m.created_at ? new Date(m.created_at).toLocaleDateString() : "—",
    is_read: m.is_read || m.read_at !== null,
  }))

  return (
    <GenericListPage
      title="Messages" description="View your messages and announcements"
      columns={[
        { key: "from", header: "From", render: (m) => <span className="font-medium">{m.from}</span> },
        { key: "subject", header: "Subject", render: (m) => <span>{m.subject}</span> },
        { key: "message", header: "Message", render: (m) => <span className="text-muted-foreground max-w-[250px] truncate block">{m.message}</span> },
        { key: "date", header: "Date", render: (m) => <span className="text-muted-foreground">{m.date}</span> },
        { key: "read", header: "", render: (m) => !m.is_read ? <span className="flex h-2 w-2 rounded-full bg-blue-500" /> : null },
      ]}
      data={normalized} keyExtractor={(m) => m.id}
      loading={loading} emptyTitle="No messages"
    />
  )
}
