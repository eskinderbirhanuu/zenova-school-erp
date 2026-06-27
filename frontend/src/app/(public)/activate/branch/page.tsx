"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { setupService } from "@/services/api"
import { Loader2, Key, ArrowLeft, Building2, CheckCircle2, Copy, Eye, EyeOff } from "lucide-react"

export default function ActivateBranchPage() {
  const router = useRouter()
  const [step, setStep] = useState<"license" | "result">("license")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [key, setKey] = useState("")
  const [schoolId, setSchoolId] = useState("")

  const [result, setResult] = useState<{
    branch_id?: string; branch_code?: string
    director_employee_id?: string; director_password?: string
  } | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState("")

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(""), 2000)
  }

  const handleActivateBranch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await setupService.initializeBranch({ license_key: key, school_id: schoolId })
      if (res.data.success) {
        setResult(res.data)
        setStep("result")
      } else {
        setError(res.data.message || "Branch activation failed")
      }
    } catch {
      setError("Branch activation failed. Check license key and school ID.")
    } finally { setLoading(false) }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="p-6">
          {step === "license" ? (
            <>
              <div className="text-center mb-6">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                  <Building2 className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">Branch Activation</h2>
                <p className="text-sm text-muted-foreground mt-1">Enter your branch license key to activate</p>
              </div>
              <form onSubmit={handleActivateBranch} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Branch License Key</label>
                  <Input
                    placeholder="ZNV-XXXX-XXXX-XXXX-XXXX"
                    value={key}
                    onChange={e => setKey(e.target.value.toUpperCase())}
                    required
                    className="text-center font-mono tracking-widest mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">School ID</label>
                  <Input
                    placeholder="Enter school ID from admin"
                    value={schoolId}
                    onChange={e => setSchoolId(e.target.value)}
                    required
                    className="mt-1.5"
                  />
                </div>
                <Button type="submit" className="w-full gap-2" size="lg" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Activate Branch"}
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
                <h2 className="text-xl font-semibold">Branch Activated!</h2>
                <p className="text-sm text-muted-foreground mt-1">Share these credentials with the Branch Director</p>
              </div>

              <div className="space-y-3">
                {[
                  { label: "Branch Code", value: result?.branch_code },
                  { label: "Director Employee ID", value: result?.director_employee_id },
                  { label: "Director Password", value: result?.director_password },
                ].map(item => item.value ? (
                  <div key={item.label} className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                    <div className="flex items-center justify-between">
                      <code className="text-sm font-mono font-medium">
                        {item.label === "Director Password" && !showPassword
                          ? "•".repeat(item.value.length)
                          : item.value}
                      </code>
                      <div className="flex gap-1">
                        {item.label === "Director Password" && (
                          <button onClick={() => setShowPassword(!showPassword)} className="p-1 hover:bg-muted rounded">
                            {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        )}
                        <button onClick={() => handleCopy(item.value!, item.label)} className="p-1 hover:bg-muted rounded">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {copied === item.label && <span className="text-xs text-green-500 mt-1">Copied!</span>}
                  </div>
                ) : null)}

                <p className="text-xs text-muted-foreground text-center mt-4">
                  Director can log in at /login using their Employee ID
                </p>

                <Button className="w-full mt-2" onClick={() => router.push("/login")}>
                  Go to Login
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <button onClick={() => router.push("/")} className="mt-4 text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
      </button>
    </div>
  )
}
