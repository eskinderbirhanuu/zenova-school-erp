"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PageHeader } from "@/components/ui/page-header"
import { GitBranch, CheckCircle, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { branchService, schoolService } from "@/services/api"
import { toast } from "@/hooks/use-toast"

export default function NewBranch() {
  const router = useRouter()
  const [schools, setSchools] = useState<{ id: string; name: string; code: string }[]>([])
  const [schoolId, setSchoolId] = useState("")
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")
  const [principal, setPrincipal] = useState("")
  const [licenseKey, setLicenseKey] = useState("")
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    schoolService.list().then(r => setSchools(r.data || [])).catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await branchService.create({
        name, code,
        address: address || undefined,
        phone: phone || undefined,
        principal: principal || undefined,
        license_key: licenseKey,
        school_id: schoolId || undefined,
      })
      setSuccess(true)
    } catch (err: any) {
      toast({ title: "Failed to create branch", description: err.response?.data?.detail || err.message, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="space-y-6">
        <PageHeader title="New Branch" />
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <div className="rounded-full bg-green-100 p-3 mb-4"><CheckCircle className="h-8 w-8 text-green-600" /></div>
            <h2 className="text-xl font-bold mb-2">Branch Created</h2>
            <p className="text-sm text-muted-foreground mb-6">{name} ({code}) has been registered</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.push("/super-admin/branches")}>
                <GitBranch className="h-4 w-4 mr-2" /> View Branches
              </Button>
              <Button onClick={() => { setSuccess(false); setName(""); setCode(""); setLicenseKey("") }}>
                <GitBranch className="h-4 w-4 mr-2" /> Add Another
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Branch"
        description="Register a new branch under a school"
        actions={
          <Link href="/super-admin/branches">
            <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
          </Link>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><GitBranch className="h-4 w-4" /> Branch Details</CardTitle>
          <CardDescription>Fill in the branch information and license key</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="school">School *</Label>
                <Select value={schoolId} onValueChange={setSchoolId} required>
                  <SelectTrigger><SelectValue placeholder="Select school" /></SelectTrigger>
                  <SelectContent>
                    {schools.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Branch Code *</Label>
                <Input id="code" value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="BR-001" className="font-mono" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Branch Name *</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Main Campus" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+251..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="principal">Principal</Label>
                <Input id="principal" value={principal} onChange={e => setPrincipal(e.target.value)} placeholder="Full name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="license">Branch License Key *</Label>
                <Input id="license" value={licenseKey} onChange={e => setLicenseKey(e.target.value.toUpperCase())} placeholder="BRN-XXXX-XXXX" className="font-mono" required />
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={address} onChange={e => setAddress(e.target.value)} placeholder="Street, city, region" />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}
                {submitting ? "Creating..." : "Create Branch"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
