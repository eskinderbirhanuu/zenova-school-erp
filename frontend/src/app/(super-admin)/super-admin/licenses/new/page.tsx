"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/ui/page-header"
import { Key, CheckCircle, ArrowLeft, Copy, RefreshCw, Loader2 } from "lucide-react"
import Link from "next/link"
import { schoolService, licenseService } from "@/services/api"
import { toast } from "@/hooks/use-toast"

function generateLicenseKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  const segments = [4, 4, 4, 4]
  return segments.map(len =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
  ).join("-")
}

export default function NewLicense() {
  const [licenseType, setLicenseType] = useState("Main")
  const [schoolId, setSchoolId] = useState("")
  const [schools, setSchools] = useState<any[]>([])
  const [schoolsLoading, setSchoolsLoading] = useState(true)
  const [validUntil, setValidUntil] = useState("")
  const [notes, setNotes] = useState("")
  const [licenseKey, setLicenseKey] = useState(generateLicenseKey())
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    schoolService.list({ limit: 100 }).then(res => {
      setSchools(res.data.schools || [])
    }).catch(() => {
      toast({ title: "Failed to load schools", variant: "destructive" })
    }).finally(() => setSchoolsLoading(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await licenseService.create({
        key: licenseKey,
        license_type: licenseType,
        school_id: schoolId,
        valid_from: new Date().toISOString().split("T")[0],
        valid_until: validUntil,
        notes: notes || undefined,
      })
      setSuccess(true)
    } catch (err: any) {
      toast({ title: "Failed to create license", description: err.response?.data?.detail || err.message, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="space-y-6">
        <PageHeader title="Generate License" />
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <div className="rounded-full bg-green-100 p-3 mb-4"><CheckCircle className="h-8 w-8 text-green-600" /></div>
            <h2 className="text-xl font-bold mb-2">License Generated Successfully</h2>
            <p className="text-muted-foreground mb-2">License key for {schools.find(s => s.id === schoolId)?.name || schoolId}</p>
            <p className="font-mono text-lg font-bold tracking-wider mb-6">{licenseKey}</p>
            <div className="flex gap-3">
              <Link href="/super-admin/licenses"><Button variant="outline"><ArrowLeft className="h-4 w-4" /> Back to Licenses</Button></Link>
              <Button variant="outline" onClick={() => navigator.clipboard.writeText(licenseKey)}><Copy className="h-4 w-4" /> Copy Key</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/super-admin/licenses"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /> Back</Button></Link>
        <h1 className="text-3xl font-bold">Generate License</h1>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" /> License Details</CardTitle>
            <CardDescription>Create a new license key for a school</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>License Type <span className="text-red-500">*</span></Label>
                <div className="flex gap-2">
                  {["Main", "Branch"].map((t) => (
                    <Button key={t} type="button" variant={licenseType === t ? "default" : "outline"} onClick={() => setLicenseType(t)} className="flex-1">{t}</Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="school">School <span className="text-red-500">*</span></Label>
                <select
                  id="school"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value)}
                  required
                >
                  <option value="">{schoolsLoading ? "Loading schools..." : "Select a school..."}</option>
                  {schoolsLoading ? (
                    <option value="" disabled>Loading...</option>
                  ) : schools.length === 0 ? (
                    <option value="" disabled>No schools found</option>
                  ) : schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="validUntil">Valid Until <span className="text-red-500">*</span></Label>
                <Input id="validUntil" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Optional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" /> Generated Key</CardTitle>
            <CardDescription>This key will be created when you submit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-6 text-center">
              <p className="font-mono text-lg font-bold tracking-[0.2em]">{licenseKey}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setLicenseKey(generateLicenseKey())}>
                <RefreshCw className="h-4 w-4 mr-1" /> Regenerate
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => navigator.clipboard.writeText(licenseKey)}>
                <Copy className="h-4 w-4 mr-1" /> Copy
              </Button>
            </div>
            <div className="rounded-lg border p-3 text-sm space-y-1">
              <p className="font-medium">License Summary</p>
              <p className="text-muted-foreground">Type: <span className="font-medium text-foreground">{licenseType}</span></p>
              <p className="text-muted-foreground">School: <span className="font-medium text-foreground">{schools.find(s => s.id === schoolId)?.name || schoolId || "Not selected"}</span></p>
              <p className="text-muted-foreground">Valid Until: <span className="font-medium text-foreground">{validUntil || "Not set"}</span></p>
            </div>
            <Button className="w-full" onClick={handleSubmit} disabled={!schoolId || !validUntil || submitting}>
              {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</> : <><Key className="h-4 w-4 mr-2" /> Generate License</>}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
