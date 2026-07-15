"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PageHeader } from "@/components/ui/page-header"
import { useCorporateEmployees, useCreateCorporateEmployee, useCorporateDepartments } from "@/hooks/queries"
import { toast } from "@/hooks/use-toast"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NewEmployeePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    user_id: "", full_name: "", email: "", phone: "",
    department_id: "", position: "", employment_type: "full-time",
    employment_date: "", photo_url: "",
  })
  const { data: departments } = useCorporateDepartments()
  const createMutation = useCreateCorporateEmployee()

  const handleChange = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  const doSave = async () => {
    if (!form.user_id || !form.full_name || !form.email) {
      toast({ title: "User ID, full name, and email are required", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const payload = { ...form } as any
      if (form.employment_date) payload.employment_date = form.employment_date
      else delete payload.employment_date
      if (!form.photo_url) delete payload.photo_url
      await createMutation.mutateAsync(payload)
      toast({ title: "Employee created" })
      router.push("/corporate/employees")
    } catch (err: any) {
      toast({ title: "Failed to create employee", description: err.response?.data?.detail || "Check the form", variant: "destructive" })
    }
    setSaving(false)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="New Employee" description="Add a corporate employee" />
      <Card>
        <CardHeader>
          <CardTitle>Employee Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>User ID *</Label>
              <Input value={form.user_id} onChange={e => handleChange("user_id", e.target.value)} placeholder="Existing user ID" />
            </div>
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input value={form.full_name} onChange={e => handleChange("full_name", e.target.value)} placeholder="John Doe" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={e => handleChange("email", e.target.value)} placeholder="john@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => handleChange("phone", e.target.value)} placeholder="+251..." />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={form.department_id} onValueChange={v => handleChange("department_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {(departments || []).map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Position</Label>
              <Input value={form.position} onChange={e => handleChange("position", e.target.value)} placeholder="Software Engineer" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Employment Type</Label>
              <Select value={form.employment_type} onValueChange={v => handleChange("employment_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full-time">Full Time</SelectItem>
                  <SelectItem value="part-time">Part Time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="intern">Intern</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Employment Date</Label>
              <Input type="date" value={form.employment_date} onChange={e => handleChange("employment_date", e.target.value)} />
            </div>
          </div>
          <div className="flex gap-4 pt-4">
            <Button onClick={doSave} disabled={saving}>{saving ? "Saving..." : "Create Employee"}</Button>
            <Link href="/corporate/employees"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Cancel</Button></Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
