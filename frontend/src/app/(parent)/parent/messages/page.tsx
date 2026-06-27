"use client"

import { useEffect, useState } from "react"
import { GenericListPage } from "@/components/ui/generic-list-page"
import api from "@/services/api"

export default function ParentMessagesPage() {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get("/messages", { params: { limit: 200 } })
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : res.data?.data || res.data?.messages || []
        setMessages(
          data.map((m: any) => ({
            id: m.id,
            from: m.sender_name || m.sender_id || "System",
            subject: m.subject || "(No Subject)",
            message: m.message || m.body || "",
            date: m.date || m.created_at || m.sent_at || "—",
          }))
        )
      })
      .catch(() => {
        setMessages([])
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <GenericListPage
      title="Messages" description="View school communications and announcements"
      columns={[
        { key: "from", header: "From", render: (m) => <span className="font-medium">{m.from}</span> },
        { key: "subject", header: "Subject", render: (m) => <span>{m.subject}</span> },
        { key: "message", header: "Message", render: (m) => <span className="text-muted-foreground max-w-[250px] truncate block">{m.message}</span> },
        { key: "date", header: "Date", render: (m) => <span className="text-muted-foreground">{m.date}</span> },
      ]}
      data={messages} keyExtractor={(m) => m.id}
      loading={loading} emptyTitle="No messages"
    />
  )
}
