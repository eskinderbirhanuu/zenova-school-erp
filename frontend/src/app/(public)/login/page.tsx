"use client"

import { Suspense } from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Mail, Lock, Eye, EyeOff, User, CheckCircle2, AlertCircle, Loader2, Building2, Fingerprint } from "lucide-react"
import { Logo } from "@/components/branding"
import { useAuth } from "@/services/auth-context"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { DynamicGradientMeshBackground } from "@/components/3d/dynamic"

const BRANDING_API = process.env.NEXT_PUBLIC_API_URL
  ? new URL(process.env.NEXT_PUBLIC_API_URL).origin
  : "http://localhost:8000"

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
  const [success, setSuccess] = useState(false)

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
      await login(identifier, password, mode === "employee" ? identifier : undefined)
      setSuccess(true)
      setTimeout(() => {
        router.push("/")
      }, 1000)
    } catch (err: any) {
      setError(err.response?.data?.detail || "Invalid credentials. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handlePasskeyLogin = async () => {
    setError("")
    setPasskeyLoading(true)
    try {
      await passkeyLogin()
      setSuccess(true)
      setTimeout(() => { router.push("/") }, 1000)
    } catch (err: any) {
      if (err.message === "User cancelled") return
      setError(err.response?.data?.detail || err.message || "Passkey authentication failed")
    } finally {
      setPasskeyLoading(false)
    }
  }

  const redirectReason = searchParams.get("reason")

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated gradient mesh background */}
      <DynamicGradientMeshBackground colors={["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b"]} />
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]" />

      {/* Floating orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-float animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-400/20 rounded-full blur-3xl animate-float animation-delay-4000" />
      </div>

      <div className="relative z-10 w-full max-w-md px-4 py-12">
        {/* Logo & Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          {hasSchool ? (
            <>
              <div className="inline-flex mb-4">
                <div className="relative">
                  {school.logo_url ? (
                    <div className="w-20 h-20 rounded-2xl bg-white dark:bg-gray-800 p-2 flex items-center justify-center shadow-2xl ring-1 ring-gray-200 dark:ring-gray-700 overflow-hidden">
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
                            fallback.innerHTML = `<span class="text-3xl font-bold text-indigo-600">${school.name.charAt(0)}</span>`
                            parent.appendChild(fallback)
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-indigo-500/30">
                      <Building2 className="w-10 h-10 text-white" />
                    </div>
                  )}
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {school.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">Sign in to your account</p>
            </>
          ) : (
            <>
              <div className="inline-flex mb-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-indigo-500/30">
                    <Logo variant="mark" className="w-10 h-10" />
                  </div>
                  <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 blur-lg opacity-30" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome Back</h1>
              <p className="text-gray-600 dark:text-gray-400">Sign in to your ZENOVA account</p>
            </>
          )}
        </motion.div>

        {/* Redirect notice */}
        <AnimatePresence>
          {redirectReason && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
            >
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Session expired. Please sign in again.</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="backdrop-blur-xl bg-white/80 dark:bg-gray-800/80 border-gray-200/50 dark:border-gray-700/50 shadow-2xl">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Mode Toggle */}
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-gray-100 dark:bg-gray-700/50">
                  <motion.button
                    type="button"
                    onClick={() => setMode("email")}
                    whileTap={{ scale: 0.98 }}
                    className={`py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                      mode === "email"
                        ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-md"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    Email
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => setMode("employee")}
                    whileTap={{ scale: 0.98 }}
                    className={`py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                      mode === "employee"
                        ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-md"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    Employee ID
                  </motion.button>
                </div>

                {/* Identifier Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {mode === "email" ? "Email Address" : "Employee ID"}
                  </label>
                  <div className="relative">
                    <motion.div
                      className="absolute left-4 top-1/2 -translate-y-1/2"
                      animate={{ scale: mode === "email" ? 1 : 0.8 }}
                    >
                      {mode === "email" ? (
                        <Mail className="w-5 h-5 text-gray-400" />
                      ) : (
                        <User className="w-5 h-5 text-gray-400" />
                      )}
                    </motion.div>
                    <Input
                      type={mode === "email" ? "email" : "text"}
                      placeholder={mode === "email" ? "you@school.com" : "ZNV-XXX-XXXX"}
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="pl-12 h-12 rounded-xl bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-indigo-500/20"
                      required
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-12 pr-12 h-12 rounded-xl bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-indigo-500/20"
                      required
                    />
                    <motion.button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </motion.button>
                  </div>
                </div>

                {/* Error Message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
                    >
                      <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">{error}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Success Message */}
                <AnimatePresence>
                  {success && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
                    >
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm font-medium">Signing in...</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  className="w-full py-3 px-6 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Signing in...
                    </div>
                  ) : (
                    "Sign In"
                  )}
                </motion.button>

                {/* Passkey divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200 dark:border-gray-600" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">or</span>
                  </div>
                </div>

                {/* Passkey Login */}
                <motion.button
                  type="button"
                  onClick={handlePasskeyLogin}
                  disabled={passkeyLoading}
                  whileHover={{ scale: passkeyLoading ? 1 : 1.02 }}
                  whileTap={{ scale: passkeyLoading ? 1 : 0.98 }}
                  className="w-full py-3 px-6 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {passkeyLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Authenticating...
                    </div>
                  ) : (
                    <>
                      <Fingerprint className="w-5 h-5" />
                      Sign in with Passkey
                    </>
                  )}
                </motion.button>

                {/* Forgot Password */}
                <div className="text-center">
                  <a
                    href="/forgot-password"
                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors"
                  >
                    Forgot your password?
                  </a>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8"
        >
          Protected by enterprise-grade security • {new Date().getFullYear()} {hasSchool ? school.name : "ZENOVA"}
        </motion.p>
      </div>
    </div>
  )
}