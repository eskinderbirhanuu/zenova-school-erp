"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Key, CheckCircle2, AlertCircle, Loader2, ArrowRight, ShieldCheck } from "lucide-react"
import { Logo } from "@/components/branding"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { useSetup } from "@/services/setup-context"
import { useValidateLicense } from "@/hooks/queries"

export default function ActivateLicensePage() {
  const router = useRouter()
  const { data, update } = useSetup()
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ valid: boolean; license_type?: string; max_branches?: string; valid_until?: string; message: string } | null>(null)
  const [error, setError] = useState("")

  const { data: validationData, isLoading } = useValidateLicense(
    { key: data.mainKey, _t: attempt } as any,
    attempt > 0 && !!data.mainKey
  )

  useEffect(() => {
    if (!attempt || isLoading) return
    if (validationData) {
      const r = validationData as any
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResult(r)
      if (r.valid) {
        setTimeout(() => router.push("/activate/main"), 1200)
      } else {
        setError(r.message || "Validation failed. Check the license key and try again.")
      }
    } else {
      setError("Validation failed. Check the license key and try again.")
    }
  }, [attempt, isLoading, validationData, router])

  const handleValidate = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setResult(null)
    setAttempt(prev => prev + 1)
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#f7f9fc] dark:bg-[#0b1220]">
      {/* Professional subtle background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#e8eef7_0%,transparent_60%),radial-gradient(ellipse_at_bottom,#eef1f8_0%,transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top,#101b31_0%,transparent_60%),radial-gradient(ellipse_at_bottom,#0d1526_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]" />

      <div className="relative z-10 w-full max-w-2xl px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex mb-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary shadow-sm">
              <Logo variant="mark" className="w-9 h-9" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">
            Welcome to ZENOVA
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-1">
            Enterprise School Management Platform
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Activate your institution and begin setup
          </p>
        </div>

        {/* License Validation Card */}
        <Card className="border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#0e1626] shadow-xl shadow-gray-200/50 dark:shadow-black/30">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-primary rounded-t-xl" />
          <CardContent className="p-8">
            {/* Card Header */}
            <div className="text-center mb-8">
              <div className="inline-flex mb-4 p-2.5 rounded-lg bg-primary/10">
                <Key className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white mb-1.5">
                Activate Your System
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enter your Main License Key to begin the setup process
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleValidate} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Main License Key
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="ZNV-XXXX-XXXX-XXXX-XXXX"
                    value={data.mainKey}
                    onChange={e => update({ mainKey: e.target.value })}
                    required
                    className="h-12 rounded-lg bg-white dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-primary/20 text-center font-mono text-base tracking-wider"
                  />
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Format: ZNV-XXXXXXXX-XXXXXXXX-XXXXXXXX
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800 dark:text-red-300">Validation Error</p>
                      <p className="text-sm text-red-700 dark:text-red-400 mt-0.5">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {result?.valid && (
                <div className="p-3.5 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-800 dark:text-green-300">License Validated Successfully!</p>
                      <p className="text-sm text-green-700 dark:text-green-400 mt-0.5">Redirecting to setup...</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-6 bg-primary text-primary-foreground rounded-lg font-semibold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2.5">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying License...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <span>Activate School</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </button>
            </form>

            {/* License Details (on success) */}
            {result?.valid && (
              <div className="mt-5 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 mb-1">License Type</p>
                    <p className="font-semibold text-gray-900 dark:text-white capitalize">{result.license_type || "—"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 mb-1">Max Branches</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{result.max_branches || "Unlimited"}</p>
                  </div>
                  {result.valid_until && (
                    <div className="col-span-2">
                      <p className="text-gray-500 dark:text-gray-400 mb-1">Valid Until</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{new Date(result.valid_until).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Purchase Link - Secondary */}
        <div className="mt-7 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Need a license?
          </p>
          <a
            href="/contact-purchase"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:opacity-80 transition-opacity"
          >
            Purchase one here
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* Footer */}
        <div className="mt-10 text-center text-sm text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          Protected by enterprise-grade security
        </div>
        <p className="mt-1 text-center text-xs text-gray-400 dark:text-gray-500">© {new Date().getFullYear()} ZENOVA. All rights reserved.</p>
      </div>
    </div>
  )
}