"use client"

import { useEffect, useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { authService, parentService } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Loader2,
  Save,
  Users,
} from "lucide-react"

interface ParentProfile {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  address?: string
  occupation?: string
  relationship?: string
}

export default function ParentProfile() {
  const [profile, setProfile] = useState<ParentProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
    occupation: "",
    relationship: "",
  })

  useEffect(() => {
    setLoading(true)
    Promise.all([authService.me(), parentService.list()])
      .then(([meRes, parentRes]: any[]) => {
        const me = meRes.data
        const parents = parentRes.data || []
        const parent = parents.find((p: any) => p.email === me.email) || {
          ...me,
          id: me.id,
        }
        setProfile(parent)
        setForm({
          first_name: parent.first_name || "",
          last_name: parent.last_name || "",
          email: parent.email || "",
          phone: parent.phone || "",
          address: parent.address || "",
          occupation: parent.occupation || "",
          relationship: parent.relationship || "",
        })
      })
      .catch(() => toast({ title: "Failed to load profile", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await parentService.update(profile!.id, form)
      toast({ title: "Profile updated" })
      setEditing(false)
    } catch {
      toast({ title: "Failed to update profile", variant: "destructive" })
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">My Profile</h1>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading...</span>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">My Profile</h1>
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <User className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Could not load profile</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Profile</h1>
        <Button variant={editing ? "outline" : "default"} onClick={() => setEditing(!editing)}>
          {editing ? "Cancel" : "Edit Profile"}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardContent className="flex flex-col items-center pt-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 mb-4">
              <User className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-xl font-bold">
              {profile.first_name} {profile.last_name}
            </h2>
            <p className="text-sm text-muted-foreground">Parent / Guardian</p>
            <div className="mt-4 w-full space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{profile.email}</span>
              </div>
              {profile.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{profile.phone}</span>
                </div>
              )}
              {profile.relationship && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{profile.relationship}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>Your contact and personal details</CardDescription>
            </CardHeader>
            <CardContent>
              {editing ? (
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium">First Name</label>
                      <Input
                        value={form.first_name}
                        onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium">Last Name</label>
                      <Input
                        value={form.last_name}
                        onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium">Email</label>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium">Phone</label>
                      <Input
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium">Occupation</label>
                      <Input
                        value={form.occupation}
                        onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium">Relationship</label>
                      <Input
                        value={form.relationship}
                        onChange={(e) => setForm({ ...form, relationship: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="text-sm font-medium">Address</label>
                      <Input
                        value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={saving}>
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">First Name</span>
                    <p className="font-medium">{profile.first_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Name</span>
                    <p className="font-medium">{profile.last_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email</span>
                    <p className="font-medium">{profile.email}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone</span>
                    <p className="font-medium">{profile.phone || "Not set"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Occupation</span>
                    <p className="font-medium">{profile.occupation || "Not set"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Relationship</span>
                    <p className="font-medium">{profile.relationship || "Not set"}</p>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-muted-foreground">Address</span>
                    <p className="font-medium">{profile.address || "Not set"}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
