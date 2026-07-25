"use client"

import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { Building2, Key, Wifi, Users, Package } from "lucide-react"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api/v1"

export default function Home() {
  const [stats, setStats] = useState({ total_customers: 0, active_licenses: 0, online_now: 0 })
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [token, setToken] = useState("")

  useEffect(() => {
    const t = localStorage.getItem("cc_token")
    if (t) setToken(t)
  }, [])

  const login = async () => {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) return alert("Login failed")
    const data = await res.json()
    localStorage.setItem("cc_token", data.access_token)
    setToken(data.access_token)
  }

  const apiFetch = async (path: string) => {
    const res = await fetch(`${API}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.status === 401) { setToken(""); localStorage.removeItem("cc_token"); return null }
    return res.json()
  }

  const loadData = async () => {
    setLoading(true)
    const [d, c] = await Promise.all([
      apiFetch("/monitoring/dashboard"),
      apiFetch("/customers?limit=10"),
    ])
    if (d) setStats(d)
    if (c) setCustomers(c.items || [])
    setLoading(false)
  }

  useEffect(() => {
    if (token) loadData()
    else setLoading(false)
  }, [token])

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-96 rounded-xl border bg-white p-8 shadow-sm">
          <h1 className="mb-2 text-2xl font-bold text-zenova-900">ZENOVA</h1>
          <p className="mb-6 text-sm text-gray-500">Control Center</p>
          <input className="mb-3 w-full rounded-lg border px-3 py-2 text-sm" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input className="mb-4 w-full rounded-lg border px-3 py-2 text-sm" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
          <button className="w-full rounded-lg bg-zenova-600 px-4 py-2 text-sm font-medium text-white hover:bg-zenova-700" onClick={login}>Sign In</button>
        </div>
      </div>
    )
  }

  const cards = [
    { label: "Customers", value: stats.total_customers, icon: Building2, color: "text-blue-600" },
    { label: "Active Licenses", value: stats.active_licenses, icon: Key, color: "text-green-600" },
    { label: "Online Now", value: stats.online_now, icon: Wifi, color: "text-emerald-600" },
  ]

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zenova-900">ZENOVA Control Center</h1>
          <p className="text-sm text-gray-500">Customer management & monitoring</p>
        </div>
        <button className="rounded-lg border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          onClick={() => { setToken(""); localStorage.removeItem("cc_token") }}>
          Sign Out
        </button>
      </div>

      <div className="mb-8 grid grid-cols-3 gap-4">
        {cards.map(c => (
          <div key={c.label} className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <c.icon className={`h-5 w-5 ${c.color}`} />
              <span className="text-sm text-gray-500">{c.label}</span>
            </div>
            <p className="text-3xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Recent Customers</h2>
          {loading ? <p className="text-sm text-gray-400">Loading...</p> : (
            <table className="w-full text-left text-sm">
              <thead><tr className="text-gray-400"><th className="pb-2 font-medium">Name</th><th className="pb-2 font-medium">Domain</th><th className="pb-2 font-medium">Version</th></tr></thead>
              <tbody>
                {customers.map((c: any) => (
                  <tr key={c.id} className="border-t"><td className="py-2 font-medium">{c.name}</td><td className="py-2 text-gray-500">{c.domain}</td><td className="py-2">{c.version}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Quick Actions</h2>
          <div className="space-y-3">
            <a href="/customers" className="flex items-center gap-3 rounded-lg border p-3 text-sm hover:bg-gray-50 transition-colors">
              <Building2 className="h-5 w-5 text-blue-500" />
              <span>Manage Customers</span>
            </a>
            <a href="/licenses" className="flex items-center gap-3 rounded-lg border p-3 text-sm hover:bg-gray-50 transition-colors">
              <Key className="h-5 w-5 text-green-500" />
              <span>Generate License</span>
            </a>
            <a href="/updates" className="flex items-center gap-3 rounded-lg border p-3 text-sm hover:bg-gray-50 transition-colors">
              <Package className="h-5 w-5 text-purple-500" />
              <span>Upload Update</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
