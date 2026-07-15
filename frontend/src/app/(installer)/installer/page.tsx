"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Shield, Building2, ArrowRight, Loader2 } from "lucide-react"
import { Logo } from "@/components/branding"
import { useInstallerStatus } from "@/hooks/queries"

export default function InstallerSelectPage() {
  const router = useRouter()
  const { data, isLoading } = useInstallerStatus()

  useEffect(() => {
    if (data && (data.setup_complete || data.server_identity_exists)) {
      router.push("/login")
    }
  }, [data, router])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#05080F]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#05080F] flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="inline-flex mb-6 p-4 rounded-2xl bg-blue-500/10">
          <Logo variant="mark" className="w-12 h-12" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">ZENOVA Installation</h1>
        <p className="text-gray-400">Who is setting up this server?</p>
      </motion.div>

      <div className="grid gap-6 w-full max-w-md">
        <motion.button
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => router.push("/installer/super-admin")}
          className="group relative p-6 rounded-xl border border-gray-700/50 bg-gray-800/40 hover:bg-gray-800/80 hover:border-blue-500/50 transition-all text-left"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-yellow-500/10 shrink-0">
              <Shield className="w-6 h-6 text-yellow-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">IGA Super Admin</h2>
              <p className="text-sm text-gray-400 mt-1">ZENOVA Owner / System Administrator</p>
              <p className="text-xs text-gray-500 mt-2">Requires Super Admin License + Master Setup Key</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-blue-400 transition-colors shrink-0 mt-2" />
          </div>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          onClick={() => router.push("/installer/school")}
          className="group relative p-6 rounded-xl border border-gray-700/50 bg-gray-800/40 hover:bg-gray-800/80 hover:border-blue-500/50 transition-all text-left"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-blue-500/10 shrink-0">
              <Building2 className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">School Server</h2>
              <p className="text-sm text-gray-400 mt-1">Main School VPS or Branch Local Server</p>
              <p className="text-xs text-gray-500 mt-2">Requires School ID + License Key</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-blue-400 transition-colors shrink-0 mt-2" />
          </div>
        </motion.button>
      </div>
    </div>
  )
}
