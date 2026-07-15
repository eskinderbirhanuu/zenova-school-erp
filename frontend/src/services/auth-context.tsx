"use client"

import { createContext, useContext, useCallback, type ReactNode } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { authService } from "./api"

interface User {
  id: string
  email: string
  full_name: string
  role_name: string
  school_id: string
  role?: string
}

function normalizeUser(u: any): any {
  return { ...u, role: u.role_name || u.role || "" }
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string, employee_id?: string) => Promise<void>
  passkeyLogin: () => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function eraseCookie(name: string) {
  if (typeof document === "undefined") return
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Strict`
}

const AUTH_QUERY_KEY = ["auth", "me"] as const

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  const { data: user, isLoading, isFetching } = useQuery<User | null>({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async () => {
      try {
        const res = await authService.me()
        return normalizeUser(res.data) as User
      } catch {
        return null
      }
    },
    staleTime: 60 * 1000,
    retry: false,
  })

  const loading = (isLoading || isFetching) && user === null

  const login = async (email: string, password: string, employee_id?: string) => {
    await authService.login(email, password, employee_id)
    const meRes = await authService.me()
    const normalized = normalizeUser(meRes.data)
    queryClient.setQueryData(AUTH_QUERY_KEY, normalized)
  }

  const passkeyLogin = async () => {
    const { authenticateWithPasskey } = await import("@/lib/webauthn")
    const result = await authenticateWithPasskey()
    if (!result.access_token) throw new Error("Passkey authentication failed")
    const meRes = await authService.me()
    const normalized = normalizeUser(meRes.data)
    queryClient.setQueryData(AUTH_QUERY_KEY, normalized)
  }

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } catch {
    } finally {
      eraseCookie("user_role")
      eraseCookie("csrf_token")
      queryClient.setQueryData(AUTH_QUERY_KEY, null)
      queryClient.clear()
      if (typeof window !== "undefined") {
        window.location.href = "/login"
      }
    }
  }, [queryClient])

  return (
      <AuthContext.Provider value={{ user: user ?? null, loading, login, passkeyLogin, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}