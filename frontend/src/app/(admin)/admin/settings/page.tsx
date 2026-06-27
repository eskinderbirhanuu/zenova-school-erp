"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import api from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { Save, Bell, Lock, Calendar, Globe } from "lucide-react"

const sectionDefs = [
  { key: "academic", title: "Academic Settings", icon: Calendar, description: "Term dates, grading scale, and academic year configuration", fields: [
    { key: "current_academic_year", label: "Current Academic Year", type: "text" },
    { key: "term_start_date", label: "Term Start Date", type: "date" },
    { key: "term_end_date", label: "Term End Date", type: "date" },
    { key: "grading_scale", label: "Grading Scale", type: "text" },
    { key: "passing_grade", label: "Passing Grade", type: "text" },
  ]},
  { key: "communication", title: "Communication", icon: Bell, description: "School notification and alert preferences", fields: [
    { key: "default_language", label: "Default Language", type: "text" },
    { key: "notification_email", label: "Notification Email", type: "email" },
    { key: "sms_provider", label: "SMS Provider", type: "text" },
    { key: "enable_email_notifications", label: "Enable Email Notifications", type: "text" },
    { key: "enable_sms_alerts", label: "Enable SMS Alerts", type: "text" },
  ]},
  { key: "access_control", title: "Access Control", icon: Lock, description: "Role permissions and security policies", fields: [
    { key: "allow_self_registration", label: "Allow Self-Registration", type: "text" },
    { key: "require_parent_approval", label: "Require Parent Approval", type: "text" },
    { key: "session_timeout", label: "Session Timeout (minutes)", type: "text" },
    { key: "max_login_attempts", label: "Max Login Attempts", type: "text" },
    { key: "two_factor_auth", label: "Two-Factor Auth", type: "text" },
  ]},
  { key: "system", title: "System Preferences", icon: Globe, description: "Regional and system-wide configuration", fields: [
    { key: "timezone", label: "Timezone", type: "text" },
    { key: "date_format", label: "Date Format", type: "text" },
    { key: "currency", label: "Currency", type: "text" },
    { key: "week_start_day", label: "Week Start Day", type: "text" },
  ]},
]

export default function AdminSettings() {
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get("/settings").then((res) => {
      const s = res.data?.settings || {}
      const defaults: Record<string, string> = {}
      sectionDefs.forEach(sec => sec.fields.forEach(f => { defaults[f.key] = s[f.key] || "" }))
      setValues(defaults)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put("/settings", { settings: values })
      toast({ title: "Settings saved" })
    } catch { toast({ title: "Failed to save", variant: "destructive" }) }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Settings</h1>
          <p className="text-sm text-muted-foreground">Configure school-wide preferences and policies</p>
        </div>
        <Button onClick={handleSave} disabled={saving || loading}>
          <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {sectionDefs.map((s, i) => {
          const Icon = s.icon
          return (
            <Card key={i}>
              <CardHeader className="flex flex-row items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-2"><Icon className="h-5 w-5 text-primary" /></div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{s.title}</CardTitle>
                  <CardDescription>{s.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {s.fields.map((f) => (
                  <div key={f.key} className="space-y-1.5">
                    <label className="text-sm font-medium">{f.label}</label>
                    <Input value={values[f.key] || ""} type={f.type}
                      onChange={e => setValues({...values, [f.key]: e.target.value})} />
                  </div>
                ))}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
