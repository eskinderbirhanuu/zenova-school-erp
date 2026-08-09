"use client"

import { useState, useEffect } from "react"
import { QRCodeCanvas } from "qrcode.react"
import { useAuth } from "@/services/auth-context"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Copy, Check, ShieldAlert, Smartphone, KeyRound, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface MfaFlowProps {
  mfaToken: string
  setupRequired: boolean
  onComplete: () => void
  onBack?: () => void
  /** Custom submit label for the code form (e.g. "Sign In") */
  submitLabel?: string
}

/**
 * Handles both MFA paths after a successful password login:
 *  - setupRequired: role demands MFA but it isn't enabled yet — generate a
 *    TOTP secret, render a QR code, verify a 6-digit code, surface backup
 *    codes, then complete the login.
 *  - setupRequired false: MFA already enabled — just verify a 6-digit code.
 */
export function MfaFlow({ mfaToken, setupRequired, onComplete, onBack, submitLabel = "Verify" }: MfaFlowProps) {
  const { mfaBootstrapSetup, mfaBootstrapVerify, mfaLogin } = useAuth()
  const [phase, setPhase] = useState<"load" | "setup" | "verify" | "codes">(
    setupRequired ? "load" : "verify",
  )
  const [secret, setSecret] = useState("")
  const [qrUrl, setQrUrl] = useState("")
  const [code, setCode] = useState("")
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!setupRequired || phase !== "load") return
    let cancelled = false
    setLoading(true)
    mfaBootstrapSetup(mfaToken)
      .then((res) => {
        if (cancelled) return
        setSecret(res.secret)
        setQrUrl(res.qr_code_url)
        setPhase("setup")
      })
      .catch(() => {
        if (!cancelled) setError("Could not start MFA setup. Please try again.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [setupRequired, mfaToken, phase, mfaBootstrapSetup])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length !== 6) return
    setError("")
    setLoading(true)
    try {
      if (setupRequired) {
        const codes = await mfaBootstrapVerify(mfaToken, code)
        setBackupCodes(codes)
        setPhase("codes")
      } else {
        await mfaLogin(mfaToken, code)
        onComplete()
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Invalid verification code. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const finish = async () => {
    setLoading(true)
    setError("")
    try {
      // MFA is now enabled; complete the two-step login.
      await mfaLogin(mfaToken, code)
      onComplete()
    } catch {
      setError("MFA enabled, but sign-in failed. Please log in again.")
    } finally {
      setLoading(false)
    }
  }

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ title: "Could not copy secret", variant: "destructive" })
    }
  }

  if (phase === "load") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Preparing two-factor authentication...</p>
      </div>
    )
  }

  if (phase === "codes") {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
          <div className="text-sm text-green-800 dark:text-green-200">
            <p className="font-semibold">Two-factor authentication is now enabled.</p>
            <p className="mt-1">Save these backup codes somewhere safe. Each code works only once.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {backupCodes.map((c) => (
            <code
              key={c}
              className="rounded-md bg-muted px-2 py-1.5 text-center text-xs font-mono tracking-wider"
            >
              {c}
            </code>
          ))}
        </div>
        <Button className="w-full" onClick={finish} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {setupRequired && phase === "setup" && (
        <>
          <div className="flex items-start gap-3 rounded-lg border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950/30">
            <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
            <div className="text-sm text-indigo-800 dark:text-indigo-200">
              <p className="font-semibold">Set up two-factor authentication</p>
              <p className="mt-1">
                Scan the QR code with your authenticator app, or enter the secret manually.
              </p>
            </div>
          </div>
          <div className="flex justify-center py-2">
            <div className="rounded-xl border bg-white p-3">
              <QRCodeCanvas value={qrUrl || "otpauth://placeholder"} size={176} level="M" />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/50 px-3 py-2">
            <code className="font-mono text-sm tracking-widest">{secret}</code>
            <Button type="button" variant="ghost" size="sm" onClick={copySecret}>
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              <span className="ml-1 text-xs">{copied ? "Copied" : "Copy"}</span>
            </Button>
          </div>
        </>
      )}

      <form onSubmit={handleVerify} className="space-y-3">
        <div>
          <label className="text-sm font-medium text-foreground">
            {setupRequired ? "Enter the 6-digit code" : "Authentication code"}
          </label>
          <Input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            className="mt-1.5 text-center font-mono text-lg tracking-[0.5em]"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            disabled={loading}
            required
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : submitLabel}
        </Button>
        {onBack && (
          <Button type="button" variant="ghost" className="w-full" onClick={onBack} disabled={loading}>
            <KeyRound className="mr-2 h-4 w-4" />
            Back to login
          </Button>
        )}
      </form>
    </div>
  )
}
