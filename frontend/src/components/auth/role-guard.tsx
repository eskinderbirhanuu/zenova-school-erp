"use client"

import { useAuth } from "@/services/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { getBestDashboard } from "@/config/roles"

export function RoleGuard({ allowedRoles, children }: { allowedRoles: string[]; children: React.ReactNode }) {
  const { user, loading, hasRole } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push("/login")
      return
    }
    const hasAccess = allowedRoles.some((r) => hasRole(r))
    if (!hasAccess) {
      const best = getBestDashboard(user.roles || [user.role || ""])
      if (best) router.push(best)
      else router.push("/unauthorized")
    }
  }, [user, loading, allowedRoles, router, hasRole])

  if (loading) return <LoadingSkeleton />

  if (!user || !allowedRoles.some((r) => hasRole(r))) return null

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
