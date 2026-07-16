"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, AlertCircle, Loader2, ArrowLeft, Copy } from "lucide-react"
import { setupService } from "@/services/api"

export default function MainSchoolInstallerPage() {
  const router = useRouter()
  const [step, setStep] = useState<"form" | "result">("form")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [schoolId, setSchoolId] = useState("")
  const [mainLicense, setMainLicense] = useState("")
  const [adminEmail, setAdminEmail] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [result, setResult] = useState<{ server_id?: string; school_id?: string; admin_email?: string } | null>(null)
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
      if (adminPassword !== confirmPassword) {
        setError("Passwords do not match")
        setLoading(false)
        return
      }
      const fingerprint = "installer-" + Date.now()
      const res = await setupService.installerInitMain({
        fingerprint,
        school_id: schoolId,
        main_license: mainLicense,
        admin_email: adminEmail,
        admin_password: adminPassword,
      } as any)
      const rd = res.data as any
      if (rd.success) {
        setResult(rd)
        setStep("result")
      } else {
        setError(rd.message || "Activation failed")
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Activation failed. Check school ID and license.")
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
            <h2 className="text-xl font-bold text-white">School Server Activated!</h2>
            <p className="text-sm text-gray-400 mt-1">Main school server is ready</p>
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
                <p className="text-xs text-gray-400">School ID</p>
                <p className="text-sm font-mono text-white">{result?.school_id}</p>
              </div>
              <button onClick={() => handleCopy(result?.school_id || "", "School")} className="p-1 hover:bg-gray-600 rounded">
                <Copy className="h-4 w-4 text-gray-400" />
              </button>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-700/30">
              <div>
                <p className="text-xs text-gray-400">Admin Email</p>
                <p className="text-sm font-mono text-white">{result?.admin_email}</p>
              </div>
              <button onClick={() => handleCopy(result?.admin_email || "", "Email")} className="p-1 hover:bg-gray-600 rounded">
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
        <button onClick={() => router.push("/installer/school")} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="text-center mb-6">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-green-500/10">
            <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" /></svg>
          </div>
          <h2 className="text-xl font-bold text-white">Activate Main School Server</h2>
          <p className="text-sm text-gray-400 mt-1">Enter the details provided by IGA</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-300">Admin Email</label>
            <input
              type="email"
              value={adminEmail}
              onChange={e => setAdminEmail(e.target.value)}
              required
              className="w-full mt-1.5 px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700 text-white placeholder-gray-500 focus:border-green-500/50 focus:outline-none"
              placeholder="admin@school.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-300">Password</label>
            <input
              type="password"
              value={adminPassword}
              onChange={e => setAdminPassword(e.target.value)}
              required
              minLength={6}
              className="w-full mt-1.5 px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700 text-white placeholder-gray-500 focus:border-green-500/50 focus:outline-none"
              placeholder="Min 6 characters"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-300">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full mt-1.5 px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700 text-white placeholder-gray-500 focus:border-green-500/50 focus:outline-none"
              placeholder="Repeat password"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-300">School ID</label>
            <input
              type="text"
              value={schoolId}
              onChange={e => setSchoolId(e.target.value.toUpperCase())}
              required
              className="w-full mt-1.5 px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700 text-white placeholder-gray-500 focus:border-green-500/50 focus:outline-none font-mono"
              placeholder="SCH-0001"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-300">Main License Key</label>
            <input
              type="text"
              value={mainLicense}
              onChange={e => setMainLicense(e.target.value.toUpperCase())}
              required
              className="w-full mt-1.5 px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700 text-white placeholder-gray-500 focus:border-green-500/50 focus:outline-none font-mono tracking-wider"
              placeholder="LIC-ABC-123"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white rounded-xl font-semibold transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Activate School Server"}
          </button>
        </form>
      </div>
    </div>
  )
}
