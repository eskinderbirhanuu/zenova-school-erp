"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { authService } from "./api"
import { ROLE_DASHBOARD } from "@/config/navigation"

interface User {
  id: string
  email: string
  full_name: string
  role_name: string
  school_id: string
  role?: string
}

function getRole(u: any): string {
  return u.role_name || u.role || ""
}

function normalizeUser(u: any): any {
  return { ...u, role: u.role_name || u.role || "" }
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string, employee_id?: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function eraseCookie(name: string) {
  if (typeof document === "undefined") return
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Strict`
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)

  const { isLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      try {
        const res = await authService.me()
        const u = normalizeUser(res.data)
        setUser(u)
        return u as User
      } catch {
        setUser(null)
        return null
      }
    },
    staleTime: 60 * 1000,
    retry: false,
  })

  const loading = isLoading && user === null

  const login = async (email: string, password: string, employee_id?: string) => {
    await authService.login(email, password, employee_id)
    const meRes = await authService.me()
    const normalized = normalizeUser(meRes.data)
    setUser(normalized)
    queryClient.setQueryData(["auth", "me"], normalized)
    const role = getRole(meRes.data)
    const dashboard = ROLE_DASHBOARD[role]
    if (dashboard && typeof window !== "undefined") {
      window.location.href = dashboard
    }
  }

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } catch {
    } finally {
      eraseCookie("user_role")
      eraseCookie("csrf_token")
      setUser(null)
      queryClient.setQueryData(["auth", "me"], null)
      queryClient.clear()
      if (typeof window !== "undefined") {
        window.location.href = "/login"
      }
    }
  }, [queryClient])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}