"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSetup } from "@/services/setup-context"
import { setupService } from "@/services/api"
import { User, Loader2, CheckCircle2, AlertCircle } from "lucide-react"

const STEPS = [
  { num: 1, label: "License" },
  { num: 2, label: "Admin" },
]

export default function ActivateAdminPage() {
  const router = useRouter()
  const { data, update } = useSetup()
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (data.adminPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }
    setLoading(true)
    setError("")
    try {
      const res = await setupService.activateInitialize({
        key: data.mainKey,
        school_name: data.schoolName,
        school_code: data.schoolCode,
        logo_url: data.logoUrl || undefined,
        admin_full_name: data.adminFullName,
        admin_email: data.adminEmail,
        admin_phone: data.adminPhone || null,
        admin_password: data.adminPassword,
      })
      if (res.data.success) {
        setSuccess(true)
        setTimeout(() => router.push("/login"), 2000)
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Activation failed")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-600 mb-4" />
            <h2 className="text-xl font-semibold">System Activated!</h2>
            <p className="text-sm text-muted-foreground mt-2">Redirecting to login...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.num} className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${s.num <= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{s.num}</div>
            <span className={`text-sm ${s.num <= 2 ? "font-semibold" : "text-muted-foreground"}`}>{s.label}</span>
            {i < STEPS.length - 1 && <div className="mx-2 h-px w-8 bg-border" />}
          </div>
        ))}
      </div>

      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
            <User className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">School & Admin Setup</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Create your school and admin account</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-medium">School Name</label>
                  <Input placeholder="e.g. International School" value={data.schoolName} onChange={e => update({ schoolName: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">School Code</label>
                  <Input placeholder="e.g. INT001" value={data.schoolCode} onChange={e => update({ schoolCode: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">School Logo URL <span className="text-muted-foreground">(optional)</span></label>
                  <Input placeholder="https://school.com/logo.png" value={data.logoUrl} onChange={e => update({ logoUrl: e.target.value })} />
                </div>
              </div>

            <div className="border-t pt-4">
              <p className="text-sm font-semibold mb-3">Admin Account</p>
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <Input placeholder="Full name" value={data.adminFullName} onChange={e => update({ adminFullName: e.target.value })} required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 mt-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input type="email" placeholder="admin@school.com" value={data.adminEmail} onChange={e => update({ adminEmail: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone</label>
                  <Input type="tel" placeholder="+251..." value={data.adminPhone} onChange={e => update({ adminPhone: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 mt-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Password</label>
                  <Input type="password" placeholder="Min 8 characters" value={data.adminPassword} onChange={e => update({ adminPassword: e.target.value })} required minLength={8} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirm Password</label>
                  <Input type="password" placeholder="Re-enter password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={8} />
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => router.push("/activate")} className="flex-1">Back</Button>
              <Button type="submit" className="flex-1 gap-2" disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Activating...</> : "Complete Activation"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
