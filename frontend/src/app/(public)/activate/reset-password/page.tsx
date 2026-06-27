"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { setupService } from "@/services/api"
import { Loader2, Key, ArrowLeft, CheckCircle2, AlertCircle, Lock, User } from "lucide-react"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const [employeeId, setEmployeeId] = useState("")
  const [licenseKey, setLicenseKey] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setLoading(true)
    try {
      const res = await setupService.resetPassword({
        employee_id: employeeId,
        license_key: licenseKey,
        new_password: newPassword,
      })
      if (res.data.success) {
        setSuccess(true)
      } else {
        setError(res.data.message || "Password reset failed")
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Password reset failed. Check your Employee ID and License Key.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-green-500/10">
              <CheckCircle2 className="h-7 w-7 text-green-500" />
            </div>
            <h2 className="text-xl font-semibold">Password Reset Successful!</h2>
            <p className="text-sm text-muted-foreground mt-2 mb-6">
              Login with your Employee ID and new password.
            </p>
            <Button className="w-full" onClick={() => router.push("/login")}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
              <Lock className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Reset Password</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Enter your Employee ID and License Key to set a new password
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Employee ID</label>
              <Input
                placeholder="e.g. ADM001"
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value.toUpperCase())}
                required
                className="mt-1.5 font-mono"
              />
            </div>

            <div>
              <label className="text-sm font-medium">License Key</label>
              <Input
                placeholder="ZNV-XXXX-XXXX-XXXX-XXXX"
                value={licenseKey}
                onChange={e => setLicenseKey(e.target.value.toUpperCase())}
                required
                className="mt-1.5 font-mono text-center tracking-widest"
              />
            </div>

            <div className="border-t pt-4">
              <label className="text-sm font-medium">New Password</label>
              <Input
                type="password"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Confirm Password</label>
              <Input
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="mt-1.5"
              />
            </div>

            <Button type="submit" className="w-full gap-2" size="lg" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Resetting...</> : "Reset Password"}
            </Button>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      <button onClick={() => router.push("/")} className="mt-4 text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
      </button>
    </div>
  )
}
