"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/ui/page-header"
import { Globe, Lock, Bell, Database, Save } from "lucide-react"

const tabs = ["General", "Security", "Notifications", "Data"]

export default function SuperAdminSettings() {
  const [activeTab, setActiveTab] = useState("General")

  const [general, setGeneral] = useState({ systemName: "ZENOVA", timezone: "UTC", defaultLanguage: "English", maintenanceMode: false })
  const [security, setSecurity] = useState({ minPasswordLength: "8", sessionTimeout: "60", maxLoginAttempts: "5", twoFactor: true })
  const [notifications, setNotifications] = useState({ smtpHost: "smtp.zenova.com", smtpPort: "587", fromEmail: "noreply@zenova.com", smtpUser: "", smtpPass: "" })
  const [data, setData] = useState({ backupFrequency: "Daily", logRetention: "90", maxUploadSize: "50" })

  const renderTab = () => {
    switch (activeTab) {
      case "General":
        return (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>System Name</Label>
                <Input value={general.systemName} onChange={(e) => setGeneral({ ...general, systemName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={general.timezone} onChange={(e) => setGeneral({ ...general, timezone: e.target.value })}>
                  <option>UTC</option>
                  <option>America/New_York</option>
                  <option>America/Chicago</option>
                  <option>America/Denver</option>
                  <option>America/Los_Angeles</option>
                  <option>Europe/London</option>
                  <option>Asia/Tokyo</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Default Language</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={general.defaultLanguage} onChange={(e) => setGeneral({ ...general, defaultLanguage: e.target.value })}>
                  <option>English</option>
                  <option>Spanish</option>
                  <option>French</option>
                  <option>German</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Maintenance Mode</Label>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${general.maintenanceMode ? "bg-primary" : "bg-input"}`}
                    onClick={() => setGeneral({ ...general, maintenanceMode: !general.maintenanceMode })}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${general.maintenanceMode ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                  <span className="text-sm text-muted-foreground">{general.maintenanceMode ? "Enabled" : "Disabled"}</span>
                </div>
              </div>
            </div>
            <Button><Save className="h-4 w-4" /> Save General Settings</Button>
          </div>
        )
      case "Security":
        return (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Min Password Length</Label>
                <Input type="number" value={security.minPasswordLength} onChange={(e) => setSecurity({ ...security, minPasswordLength: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Session Timeout (minutes)</Label>
                <Input type="number" value={security.sessionTimeout} onChange={(e) => setSecurity({ ...security, sessionTimeout: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Max Login Attempts</Label>
                <Input type="number" value={security.maxLoginAttempts} onChange={(e) => setSecurity({ ...security, maxLoginAttempts: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Two-Factor Authentication</Label>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${security.twoFactor ? "bg-primary" : "bg-input"}`}
                    onClick={() => setSecurity({ ...security, twoFactor: !security.twoFactor })}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${security.twoFactor ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                  <span className="text-sm text-muted-foreground">{security.twoFactor ? "Enabled" : "Disabled"}</span>
                </div>
              </div>
            </div>
            <Button><Save className="h-4 w-4" /> Save Security Settings</Button>
          </div>
        )
      case "Notifications":
        return (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>SMTP Host</Label>
                <Input value={notifications.smtpHost} onChange={(e) => setNotifications({ ...notifications, smtpHost: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>SMTP Port</Label>
                <Input value={notifications.smtpPort} onChange={(e) => setNotifications({ ...notifications, smtpPort: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>From Email</Label>
                <Input type="email" value={notifications.fromEmail} onChange={(e) => setNotifications({ ...notifications, fromEmail: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>SMTP Username</Label>
                <Input value={notifications.smtpUser} onChange={(e) => setNotifications({ ...notifications, smtpUser: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>SMTP Password</Label>
                <Input type="password" value={notifications.smtpPass} onChange={(e) => setNotifications({ ...notifications, smtpPass: e.target.value })} />
              </div>
            </div>
            <Button><Save className="h-4 w-4" /> Save Notification Settings</Button>
          </div>
        )
      case "Data":
        return (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Backup Frequency</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={data.backupFrequency} onChange={(e) => setData({ ...data, backupFrequency: e.target.value })}>
                  <option>Hourly</option>
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Log Retention (days)</Label>
                <Input type="number" value={data.logRetention} onChange={(e) => setData({ ...data, logRetention: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Max Upload Size (MB)</Label>
                <Input type="number" value={data.maxUploadSize} onChange={(e) => setData({ ...data, maxUploadSize: e.target.value })} />
              </div>
            </div>
            <Button><Save className="h-4 w-4" /> Save Data Settings</Button>
          </div>
        )
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="System Settings" description="Configure global system preferences" />
      <Card>
        <CardContent className="p-0">
          <div className="flex border-b">
            {tabs.map((tab: any) => (
              <button
                key={tab}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                onClick={() => setActiveTab(tab)}
              >
                <span className="flex items-center gap-2">
                  {tab === "General" && <Globe className="h-4 w-4" />}
                  {tab === "Security" && <Lock className="h-4 w-4" />}
                  {tab === "Notifications" && <Bell className="h-4 w-4" />}
                  {tab === "Data" && <Database className="h-4 w-4" />}
                  {tab}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{activeTab} Settings</CardTitle>
          <CardDescription>Configure {activeTab.toLowerCase()} preferences for the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {renderTab()}
        </CardContent>
      </Card>
    </div>
  )
}
