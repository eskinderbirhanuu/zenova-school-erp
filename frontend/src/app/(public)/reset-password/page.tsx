"use client"

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { authService } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""
  const requestId = searchParams.get("request_id") || ""

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(
    !token && !requestId ? "No reset token or request ID provided." : ""
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setLoading(true)
    try {
      if (requestId) {
        await authService.resetPassword(token || "recovery", password)
      } else {
        await authService.resetPassword(token, password)
      }
      setSuccess(true)
      toast({ title: "Password reset successfully" })
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Reset failed. The link may have expired.")
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
            <h2 className="text-xl font-semibold">Password Reset Successful</h2>
            <p className="text-sm text-muted-foreground mt-2 mb-6">
              You can now log in with your new password.
            </p>
            <Link href="/login"><Button className="w-full">Go to Login</Button></Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Enter your new password below</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">New Password</label>
              <Input type="password" placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
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
            <Button type="submit" className="w-full gap-2" disabled={loading || (!token && !requestId)}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Resetting...</> : "Reset Password"}
            </Button>
            <p className="text-center text-sm"><Link href="/login" className="text-primary hover:underline">Back to Login</Link></p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
