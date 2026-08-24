"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Logo } from "@/components/branding"
import { useInstallerStatus } from "@/hooks/queries"
import { getAppMode } from "@/lib/runtime-config"

export default function InstallerSelectPage() {
  const router = useRouter()
  const { data, isLoading } = useInstallerStatus()
  const isOrg = getAppMode() === "org"

  useEffect(() => {
    if (data && (data.setup_complete || data.server_identity_exists)) {
      router.push(isOrg ? "/super-admin/login" : "/login")
      return
    }
    // No choice presented: each server has exactly one identity.
    router.push(isOrg ? "/installer/super-admin" : "/installer/school")
  }, [data, isOrg, router])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#05080F]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#05080F] flex flex-col items-center justify-center p-4">
      <div className="inline-flex mb-6 p-4 rounded-2xl bg-blue-500/10">
        <Logo variant="mark" className="w-12 h-12" />
      </div>
      <h1 className="text-3xl font-bold text-white mb-2">ZENOVA Installation</h1>
      <p className="text-gray-400">
        {isOrg ? "Setting up ZENOVA Control Center..." : "Setting up your school server..."}
      </p>
      <Loader2 className="h-6 w-6 animate-spin text-blue-400 mt-6" />
    </div>
  )
}