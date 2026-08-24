"use client"

import { Suspense } from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Mail, Lock, Eye, EyeOff, User, AlertCircle, Loader2, Building2, Fingerprint, ShieldCheck } from "lucide-react"
import { Logo } from "@/components/branding"
import { useAuth, type LoginResult } from "@/services/auth-context"
import { MfaFlow } from "@/components/auth/mfa-flow"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { getApiUrl } from "@/lib/runtime-config"

const BRANDING_API = getApiUrl()

interface SchoolBranding {
  name: string
  logo_url: string | null
  website: string | null
  is_setup_complete: boolean
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, passkeyLogin } = useAuth()

  const [passkeyLoading, setPasskeyLoading] = useState(false)

  const [school, setSchool] = useState<SchoolBranding | null>(null)
  
  const [mode, setMode] = useState<"email" | "employee">("email")
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [mfa, setMfa] = useState<LoginResult | null>(null)

  useEffect(() => {
    fetch(`${BRANDING_API}/api/v1/setup/school-branding`, { cache: "no-store" })
      .then((r: any) => r.ok ? r.json() : null)
      .then((data: any) => {
        if (data && data.name) setSchool(data)
      })
      .catch(() => {})
  }, [])

  const hasSchool = school && school.name && school.is_setup_complete

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await login(identifier, password, mode === "employee" ? identifier : undefined)
      if (result.mfaRequired) {
        setMfa(result)
        return
      }
      router.push("/")
    } catch (err: any) {
      setError(err.response?.data?.detail || "Invalid credentials. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const completeLogin = () => {
    router.push("/")
    router.refresh()
  }

  const handlePasskeyLogin = async () => {
    setError("")
    setPasskeyLoading(true)
    try {
      await passkeyLogin()
      router.push("/")
    } catch (err: any) {
      if (err.message === "User cancelled") return
      setError(err.response?.data?.detail || err.message || "Passkey authentication failed")
    } finally {
      setPasskeyLoading(false)
    }
  }

  const redirectReason = searchParams.get("reason")

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#f7f9fc] dark:bg-[#0b1220]">
      {/* Professional subtle background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#e8eef7_0%,transparent_60%),radial-gradient(ellipse_at_bottom,#eef1f8_0%,transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top,#101b31_0%,transparent_60%),radial-gradient(ellipse_at_bottom,#0d1526_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]" />

      <div className="relative z-10 w-full max-w-md px-4 py-12">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          {hasSchool ? (
            <>
              <div className="inline-flex mb-5">
                <div className="relative">
                  {school.logo_url ? (
                    <div className="w-16 h-16 rounded-xl bg-white dark:bg-gray-800 p-2 flex items-center justify-center shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={school.logo_url}
                        alt={school.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none"
                          const parent = (e.target as HTMLImageElement).parentElement
                          if (parent) {
                            const fallback = document.createElement("div")
                            fallback.className = "w-full h-full flex items-center justify-center"
                            const span = document.createElement("span")
                            span.className = "text-2xl font-bold text-primary"
                            span.textContent = school.name.charAt(0)
                            fallback.appendChild(span)
                            parent.appendChild(fallback)
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center shadow-sm">
                      <Building2 className="w-8 h-8 text-primary-foreground" />
                    </div>
                  )}
                </div>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-1.5">
                {school.name}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Sign in to your account</p>
            </>
          ) : (
            <>
              <div className="inline-flex mb-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary shadow-sm">
                  <Logo variant="mark" className="w-9 h-9" />
                </div>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-1.5">Welcome Back</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Sign in to your ZENOVA account</p>
            </>
          )}
        </div>

        {/* Redirect notice */}
        {redirectReason && (
          <div className="mb-5 p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="text-sm font-medium">Session expired. Please sign in again.</span>
            </div>
          </div>
        )}

        {/* Login Card */}
        <Card className="border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#0e1626] shadow-xl shadow-gray-200/50 dark:shadow-black/30">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Mode Toggle */}
              <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-gray-100 dark:bg-gray-800/60">
                <button
                  type="button"
                  onClick={() => setMode("email")}
                  className={`py-2 px-4 rounded-md text-sm font-medium transition-all ${
                    mode === "email"
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-600"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setMode("employee")}
                  className={`py-2 px-4 rounded-md text-sm font-medium transition-all ${
                    mode === "employee"
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-600"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  Employee ID
                </button>
              </div>

              {/* Identifier Input */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {mode === "email" ? "Email Address" : "Employee ID"}
                </label>
                <div className="relative">
                  {mode === "email" ? (
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 w-[18px] h-[18px] text-gray-400" />
                  ) : (
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                  )}
                  <Input
                    type={mode === "email" ? "email" : "text"}
                    name="email"
                    placeholder={mode === "email" ? "you@school.com" : "ZNV-XXX-XXXX"}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="pl-10 h-11 rounded-lg bg-white dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-primary/20"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11 rounded-lg bg-white dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-primary/20"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-medium">{error}</span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-lg font-semibold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in...
                  </div>
                ) : (
                  "Sign In"
                )}
              </button>

              {/* Passkey divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200 dark:border-gray-700" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-[#0e1626] px-2 text-gray-400 dark:text-gray-500">or</span>
                </div>
              </div>

              {/* Passkey Login */}
              <button
                type="button"
                onClick={handlePasskeyLogin}
                disabled={passkeyLoading}
                className="w-full py-2.5 px-4 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {passkeyLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Authenticating...
                  </div>
                ) : (
                  <>
                    <Fingerprint className="w-4 h-4" />
                    Sign in with Passkey
                  </>
                )}
              </button>

              {/* Forgot Password */}
              <div className="text-center pt-1">
                <a
                  href="/forgot-password"
                  className="text-sm text-primary hover:opacity-80 font-medium transition-opacity"
                >
                  Forgot your password?
                </a>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* MFA Card */}
        {mfa?.mfaToken && (
          <div className="mt-5">
            <Card className="border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#0e1626] shadow-xl shadow-gray-200/50 dark:shadow-black/30">
              <CardContent className="p-6">
                <MfaFlow
                  mfaToken={mfa.mfaToken}
                  setupRequired={mfa.mfaSetupRequired}
                  onComplete={completeLogin}
                  onBack={() => setMfa(null)}
                  submitLabel="Verify & Sign In"
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          Protected by enterprise-grade security • {new Date().getFullYear()} {hasSchool ? school.name : "ZENOVA"}
        </p>
      </div>
    </div>
  )
}