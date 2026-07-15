"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useMyProfile, useMe } from "@/hooks/queries"
import { teacherService } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { User, Mail, Phone, Building2, BookOpen, Calendar, Loader2, Save } from "lucide-react"

interface TeacherProfile {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  employee_id?: string
  department?: string
  specialization?: string
  qualifications?: string
  join_date?: string
  address?: string
}

export default function TeacherProfile() {
  const [profile, setProfile] = useState<TeacherProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    department: "",
    specialization: "",
    qualifications: "",
    address: "",
  })
  const { data: meData } = useMe()
  const { data: tp } = useMyProfile()

  useEffect(() => {
    if (!meData || !tp) return
    const me = meData
    setProfile({
      id: tp.id || (me as any).id,
      first_name: (me as any).full_name?.split(" ")[0] || "",
      last_name: (me as any).full_name?.split(" ").slice(1).join(" ") || "",
      email: (me as any).email,
      phone: (me as any).phone || "",
      employee_id: (tp as any).teacher_id || (me as any).employee_id || (me as any).id,
      department: (me as any).department || "",
      specialization: (me as any).specialization || "",
      qualifications: (me as any).qualifications || "",
      join_date: (me as any).created_at,
      address: (me as any).address || "",
    })
    setForm({
      first_name: (me as any).full_name?.split(" ")[0] || "",
      last_name: (me as any).full_name?.split(" ").slice(1).join(" ") || "",
      email: (me as any).email,
      phone: (me as any).phone || "",
      department: (me as any).department || "",
      specialization: (me as any).specialization || "",
      qualifications: (me as any).qualifications || "",
      address: (me as any).address || "",
    })
    setLoading(false)
  }, [meData, tp])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await teacherService.updateMe({
        full_name: `${form.first_name} ${form.last_name}`,
        email: form.email,
        phone: form.phone,
        department: form.department,
        qualification: form.qualifications,
      } as any)
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
        <Button
          variant={editing ? "outline" : "default"}
          onClick={() => setEditing(!editing)}
        >
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
            <p className="text-sm text-muted-foreground">
              {profile.employee_id ? `ID: ${profile.employee_id}` : "Teacher"}
            </p>
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
              {profile.join_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Joined {new Date(profile.join_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Professional Info
              </CardTitle>
              <CardDescription>Your teaching and departmental details</CardDescription>
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
                      <label className="text-sm font-medium">Department</label>
                      <Input
                        value={form.department}
                        onChange={(e) => setForm({ ...form, department: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium">Specialization</label>
                      <Input
                        value={form.specialization}
                        onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="text-sm font-medium">Qualifications</label>
                      <Input
                        value={form.qualifications}
                        onChange={(e) => setForm({ ...form, qualifications: e.target.value })}
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
                    <span className="text-muted-foreground">Department</span>
                    <p className="font-medium">{profile.department || "Not set"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Specialization</span>
                    <p className="font-medium">{profile.specialization || "Not set"}</p>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-muted-foreground">Qualifications</span>
                    <p className="font-medium">{profile.qualifications || "Not set"}</p>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-muted-foreground">Address</span>
                    <p className="font-medium">{profile.address || "Not set"}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Teaching
              </CardTitle>
              <CardDescription>Subjects and classes assigned</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View your assigned subjects and classes in the{" "}
                <a href="/teacher/timetable" className="text-primary underline underline-offset-4">
                  Timetable
                </a>{" "}
                section.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
