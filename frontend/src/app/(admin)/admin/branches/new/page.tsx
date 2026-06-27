"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { GenericFormCard } from "@/components/ui/generic-form-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { branchService } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { Loader2, CheckCircle2, Key, Building2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function NewBranchPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: "", code: "", address: "", phone: "", principal: "", licenseKey: "" })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const update = (p: Partial<typeof form>) => setForm(prev => ({ ...prev, ...p }))

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await branchService.create({
        name: form.name, code: form.code,
        address: form.address || null, phone: form.phone || null,
        principal: form.principal || null,
        license_key: form.licenseKey,
      })
      setSuccess(true)
      toast({ title: "Branch created successfully" })
      setTimeout(() => router.push("/admin/branches"), 1500)
    } catch (err: any) {
      toast({ title: err?.response?.data?.detail || "Failed to create branch", variant: "destructive" })
    } finally { setLoading(false) }
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-600 mb-4" />
            <h2 className="text-xl font-semibold">Branch Created</h2>
            <p className="text-sm text-muted-foreground mt-2">Redirecting to branches list...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <GenericFormCard title="New Branch" backHref="/admin/branches" onSubmit={handleSubmit} loading={loading} saveLabel="Create Branch">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Branch Name</label>
            <Input placeholder="e.g. Main Campus" value={form.name} onChange={e => update({ name: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Branch Code</label>
            <Input placeholder="e.g. MC-001" value={form.code} onChange={e => update({ code: e.target.value })} required />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Address</label>
          <Input placeholder="Branch address" value={form.address} onChange={e => update({ address: e.target.value })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Phone</label>
            <Input type="tel" placeholder="+251..." value={form.phone} onChange={e => update({ phone: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Principal</label>
            <Input placeholder="Principal name" value={form.principal} onChange={e => update({ principal: e.target.value })} />
          </div>
        </div>
        <div className="border-t pt-4">
          <h3 className="flex items-center gap-2 text-base font-semibold mb-4"><Key className="h-4 w-4" /> Branch License</h3>
          <div className="space-y-2">
            <label className="text-sm font-medium">Branch License Key</label>
            <Input placeholder="ZNV-XXXX-XXXX-XXXX-XXXX" value={form.licenseKey} onChange={e => update({ licenseKey: e.target.value })} required className="font-mono tracking-widest" />
          </div>
        </div>
      </GenericFormCard>
    </div>
  )
}
