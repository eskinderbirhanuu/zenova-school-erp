"use client"

import { createContext, useContext, useCallback, useState, type ReactNode } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { authService } from "./api"

export interface User {
  id: string
  email: string
  full_name: string
  role_name: string
  roles: string[]
  permissions: string[]
  school_id: string
  role?: string
  [key: string]: any
}

function normalizeUser(u: any): User {
  const roles = u.roles || (u.role_name ? [u.role_name] : [])
  return {
    ...u,
    role: u.role_name || u.role || (roles.length > 0 ? roles[0] : ""),
    roles,
    permissions: u.permissions || [],
  }
}

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`))
  return match ? decodeURIComponent(match[2]) : undefined
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string, employee_id?: string) => Promise<void>
  passkeyLogin: () => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  activeRole: string
  setActiveRole: (role: string) => void
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (...permissions: string[]) => boolean
  hasRole: (role: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function eraseCookie(name: string) {
  if (typeof document === "undefined") return
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Strict`
}

const AUTH_QUERY_KEY = ["auth", "me"] as const

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [activeRole, setActiveRoleState] = useState<string>("")

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
      eraseCookie("user_roles")
      eraseCookie("csrf_token")
      queryClient.setQueryData(AUTH_QUERY_KEY, null)
      queryClient.clear()
      if (typeof window !== "undefined") {
        window.location.href = "/login"
      }
    }
  }, [queryClient])

  const setActiveRole = useCallback((role: string) => {
    setActiveRoleState(role)
    if (typeof document !== "undefined") {
      document.cookie = `user_role=${role}; path=/; SameSite=Strict`
    }
  }, [])

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user) return false
      return user.permissions?.includes(permission) ?? false
    },
    [user],
  )

  const hasAnyPermission = useCallback(
    (...permissions: string[]): boolean => {
      if (!user) return false
      return permissions.some((p) => user.permissions?.includes(p))
    },
    [user],
  )

  const hasRole = useCallback(
    (role: string): boolean => {
      if (!user) return false
      return user.roles?.includes(role) ?? false
    },
    [user],
  )

  const effectiveRole = activeRole || user?.role || ""

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        loading,
        login,
        passkeyLogin,
        logout,
        isAuthenticated: !!user,
        activeRole: effectiveRole,
        setActiveRole,
        hasPermission,
        hasAnyPermission,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}
