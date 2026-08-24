"use client"

import { useEffect, useState } from "react"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api/v1"

export default function LicensesPage() {
  const [licenses, setLicenses] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ customer_id: 0, license_type: "main", plan: "standard", seats: 500, expires_at: "", notes: "" })
  const token = typeof window !== "undefined" ? localStorage.getItem("cc_token") : ""

  const load = async () => {
    const [l, c] = await Promise.all([
      fetch(`${API}/licenses`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : []),
      fetch(`${API}/customers?limit=200`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : { items: [] }),
    ])
    setLicenses(l)
    setCustomers(c.items || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const create = async () => {
    const res = await fetch(`${API}/licenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    })
    if (res.ok) { setShowForm(false); setForm({ customer_id: 0, license_type: "main", plan: "standard", seats: 500, expires_at: "", notes: "" }); load() }
  }

  const generateKey = async () => {
    const res = await fetch(`${API}/licenses/generate-key`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    })
    if (res.ok) { setShowForm(false); load() }
  }

  const activate = async (id: number) => {
    await fetch(`${API}/licenses/${id}/activate`, { method: "POST", headers: { Authorization: `Bearer ${token}` } })
    load()
  }

  const suspend = async (id: number) => {
    await fetch(`${API}/licenses/${id}/suspend`, { method: "POST", headers: { Authorization: `Bearer ${token}` } })
    load()
  }

  const revoke = async (id: number) => {
    await fetch(`${API}/licenses/${id}/revoke`, { method: "POST", headers: { Authorization: `Bearer ${token}` } })
    load()
  }

  const update = async (id: number, data: any) => {
    await fetch(`${API}/licenses/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(data) })
    load()
  }

  const getCustomerName = (id: number) => customers.find((c: any) => c.id === id)?.name || `ID ${id}`

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-700"
      case "expired": return "bg-red-100 text-red-700"
      case "suspended": return "bg-yellow-100 text-yellow-700"
      case "revoked": return "bg-red-100 text-red-700"
      case "pending": return "bg-gray-100 text-gray-700"
      default: return "bg-gray-100 text-gray-700"
    }
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Licenses</h1>
          <p className="text-sm text-gray-500">{licenses.length} licenses</p>
        </div>
        <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "Generate License"}</button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border bg-white p-6">
          <h3 className="text-lg font-semibold mb-4">Generate New License</h3>
          <div className="grid grid-cols-2 gap-4">
            <select className="rounded-lg border px-3 py-2 text-sm" value={form.customer_id} onChange={e => setForm({...form, customer_id: +e.target.value})}>
              <option value={0}>Select School</option>
              {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.school_code})</option>)}
            </select>
            <select className="rounded-lg border px-3 py-2 text-sm" value={form.license_type} onChange={e => setForm({...form, license_type: e.target.value})}>
              <option value="main">Main</option>
              <option value="branch">Branch</option>
              <option value="trial">Trial</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="lifetime">Lifetime</option>
            </select>
            <input className="rounded-lg border px-3 py-2 text-sm" type="number" placeholder="Seats" value={form.seats} onChange={e => setForm({...form, seats: +e.target.value})} />
            <input className="rounded-lg border px-3 py-2 text-sm" type="date" value={form.expires_at} onChange={e => setForm({...form, expires_at: e.target.value})} />
            <input className="col-span-2 rounded-lg border px-3 py-2 text-sm" placeholder="Notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
          </div>
          <div className="mt-4 flex gap-2">
            <button className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700" onClick={create}>Create License (Pending)</button>
            <button className="rounded-lg bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700" onClick={generateKey}>Create & Activate</button>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="text-gray-400 border-b"><th className="p-3 font-medium">Customer</th><th className="p-3 font-medium">License Key</th><th className="p-3 font-medium">Type</th><th className="p-3 font-medium">Plan</th><th className="p-3 font-medium">Seats</th><th className="p-3 font-medium">Status</th><th className="p-3 font-medium">Expires</th><th className="p-3 font-medium">Actions</th></tr></thead>
          <tbody>
            {licenses.map((l: any) => (
              <tr key={l.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">{getCustomerName(l.customer_id)}</td>
                <td className="p-3 font-mono text-xs">{l.license_key}</td>
                <td className="p-3 capitalize">{l.license_type}</td>
                <td className="p-3 capitalize">{l.plan}</td>
                <td className="p-3">{l.seats}</td>
                <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs ${getStatusColor(l.status)}`}>{l.status}</span></td>
                <td className="p-3 text-gray-500">{new Date(l.expires_at).toLocaleDateString()}</td>
                <td className="p-3 flex gap-1">
                  {l.status === "pending" && <button className="text-xs text-green-600 hover:text-green-800" onClick={() => activate(l.id)}>Activate</button>}
                  {l.status === "active" && <button className="text-xs text-yellow-600 hover:text-yellow-800" onClick={() => suspend(l.id)}>Suspend</button>}
                  {l.status === "active" && <button className="text-xs text-red-600 hover:text-red-800" onClick={() => revoke(l.id)}>Revoke</button>}
                  {l.status !== "active" && <button className="text-xs text-blue-600 hover:text-blue-800" onClick={() => activate(l.id)}>Activate</button>}
                  <button className="text-xs text-blue-600 hover:text-blue-800" onClick={() => update(l.id, { notes: prompt("Notes:", l.notes) || l.notes })}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}