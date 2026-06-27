"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/services/auth-context"
import { toast } from "@/hooks/use-toast"
import { Settings, Shield, Bell, Database } from "lucide-react"

export default function SettingsPage() {
  const { user } = useAuth()
  const [apiUrl, setApiUrl] = useState(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1")

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-4 w-4" /> Profile</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Name</Label><div className="text-sm font-medium">{user?.full_name}</div></div>
            <div><Label>Email</Label><div className="text-sm font-medium">{user?.email}</div></div>
            <div><Label>Role</Label><div className="text-sm"><span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium">{user?.role}</span></div></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Database className="h-4 w-4" /> API Configuration</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Backend API URL</Label>
              <Input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} />
            </div>
            <Button size="sm" onClick={() => { toast({ title: "API URL updated" }) }}>Save</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-4 w-4" /> Notifications</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Notification settings coming soon.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="h-4 w-4" /> System</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">ZENOVA v1.0.0 — Enterprise School Management</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
