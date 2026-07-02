"use client"

import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowRight, Monitor, Server } from "lucide-react"

export default function SchoolTypeSelectPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#05080F] flex flex-col items-center justify-center p-4">
      <button onClick={() => router.push("/installer")} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-8 transition-colors self-start max-w-md mx-auto w-full">
        <ArrowRight className="w-4 h-4 rotate-180" /> Back
      </button>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <h1 className="text-2xl font-bold text-white mb-2">School Server Setup</h1>
        <p className="text-gray-400">What type of school server is this?</p>
      </motion.div>

      <div className="grid gap-6 w-full max-w-md">
        <motion.button
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => router.push("/installer/main")}
          className="group relative p-6 rounded-xl border border-gray-700/50 bg-gray-800/40 hover:bg-gray-800/80 hover:border-green-500/50 transition-all text-left"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-green-500/10 shrink-0">
              <Server className="w-6 h-6 text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-white group-hover:text-green-400 transition-colors">Main School Server</h2>
              <p className="text-sm text-gray-400 mt-1">VPS or Local — the main school system</p>
              <p className="text-xs text-gray-500 mt-2">Requires School ID + Main License</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-green-400 transition-colors shrink-0 mt-2" />
          </div>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          onClick={() => router.push("/installer/branch")}
          className="group relative p-6 rounded-xl border border-gray-700/50 bg-gray-800/40 hover:bg-gray-800/80 hover:border-blue-500/50 transition-all text-left"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-blue-500/10 shrink-0">
              <Monitor className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">Branch Server</h2>
              <p className="text-sm text-gray-400 mt-1">Local server for a branch/campus</p>
              <p className="text-xs text-gray-500 mt-2">Requires School ID + Branch ID + Branch License</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-blue-400 transition-colors shrink-0 mt-2" />
          </div>
        </motion.button>
      </div>
    </div>
  )
}
