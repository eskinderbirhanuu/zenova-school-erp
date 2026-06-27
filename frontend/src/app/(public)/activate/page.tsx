"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Building2, Network, Key, CheckCircle2, AlertCircle, Loader2, ArrowRight } from "lucide-react"
import { Logo } from "@/components/branding"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSetup } from "@/services/setup-context"
import { setupService } from "@/services/api"
import { GradientMeshBackground } from "@/components/3d/gradient-mesh"

export default function ActivateLicensePage() {
  const router = useRouter()
  const { data, update } = useSetup()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ valid: boolean; license_type?: string; max_branches?: string; valid_until?: string; message: string } | null>(null)
  const [error, setError] = useState("")

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setResult(null)
    try {
      const res = await setupService.validateLicense({ key: data.mainKey })
      const r = res.data
      setResult(r)
      if (r.valid) {
        setTimeout(() => router.push("/activate/main"), 1200)
      }
    } catch {
      setError("Validation failed. Check the license key and try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Premium gradient mesh background */}
      <GradientMeshBackground colors={["#2563EB", "#1a1a4a", "#00B4FF", "#6366f1"]} />
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]" />

      {/* Floating orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl animate-float animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-400/15 rounded-full blur-3xl animate-float animation-delay-4000" />
      </div>

      <div className="relative z-10 w-full max-w-2xl px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex mb-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 via-indigo-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/30">
                <Logo variant="mark" className="w-14 h-14" />
              </div>
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-blue-500 via-indigo-500 to-indigo-600 blur-xl opacity-30 animate-pulse" />
            </div>
          </div>
          
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-3"
          >
            Welcome to ZENOVA
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg text-gray-600 dark:text-gray-300 mb-2"
          >
            Enterprise School Management Platform
          </motion.p>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-sm text-gray-500 dark:text-gray-400"
          >
            Activate your institution and begin setup
          </motion.p>
        </motion.div>

        {/* License Validation Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-indigo-600/10 blur-3xl" />
          
          <div className="relative backdrop-blur-xl bg-white/80 dark:bg-gray-800/80 rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl overflow-hidden">
            {/* Top gradient line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
            
            <div className="p-8">
              {/* Card Header */}
              <div className="text-center mb-8">
                <div className="inline-flex mb-4 p-3 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10">
                  <Key className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Activate Your System
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Enter your Main License Key to begin the setup process
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleValidate} className="space-y-6">
                <div className="space-y-2">
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
                      className="h-14 rounded-xl bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500/20 text-center font-mono text-lg tracking-wider"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Format: ZNV-XXXXXXXX-XXXXXXXX-XXXXXXXX
                  </p>
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
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-800 dark:text-red-300">Validation Error</p>
                          <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Success Message */}
                <AnimatePresence>
                  {result?.valid && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
                    >
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-green-800 dark:text-green-300">License Validated Successfully!</p>
                          <p className="text-sm text-green-700 dark:text-green-400 mt-1">Redirecting to setup...</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.01 }}
                  whileTap={{ scale: loading ? 1 : 0.99 }}
                  className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Verifying License...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <span>Activate School</span>
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  )}
                </motion.button>
              </form>

              {/* License Details (on success) */}
              <AnimatePresence>
                {result?.valid && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-6 p-5 rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600"
                  >
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
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Purchase Link - Secondary */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Need a license?
          </p>
          <a
            href="/contact-purchase"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            Purchase one here
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400"
        >
          <p>Protected by enterprise-grade security</p>
          <p className="mt-1">© {new Date().getFullYear()} ZENOVA. All rights reserved.</p>
        </motion.footer>
      </div>
    </div>
  )
}