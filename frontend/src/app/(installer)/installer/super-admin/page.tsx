"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Shield, CheckCircle2, AlertCircle, Loader2, ArrowLeft, Eye, EyeOff, Copy } from "lucide-react"
import { setupService } from "@/services/api"

export default function SuperAdminInstallerPage() {
  const router = useRouter()
  const [step, setStep] = useState<"form" | "result">("form")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [masterKey, setMasterKey] = useState("")
  const [licenseKey, setLicenseKey] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const [result, setResult] = useState<{ server_id?: string; email?: string } | null>(null)
  const [, setCopied] = useState("")

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(""), 2000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const fingerprint = "installer-" + Date.now()
      const res = await setupService.installerInitSuperAdmin({
        fingerprint,
        master_setup_key: masterKey,
        super_admin_license: licenseKey,
        email,
        password,
      } as any)
      const rd = res.data as any
      if (rd.success) {
        setResult(rd)
        setStep("result")
      } else {
        setError(rd.message || "Activation failed")
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Activation failed. Check your credentials.")
    } finally {
      setLoading(false)
    }
  }

  if (step === "result") {
    return (
      <div className="min-h-screen bg-[#05080F] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10">
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Super Admin Activated!</h2>
            <p className="text-sm text-gray-400 mt-1">Save these details</p>
          </div>
          <div className="rounded-xl border border-gray-700/50 bg-gray-800/40 p-4 space-y-3">
            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-700/30">
              <div>
                <p className="text-xs text-gray-400">Server ID</p>
                <p className="text-sm font-mono text-white">{result?.server_id}</p>
              </div>
              <button onClick={() => handleCopy(result?.server_id || "", "Server")} className="p-1 hover:bg-gray-600 rounded">
                <Copy className="h-4 w-4 text-gray-400" />
              </button>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-700/30">
              <div>
                <p className="text-xs text-gray-400">Email</p>
                <p className="text-sm text-white">{result?.email}</p>
              </div>
              <button onClick={() => handleCopy(result?.email || "", "Email")} className="p-1 hover:bg-gray-600 rounded">
                <Copy className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>
          <button onClick={() => router.push("/login")} className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors">
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#05080F] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <button onClick={() => router.push("/installer")} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="text-center mb-6">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-yellow-500/10">
            <Shield className="h-7 w-7 text-yellow-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Super Admin Setup</h2>
          <p className="text-sm text-gray-400 mt-1">IGA / ZENOVA Owner Activation</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-300">Master Setup Key</label>
            <input
              type="password"
              value={masterKey}
              onChange={e => setMasterKey(e.target.value)}
              required
              className="w-full mt-1.5 px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700 text-white placeholder-gray-500 focus:border-yellow-500/50 focus:outline-none font-mono"
              placeholder="ZENOVA-MASTER-2026-XXXXXXXX"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-300">Super Admin License</label>
            <input
              type="text"
              value={licenseKey}
              onChange={e => setLicenseKey(e.target.value.toUpperCase())}
              required
              className="w-full mt-1.5 px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700 text-white placeholder-gray-500 focus:border-yellow-500/50 focus:outline-none font-mono"
              placeholder="SAL-XXXX-XXXX-XXXX"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full mt-1.5 px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700 text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none"
              placeholder="iga@zenova.app"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-300">Password</label>
            <div className="relative mt-1.5">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700 text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none pr-10"
                placeholder="Min 8 characters"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 text-white rounded-xl font-semibold transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Initialize Super Admin"}
          </button>
        </form>
      </div>
    </div>
  )
}
