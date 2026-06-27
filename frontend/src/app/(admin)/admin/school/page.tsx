"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/ui/page-header"
import { toast } from "@/hooks/use-toast"
import { Building2, Save, MapPin, Phone, Mail, Globe, Hash, Calendar, Loader2 } from "lucide-react"
import api from "@/services/api"

export default function AdminSchool() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: "",
    code: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    founded: "",
    motto: "",
    timezone: "",
    language: "",
  })

  useEffect(() => {
    api.get("/schools/me")
      .then((res) => {
        const s = res.data?.data || res.data || {}
        setForm({
          name: s.name || "",
          code: s.code || "",
          address: s.address || "",
          phone: s.phone || "",
          email: s.email || "",
          website: s.website || "",
          founded: s.founded || s.founded_year?.toString() || "",
          motto: s.motto || "",
          timezone: s.timezone || "",
          language: s.language || "",
        })
      })
      .catch((err) => {
        toast({ title: "Failed to load school data", description: err?.response?.data?.detail || err.message, variant: "destructive" })
      })
      .finally(() => setLoading(false))
  }, [])

  const update = (p: Partial<typeof form>) => setForm(prev => ({ ...prev, ...p }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.patch("/schools/me", form)
      toast({ title: "School settings saved successfully" })
    } catch (err: any) {
      toast({ title: "Failed to save school settings", description: err?.response?.data?.detail || err.message, variant: "destructive" })
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
        title="School Profile"
        description="Manage your school's identity and contact information"
        actions={
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save Changes"}
          </Button>
        }
      />

      <Card shadow="default">
        <CardHeader className="flex flex-row items-start gap-4">
          <div className="rounded-lg bg-primary/10 p-2"><Building2 className="h-5 w-5 text-primary" /></div>
          <div className="flex-1">
            <CardTitle className="text-lg">School Information</CardTitle>
            <CardDescription>Basic information about the school</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">School Name</label>
              <Input value={form.name} onChange={e => update({ name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2"><Hash className="h-3 w-3" /> School Code</label>
              <Input value={form.code} onChange={e => update({ code: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2"><Calendar className="h-3 w-3" /> Founded Year</label>
              <Input value={form.founded} onChange={e => update({ founded: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">School Motto</label>
              <Input value={form.motto} onChange={e => update({ motto: e.target.value })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card shadow="default">
        <CardHeader className="flex flex-row items-start gap-4">
          <div className="rounded-lg bg-primary/10 p-2"><MapPin className="h-5 w-5 text-primary" /></div>
          <div className="flex-1">
            <CardTitle className="text-lg">Contact and Location</CardTitle>
            <CardDescription>School address and contact details</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2"><MapPin className="h-3 w-3" /> Address</label>
            <Input value={form.address} onChange={e => update({ address: e.target.value })} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2"><Phone className="h-3 w-3" /> Phone</label>
              <Input value={form.phone} onChange={e => update({ phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2"><Mail className="h-3 w-3" /> Email</label>
              <Input type="email" value={form.email} onChange={e => update({ email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2"><Globe className="h-3 w-3" /> Website</label>
              <Input value={form.website} onChange={e => update({ website: e.target.value })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card shadow="default">
        <CardHeader className="flex flex-row items-start gap-4">
          <div className="rounded-lg bg-primary/10 p-2"><Globe className="h-5 w-5 text-primary" /></div>
          <div className="flex-1">
            <CardTitle className="text-lg">Regional Settings</CardTitle>
            <CardDescription>Timezone, language, and localization preferences</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Timezone</label>
              <Input value={form.timezone} onChange={e => update({ timezone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Default Language</label>
              <Input value={form.language} onChange={e => update({ language: e.target.value })} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}