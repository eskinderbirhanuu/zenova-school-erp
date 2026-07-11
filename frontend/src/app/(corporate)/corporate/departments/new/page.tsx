"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PageHeader } from "@/components/ui/page-header"
import { corporateService } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NewDepartmentPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: "", code: "", description: "" })
  const handleChange = (f: string, v: string) => setForm(prev => ({ ...prev, [f]: v }))

  const doSave = async () => {
    if (!form.name || !form.code) {
      toast({ title: "Name and code are required", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      await corporateService.departments.create(form)
      toast({ title: "Department created" })
      router.push("/corporate/departments")
    } catch (err: any) {
      toast({ title: "Failed", description: err.response?.data?.detail || "Check the form", variant: "destructive" })
    }
    setSaving(false)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="New Department" description="Create a corporate department" />
      <Card>
        <CardHeader><CardTitle>Department Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => handleChange("name", e.target.value)} placeholder="Human Resources" />
            </div>
            <div className="space-y-1.5">
              <Label>Code *</Label>
              <Input value={form.code} onChange={e => handleChange("code", e.target.value)} placeholder="HR" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange("description", e.target.value)} placeholder="Department description..." />
          </div>
          <div className="flex gap-4 pt-4">
            <Button onClick={doSave} disabled={saving}>{saving ? "Saving..." : "Create Department"}</Button>
            <Link href="/corporate/departments"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Cancel</Button></Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
