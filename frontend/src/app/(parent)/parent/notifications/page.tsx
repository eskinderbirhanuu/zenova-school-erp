"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { toast } from "@/hooks/use-toast"
import { Bell, BellOff, Mail, MessageSquare, Smartphone, Loader2, Save } from "lucide-react"
import api from "@/services/api"

interface NotificationPrefs {
  email_on_absence: boolean
  email_on_payment: boolean
  email_on_result: boolean
  email_on_message: boolean
  telegram_on_absence: boolean
  telegram_on_payment: boolean
  telegram_on_result: boolean
  telegram_on_message: boolean
  sms_on_absence: boolean
  sms_on_payment: boolean
  sms_on_result: boolean
  sms_on_message: boolean
}

const DEFAULT_PREFS: NotificationPrefs = {
  email_on_absence: true,
  email_on_payment: true,
  email_on_result: true,
  email_on_message: false,
  telegram_on_absence: true,
  telegram_on_payment: false,
  telegram_on_result: true,
  telegram_on_message: true,
  sms_on_absence: false,
  sms_on_payment: false,
  sms_on_result: false,
  sms_on_message: false,
}

type Channel = "email" | "telegram" | "sms"
const CHANNELS: { key: Channel; label: string; icon: typeof Mail }[] = [
  { key: "email", label: "Email", icon: Mail },
  { key: "telegram", label: "Telegram", icon: MessageSquare },
  { key: "sms", label: "SMS", icon: Smartphone },
]

const EVENTS: { key: string; label: string }[] = [
  { key: "absence", label: "Absence Alerts" },
  { key: "payment", label: "Payment Receipts" },
  { key: "result", label: "Exam Results" },
  { key: "message", label: "New Messages" },
]

export default function ParentNotifications() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS)

  useEffect(() => {
    api.get("/notifications/preferences")
      .then((res) => {
        const d = res.data?.data || res.data || {}
        setPrefs({ ...DEFAULT_PREFS, ...d })
      })
      .catch((err) => {
        toast({ title: "Failed to load preferences", description: err?.response?.data?.detail || err.message, variant: "destructive" })
      })
      .finally(() => setLoading(false))
  }, [])

  const toggle = (channel: Channel, event: string) => {
    setPrefs((prev) => ({
      ...prev,
      [`${channel}_on_${event}`]: !prev[`${channel}_on_${event}` as keyof NotificationPrefs],
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put("/notifications/preferences", prefs)
      toast({ title: "Notification preferences saved" })
    } catch (err: any) {
      toast({ title: "Failed to save preferences", description: err?.response?.data?.detail || err.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Notification Preferences"
        description="Choose how you want to receive notifications"
        actions={
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save Preferences"}
          </Button>
        }
      />

      <Card shadow="default">
        <CardHeader className="flex flex-row items-start gap-4">
          <div className="rounded-lg bg-primary/10 p-2">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">Notification Channels</CardTitle>
            <CardDescription>Enable or disable notification types per channel</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setPrefs(DEFAULT_PREFS)}>
            <BellOff className="h-4 w-4 mr-2" /> Reset to Default
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 pr-4 font-medium">Event</th>
                  {CHANNELS.map((ch) => {
                    const Icon = ch.icon
                    return (
                      <th key={ch.key} className="text-center py-3 px-4 font-medium">
                        <div className="flex items-center justify-center gap-1">
                          <Icon className="h-4 w-4" />
                          <span className="hidden sm:inline">{ch.label}</span>
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {EVENTS.map((ev) => (
                  <tr key={ev.key} className="border-b last:border-0">
                    <td className="py-3 pr-4">{ev.label}</td>
                    {CHANNELS.map((ch) => {
                      const key = `${ch.key}_on_${ev.key}` as keyof NotificationPrefs
                      const enabled = prefs[key]
                      return (
                        <td key={ch.key} className="text-center py-3 px-4">
                          <button
                            type="button"
                            onClick={() => toggle(ch.key, ev.key)}
                            className={`inline-flex items-center justify-center w-10 h-6 rounded-full transition-colors ${
                              enabled ? "bg-primary" : "bg-muted"
                            }`}
                          >
                            <span
                              className={`inline-block w-4 h-4 rounded-full bg-white transition-transform ${
                                enabled ? "translate-x-2" : "-translate-x-2"
                              }`}
                            />
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            In-app notifications are always enabled. Telegram requires linking your account via the school bot first.
            SMS requires a valid phone number on your profile.
          </p>
        </CardContent>
      </Card>

      <Card shadow="default">
        <CardHeader className="flex flex-row items-start gap-4">
          <div className="rounded-lg bg-primary/10 p-2">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">Link Telegram</CardTitle>
            <CardDescription>To receive Telegram notifications, link your account via the school bot</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <ol className="list-decimal list-inside space-y-1">
            <li>Open Telegram and search for your school's bot</li>
            <li>Send <code className="bg-muted px-1 rounded text-xs">/link</code> followed by your student ID and parent portal password</li>
            <li>Format: <code className="bg-muted px-1 rounded text-xs">/link STUDENT123 yourpassword</code></li>
            <li>Once linked, come back here and enable Telegram toggles</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
