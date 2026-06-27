"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
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

function setCookie(name: string, value: string, days = 7) {
  if (typeof document === "undefined") return
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  const secure = window.location.protocol === "https:" ? "Secure" : ""
  const attrs = [
    `${name}=${encodeURIComponent(value)}`,
    `expires=${expires}`,
    "path=/",
    "SameSite=Strict",
    secure,
  ].filter(Boolean)
  document.cookie = attrs.join("; ")
}

function eraseCookie(name: string) {
  if (typeof document === "undefined") return
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Strict`
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = useCallback(async () => {
    try {
      const res = await authService.me()
      setUser(normalizeUser(res.data))
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUser() }, [fetchUser])

  const login = async (email: string, password: string, employee_id?: string) => {
    await authService.login(email, password, employee_id)
    const meRes = await authService.me()
    const normalized = normalizeUser(meRes.data)
    setUser(normalized)
    const role = getRole(meRes.data)
    setCookie("user_role", role, 7)
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
      if (typeof window !== "undefined") {
        window.location.href = "/login"
      }
    }
  }, [])

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