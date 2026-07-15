"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, AlertCircle, Loader2, ArrowLeft, Copy } from "lucide-react"
import { setupService } from "@/services/api"

export default function BranchInstallerPage() {
  const router = useRouter()
  const [step, setStep] = useState<"form" | "result">("form")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [schoolId, setSchoolId] = useState("")
  const [branchId, setBranchId] = useState("")
  const [branchLicense, setBranchLicense] = useState("")
  const [vpsUrl, setVpsUrl] = useState("")
  const [adminEmail, setAdminEmail] = useState("")
  const [adminPassword, setAdminPassword] = useState("")

  const [result, setResult] = useState<{ server_id?: string; branch_id?: string; admin_email?: string } | null>(null)
  const [copied, setCopied] = useState("")

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
      const payload: any = {
        fingerprint,
        school_id: schoolId,
        branch_id: branchId,
        branch_license: branchLicense,
        vps_url: vpsUrl,
      }
      if (adminEmail && adminPassword) {
        payload.admin_email = adminEmail
        payload.admin_password = adminPassword
      }
      const res = await setupService.installerInitBranch(payload)
      const rd = res.data as any
      if (rd.success) {
        setResult(rd)
        setStep("result")
      } else {
        setError(rd.message || "Activation failed")
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Activation failed. Check your details.")
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
            <h2 className="text-xl font-bold text-white">Branch Server Activated!</h2>
            <p className="text-sm text-gray-400 mt-1">Branch is ready. Sync will start automatically.</p>
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
                <p className="text-xs text-gray-400">Branch ID</p>
                <p className="text-sm font-mono text-white">{result?.branch_id}</p>
              </div>
              <button onClick={() => handleCopy(result?.branch_id || "", "Branch")} className="p-1 hover:bg-gray-600 rounded">
                <Copy className="h-4 w-4 text-gray-400" />
              </button>
            </div>
            {result?.admin_email && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-gray-700/30">
                <div>
                  <p className="text-xs text-gray-400">Admin Email</p>
                  <p className="text-sm font-mono text-white">{result?.admin_email}</p>
                </div>
                <button onClick={() => handleCopy(result?.admin_email || "", "Email")} className="p-1 hover:bg-gray-600 rounded">
                  <Copy className="h-4 w-4 text-gray-400" />
                </button>
              </div>
            )}
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
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-500/10">
            <svg className="w-7 h-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" /></svg>
          </div>
          <h2 className="text-xl font-bold text-white">Activate Branch Server</h2>
          <p className="text-sm text-gray-400 mt-1">Enter details from your school admin</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-300">School ID</label>
            <input
              type="text"
              value={schoolId}
              onChange={e => setSchoolId(e.target.value.toUpperCase())}
              required
              className="w-full mt-1.5 px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700 text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none font-mono"
              placeholder="SCH-0001"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-300">Branch ID</label>
            <input
              type="text"
              value={branchId}
              onChange={e => setBranchId(e.target.value.toUpperCase())}
              required
              className="w-full mt-1.5 px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700 text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none font-mono"
              placeholder="BR-001"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-300">Branch License</label>
            <input
              type="text"
              value={branchLicense}
              onChange={e => setBranchLicense(e.target.value.toUpperCase())}
              required
              className="w-full mt-1.5 px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700 text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none font-mono tracking-wider"
              placeholder="BLC-XXXX"
            />
          </div>
          <div className="border-t border-gray-700/50 pt-4">
            <p className="text-xs text-gray-500 mb-3">Admin Account <span className="text-gray-600">(optional)</span></p>
            <label className="text-sm font-medium text-gray-300">Admin Email</label>
            <input
              type="email"
              value={adminEmail}
              onChange={e => setAdminEmail(e.target.value)}
              className="w-full mt-1.5 px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700 text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none"
              placeholder="admin@branch.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-300">Password</label>
            <input
              type="password"
              value={adminPassword}
              onChange={e => setAdminPassword(e.target.value)}
              minLength={6}
              className="w-full mt-1.5 px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700 text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none"
              placeholder="Min 6 characters"
            />
          </div>
          <div className="border-t border-gray-700/50 pt-4">
          </div>
          <div>
            <label className="text-sm font-medium text-gray-300">
              VPS URL <span className="text-gray-500">(optional)</span>
            </label>
            <input
              type="url"
              value={vpsUrl}
              onChange={e => setVpsUrl(e.target.value)}
              className="w-full mt-1.5 px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700 text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none"
              placeholder="https://schoola-vps.com"
            />
            <p className="text-xs text-gray-500 mt-1">Main school VPS URL for sync</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl font-semibold transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Activate Branch Server"}
          </button>
        </form>
      </div>
    </div>
  )
}
