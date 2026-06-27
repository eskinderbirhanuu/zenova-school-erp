"use client"

import { useAuth } from "@/services/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { ROLE_DASHBOARD } from "@/config/navigation"

export function RoleGuard({ allowedRoles, children }: { allowedRoles: string[]; children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push("/login")
      return
    }
    if (!allowedRoles.includes(user.role as string)) {
      const dashboard = ROLE_DASHBOARD[user.role as string]
      if (dashboard) router.push(dashboard)
      else router.push("/unauthorized")
    }
  }, [user, loading, allowedRoles, router])

  if (loading) return <LoadingSkeleton />

  if (!user || !allowedRoles.includes(user.role as string)) return null

  return <>{children}</>
}

function LoadingSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xl">Z</div>
        <div className="h-2 w-32 animate-pulse rounded bg-muted-foreground/20" />
        <div className="h-2 w-24 animate-pulse rounded bg-muted-foreground/20" />
      </div>
    </div>
  )
}
