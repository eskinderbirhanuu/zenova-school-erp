"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GenericListPage } from "@/components/ui/generic-list-page"
import api from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { Loader2, Send, Plus, X } from "lucide-react"
import { useMessages } from "@/hooks/queries"

export default function ParentMessagesPage() {
  const [showCompose, setShowCompose] = useState(false)
  const [sending, setSending] = useState(false)
  const [form, setForm] = useState({ recipient_email: "", subject: "", message: "" })
  const { data: messagesData, isLoading: loading, refetch } = useMessages({ limit: 200 })

  const messages = (messagesData ?? []).map((m: any) => ({
    id: m.id,
    from: m.sender_name || m.sender_id || "System",
    subject: m.subject || "(No Subject)",
    message: m.message || m.body || "",
    date: m.date || m.created_at || m.sent_at || "—",
  }))

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.subject || !form.message) {
      toast({ title: "Subject and message required", variant: "destructive" })
      return
    }
    setSending(true)
    try {
      await api.post("/messages", form)
      toast({ title: "Message sent" })
      setShowCompose(false)
      setForm({ recipient_email: "", subject: "", message: "" })
      refetch()
    } catch (err: any) {
      toast({ title: err.response?.data?.detail || "Failed to send", variant: "destructive" })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
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
        actions={<Button onClick={() => setShowCompose(!showCompose)}>{showCompose ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}{showCompose ? "Cancel" : "Compose"}</Button>}
      />

      {showCompose && (
        <Card>
          <CardHeader><CardTitle>Send Message</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSend} className="space-y-4">
              <div className="space-y-2">
                <Label>Recipient Email <span className="text-xs text-muted-foreground">(optional — leave blank for school admin)</span></Label>
                <Input
                  type="email"
                  value={form.recipient_email}
                  onChange={e => setForm(p => ({ ...p, recipient_email: e.target.value }))}
                  placeholder="teacher@school.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} required placeholder="Message subject" />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <textarea
                  value={form.message}
                  onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                  required
                  rows={4}
                  placeholder="Type your message..."
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={sending}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="mr-2 h-4 w-4" />}
                  Send Message
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
