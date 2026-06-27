"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { teacherService } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { GraduationCap, Loader2, CheckCircle2, ArrowLeft, Mail, Phone, BookOpen } from "lucide-react"
import Link from "next/link"

export default function NewTeacherPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", classes: "", password: "" })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const update = (p: Partial<typeof form>) => setForm(prev => ({ ...prev, ...p }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await teacherService.create({ full_name: form.name, email: form.email, phone: form.phone, subject: form.subject, assigned_classes: form.classes, password: form.password })
      toast({ title: "Teacher account created successfully" })
      setSuccess(true)
      setTimeout(() => router.push("/director/teachers"), 1500)
    } catch (err: any) {
      toast({ title: err?.response?.data?.detail || "Failed to create teacher account", variant: "destructive" })
    } finally { setLoading(false) }
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-600 mb-4" />
            <h2 className="text-xl font-semibold">Teacher Account Created</h2>
            <p className="text-sm text-muted-foreground mt-2">Redirecting to teachers list...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/director/teachers"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">Add New Teacher</h1>
          <p className="text-sm text-muted-foreground">Create a new teacher account for the school</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5" /> Teacher Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input placeholder="e.g. Emily Davis" value={form.name} onChange={e => update({ name: e.target.value })} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2"><Mail className="h-3 w-3" /> Email</label>
                <Input type="email" placeholder="teacher@school.edu" value={form.email} onChange={e => update({ email: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2"><Phone className="h-3 w-3" /> Phone</label>
                <Input type="tel" placeholder="+251..." value={form.phone} onChange={e => update({ phone: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2"><BookOpen className="h-3 w-3" /> Subject</label>
                <Input placeholder="e.g. Mathematics" value={form.subject} onChange={e => update({ subject: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Assigned Classes</label>
                <Input placeholder="e.g. 10A, 10B" value={form.classes} onChange={e => update({ classes: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input type="password" placeholder="Set initial password" value={form.password} onChange={e => update({ password: e.target.value })} required />
            </div>

            <div className="border-t pt-4 flex justify-end gap-3">
              <Link href="/director/teachers"><Button type="button" variant="outline">Cancel</Button></Link>
              <Button type="submit" className="gap-2" disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : "Create Teacher Account"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
