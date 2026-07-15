"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/ui/page-header"
import { useCreateStaff } from "@/hooks/queries"
import { toast } from "@/hooks/use-toast"
import { Users, Loader2, CheckCircle2, ArrowLeft, Mail, Phone, Briefcase } from "lucide-react"
import Link from "next/link"

export default function NewStaffPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: "", email: "", phone: "", department: "", role: "", password: "" })
  const [success, setSuccess] = useState(false)

  const { mutateAsync: createStaff, isPending: saving } = useCreateStaff()

  const update = (p: Partial<typeof form>) => setForm(prev => ({ ...prev, ...p }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createStaff({ full_name: form.name, email: form.email, phone: form.phone, department: form.department, role: form.role, password: form.password } as any)
      toast({ title: "Staff account created successfully" })
      setSuccess(true)
      setTimeout(() => router.push("/director/staff"), 1500)
    } catch (err: any) {
      toast({ title: err?.response?.data?.detail || "Failed to create staff account", variant: "destructive" })
    }
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-600 mb-4" />
            <h2 className="text-xl font-semibold">Staff Account Created</h2>
            <p className="text-sm text-muted-foreground mt-2">Redirecting to staff list...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <PageHeader
        title="Add New Staff"
        description="Create a new staff account for the school"
        actions={
          <Link href="/director/staff">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
        }
      />

      <Card shadow="default">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Staff Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input placeholder="e.g. Jane Doe" value={form.name} onChange={e => update({ name: e.target.value })} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2"><Mail className="h-3 w-3" /> Email</label>
                <Input type="email" placeholder="staff@school.edu" value={form.email} onChange={e => update({ email: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2"><Phone className="h-3 w-3" /> Phone</label>
                <Input type="tel" placeholder="+251..." value={form.phone} onChange={e => update({ phone: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2"><Briefcase className="h-3 w-3" /> Department</label>
                <select value={form.department} onChange={e => update({ department: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                  <option value="">Select department</option>
                  <option value="Administration">Administration</option>
                  <option value="Facilities">Facilities</option>
                  <option value="IT">IT</option>
                  <option value="Finance">Finance</option>
                  <option value="HR">HR</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Input placeholder="e.g. Secretary" value={form.role} onChange={e => update({ role: e.target.value })} required />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input type="password" placeholder="Set initial password" value={form.password} onChange={e => update({ password: e.target.value })} required />
            </div>
            <div className="border-t pt-4 flex justify-end gap-3">
              <Link href="/director/staff"><Button type="button" variant="outline">Cancel</Button></Link>
              <Button type="submit" className="gap-2" disabled={saving}>
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : "Create Staff Account"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
