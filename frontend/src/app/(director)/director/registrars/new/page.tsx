"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/ui/page-header"
import { useCreateStaff } from "@/hooks/queries"
import { toast } from "@/hooks/use-toast"
import { UserCheck, Loader2, CheckCircle2, ArrowLeft, Mail, Phone } from "lucide-react"
import Link from "next/link"

export default function NewRegistrarPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" })
  const [success, setSuccess] = useState(false)

  const { mutateAsync: createStaff, isPending: saving } = useCreateStaff()

  const update = (p: Partial<typeof form>) => setForm(prev => ({ ...prev, ...p }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createStaff({ full_name: form.name, email: form.email, phone: form.phone, password: form.password, role: "registrar" } as any)
      toast({ title: "Registrar account created successfully" })
      setSuccess(true)
      setTimeout(() => router.push("/director/registrars"), 1500)
    } catch (err: any) {
      toast({ title: err?.response?.data?.detail || "Failed to create registrar account", variant: "destructive" })
    }
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-600 mb-4" />
            <h2 className="text-xl font-semibold">Registrar Account Created</h2>
            <p className="text-sm text-muted-foreground mt-2">Redirecting to registrars list...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <PageHeader
        title="Add New Registrar"
        description="Create a new registrar account for the school"
        actions={
          <Link href="/director/registrars">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
        }
      />

      <Card shadow="default">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserCheck className="h-5 w-5" /> Registrar Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input placeholder="e.g. Karen White" value={form.name} onChange={e => update({ name: e.target.value })} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2"><Mail className="h-3 w-3" /> Email</label>
                <Input type="email" placeholder="registrar@school.edu" value={form.email} onChange={e => update({ email: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2"><Phone className="h-3 w-3" /> Phone</label>
                <Input type="tel" placeholder="+251..." value={form.phone} onChange={e => update({ phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input type="password" placeholder="Set initial password" value={form.password} onChange={e => update({ password: e.target.value })} required />
            </div>
            <div className="border-t pt-4 flex justify-end gap-3">
              <Link href="/director/registrars"><Button type="button" variant="outline">Cancel</Button></Link>
              <Button type="submit" className="gap-2" disabled={saving}>
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : "Create Registrar Account"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
