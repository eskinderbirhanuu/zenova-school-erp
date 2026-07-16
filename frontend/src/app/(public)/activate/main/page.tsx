"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { setupService } from "@/services/api"
import { CheckCircle2, Loader2, Key, ArrowLeft, Building2, User, Copy } from "lucide-react"

export default function ActivateMainPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preValidatedKey = searchParams.get("key") || ""
  const preSchoolId = searchParams.get("schoolId") || ""

  const [step, setStep] = useState<"license" | "school" | "result">(
    preValidatedKey ? "school" : "license"
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [key, setKey] = useState(preValidatedKey)
  const [schoolName, setSchoolName] = useState("")
  const [schoolCode, setSchoolCode] = useState(preSchoolId)
  const [logoUrl, setLogoUrl] = useState("")
  const [adminName, setAdminName] = useState("")
  const [adminEmail, setAdminEmail] = useState("")
  const [adminPhone, setAdminPhone] = useState("")
  const [adminPassword, setAdminPassword] = useState("")

  const [result, setResult] = useState<{
    school_id?: string; admin_id?: string;
    admin_email?: string; admin_employee_id?: string;
  } | null>(null)
  const [, setCopied] = useState("")

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(""), 2000)
  }

  const handleValidateLicense = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await setupService.validateLicenseType(key)
      const vld = res.data as any
      if (vld.valid && vld.is_main) {
        setStep("school")
      } else {
        setError(vld.message || "Invalid or non-MAIN license key")
      }
    } catch {
      setError("Validation failed. Check the license key.")
    } finally { setLoading(false) }
  }

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await setupService.initializeMain({
        key, school_name: schoolName, school_code: schoolCode,
        logo_url: logoUrl || undefined,
        admin_full_name: adminName, admin_email: adminEmail,
        admin_phone: adminPhone, admin_password: adminPassword,
      } as any)
      const rd = res.data as any
      if (rd.success) {
        setResult(rd)
        setStep("result")
      } else {
        setError(rd.message || "Activation failed")
      }
    } catch {
      setError("Activation failed. Check your inputs.")
    } finally { setLoading(false) }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="mb-8 flex items-center gap-2">
        <div className={`flex items-center gap-2 ${step === "license" ? "opacity-100" : "opacity-50"}`}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium bg-primary text-primary-foreground">1</div>
          <span className="text-sm font-semibold">License</span>
        </div>
        <div className="mx-2 h-px w-8 bg-border" />
        <div className={`flex items-center gap-2 ${step === "school" ? "opacity-100" : step === "result" ? "opacity-100" : "opacity-50"}`}>
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${step === "school" || step === "result" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>2</div>
          <span className={`text-sm ${step === "school" || step === "result" ? "font-semibold" : "text-muted-foreground"}`}>School</span>
        </div>
        <div className="mx-2 h-px w-8 bg-border" />
        <div className={`flex items-center gap-2 ${step === "result" ? "opacity-100" : "opacity-50"}`}>
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${step === "result" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>3</div>
          <span className={`text-sm ${step === "result" ? "font-semibold" : "text-muted-foreground"}`}>Credentials</span>
        </div>
      </div>

      <Card className="w-full max-w-lg">
        <CardContent className="p-6">
          {step === "license" ? (
            <>
              <div className="text-center mb-6">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                  <Key className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">Enter Main License Key</h2>
                <p className="text-sm text-muted-foreground mt-1">Provided by ZENOVA Super Admin</p>
              </div>
              <form onSubmit={handleValidateLicense} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">License Key</label>
                  <Input
                    placeholder="ZNV-XXXX-XXXX-XXXX-XXXX"
                    value={key}
                    onChange={e => setKey(e.target.value.toUpperCase())}
                    required
                    className="text-center font-mono tracking-widest mt-1.5"
                  />
                </div>
                <Button type="submit" className="w-full gap-2" size="lg" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Validate & Continue"}
                </Button>
                {error && <p className="text-sm text-red-500 text-center">{error}</p>}
              </form>
            </>
          ) : step === "school" ? (
            <>
              <div className="text-center mb-6">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                  <Building2 className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">School Information</h2>
                <p className="text-sm text-muted-foreground mt-1">Set up your school and admin account</p>
              </div>
              <form onSubmit={handleActivate} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">School Name</label>
                    <Input value={schoolName} onChange={e => setSchoolName(e.target.value)} required className="mt-1" placeholder="Zenova Academy" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">School Code</label>
                    <Input value={schoolCode} onChange={e => setSchoolCode(e.target.value.toUpperCase())} required className="mt-1 font-mono" placeholder="ZNV001" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">School Logo URL <span className="text-muted-foreground">(optional)</span></label>
                  <Input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} className="mt-1" placeholder="https://school.com/logo.png" />
                </div>
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><User className="h-4 w-4" /> Admin Account</h3>
                  <div className="space-y-3">
                    <Input value={adminName} onChange={e => setAdminName(e.target.value)} required placeholder="Admin Full Name" />
                    <div className="grid grid-cols-2 gap-3">
                      <Input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} required placeholder="Admin Email" />
                      <Input value={adminPhone} onChange={e => setAdminPhone(e.target.value)} placeholder="Admin Phone" />
                    </div>
                    <Input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} required placeholder="Admin Password" minLength={8} />
                  </div>
                </div>
                <Button type="submit" className="w-full gap-2" size="lg" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Activate System"}
                </Button>
                {error && <p className="text-sm text-red-500 text-center">{error}</p>}
              </form>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-green-500/10">
                  <CheckCircle2 className="h-7 w-7 text-green-500" />
                </div>
                <h2 className="text-xl font-semibold">School Activated!</h2>
                <p className="text-sm text-muted-foreground mt-1">Save these credentials. Admin will use Employee ID to login.</p>
              </div>

              <div className="space-y-3">
                {[
                  { label: "School Code", value: schoolCode },
                  { label: "Admin Employee ID", value: result?.admin_employee_id },
                  { label: "Admin Email", value: result?.admin_email },
                ].map(item => item.value ? (
                  <div key={item.label} className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                    <div className="flex items-center justify-between">
                      <code className="text-sm font-mono font-medium">{item.value}</code>
                      <button onClick={() => handleCopy(item.value!, item.label)} className="p-1 hover:bg-muted rounded">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {copied === item.label && <span className="text-xs text-green-500 mt-1">Copied!</span>}
                  </div>
                ) : null)}

                <p className="text-xs text-muted-foreground text-center mt-4">
                  Admin can log in at /login using their Employee ID and chosen password.
                </p>

                <Button className="w-full mt-2" onClick={() => router.push("/login")}>
                  Go to Login
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <button onClick={() => {
        if (step === "result") { router.push("/login") }
        else if (step === "school") { setStep(preValidatedKey ? "school" : "license") }
        else { router.push("/") }
      }} className="mt-4 text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
        <ArrowLeft className="h-3.5 w-3.5" /> {step === "result" ? "Go to Login" : "Back"}
      </button>
    </div>
  )
}
