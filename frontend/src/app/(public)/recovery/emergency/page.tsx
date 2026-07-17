"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { recoveryService } from "@/services/api"
import { Loader2, CheckCircle2, AlertCircle, Terminal } from "lucide-react"

export default function EmergencyRecoveryPage() {
  const router = useRouter()
  const [token, setToken] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

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
    if (!token) {
      setError("Emergency token is required")
      return
    }

    setLoading(true)
    try {
      const res = await recoveryService.emergencyApply({ token, new_password: newPassword, confirm_password: confirmPassword })
      if ((res.data as any).success) {
        setSuccess(true)
        toast({ title: "Emergency password reset successful" })
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Emergency recovery failed. Check the token.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-green-500/10">
              <CheckCircle2 className="h-7 w-7 text-green-500" />
            </div>
            <h2 className="text-xl font-semibold">Emergency Recovery Complete</h2>
            <p className="text-sm text-muted-foreground mt-2 mb-6">
              Your password has been reset. Please log in with your new password.
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
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10">
            <Terminal className="h-6 w-6 text-orange-500" />
          </div>
          <CardTitle className="text-xl">Emergency Recovery</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Enter the emergency token and a new password to regain access.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Emergency Token</label>
              <Input
                placeholder="Paste the emergency token from your server administrator"
                value={token}
                onChange={e => setToken(e.target.value)}
                required
                className="font-mono text-xs"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">New Password</label>
              <Input type="password" placeholder="At least 8 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Confirm Password</label>
              <Input type="password" placeholder="Re-enter new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={8} />
            </div>
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Applying...</> : "Apply Emergency Recovery"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
