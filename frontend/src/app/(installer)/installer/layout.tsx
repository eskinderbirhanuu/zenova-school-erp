"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { setupService } from "@/services/api"
import { Loader2 } from "lucide-react"

export default function InstallerStepLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const check = async () => {
      try {
        const res = await setupService.installerStatus()
        if (res.data.setup_complete) {
          router.push("/login")
          return
        }
        if (res.data.server_identity_exists) {
          router.push("/login")
          return
        }
        setReady(true)
      } catch {
        setReady(true)
      }
    }
    check()
  }, [router])

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return <>{children}</>
}
