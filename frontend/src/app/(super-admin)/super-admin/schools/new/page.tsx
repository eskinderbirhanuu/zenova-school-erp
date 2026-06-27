"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/ui/page-header"
import { Building2, CheckCircle, ArrowLeft, Copy, RefreshCw, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { setupService } from "@/services/api"
import { toast } from "@/hooks/use-toast"

function generateLicenseKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  const segments = [4, 4, 4, 4]
  return segments.map(len =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
  ).join("-")
}

export default function NewSchool() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [website, setWebsite] = useState("")
  const [licenseKey, setLicenseKey] = useState(generateLicenseKey())
  const [maxBranches, setMaxBranches] = useState("5")
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await setupService.createSchool({
        name, code, address: address || undefined, phone: phone || undefined,
        email: email || undefined, website: website || undefined,
        max_branches: parseInt(maxBranches) || 5,
        license_key: licenseKey,
      })
      setSuccess(true)
    } catch (err: any) {
      toast({ title: "Failed to create school", description: err.response?.data?.detail || err.message, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="space-y-6">
        <PageHeader title="New School" />
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <div className="rounded-full bg-green-100 p-3 mb-4"><CheckCircle className="h-8 w-8 text-green-600" /></div>
            <h2 className="text-xl font-bold mb-2">School Created Successfully</h2>
            <p className="text-muted-foreground mb-6 text-center max-w-md">{name} has been registered with license key {licenseKey}</p>
            <div className="flex gap-3">
              <Link href="/super-admin/schools"><Button variant="outline"><ArrowLeft className="h-4 w-4" /> Back to Schools</Button></Link>
              <Link href="/super-admin/schools"><Button>View School</Button></Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/super-admin/schools"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /> Back</Button></Link>
        <h1 className="text-3xl font-bold">New School</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> School Details</CardTitle>
          <CardDescription>Register a new school and generate a license key</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">School Name <span className="text-red-500">*</span></Label>
                <Input id="name" placeholder="e.g. Springfield Elementary" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">School Code <span className="text-red-500">*</span></Label>
                <Input id="code" placeholder="e.g. SPR001" value={code} onChange={(e) => setCode(e.target.value)} required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" placeholder="Full address" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="admin@school.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" placeholder="https://school.com" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxBranches">Max Branches</Label>
                <Input id="maxBranches" type="number" min="1" value={maxBranches} onChange={(e) => setMaxBranches(e.target.value)} />
              </div>
            </div>
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">License Key</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setLicenseKey(generateLicenseKey())}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1" /> Regenerate
                </Button>
              </div>
              <div className="flex gap-2">
                <Input value={licenseKey} readOnly className="font-mono text-sm tracking-wider bg-muted" />
                <Button type="button" variant="outline" size="icon" onClick={() => navigator.clipboard.writeText(licenseKey)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">This license will be automatically assigned to the school upon creation.</p>
            </div>
            <div className="flex gap-3 justify-end">
              <Link href="/super-admin/schools"><Button type="button" variant="outline">Cancel</Button></Link>
              <Button type="submit" disabled={!name || !code || submitting}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : <><Building2 className="h-4 w-4" /> Create School &amp; License</>}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
