"use client"

import { useEffect, useState } from "react"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api/v1"

export default function LicensesPage() {
  const [licenses, setLicenses] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ customer_id: 0, plan: "standard", seats: 500, expires_at: "", notes: "" })
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
    if (res.ok) { setShowForm(false); load() }
  }

  const deactivate = async (id: number) => {
    await fetch(`${API}/licenses/${id}/deactivate`, { method: "POST", headers: { Authorization: `Bearer ${token}` } })
    load()
  }

  const getCustomerName = (id: number) => customers.find((c: any) => c.id === id)?.name || `ID ${id}`

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Licenses</h1>
          <p className="text-sm text-gray-500">{licenses.length} licenses</p>
        </div>
        <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "Generate License"}</button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border bg-white p-6">
          <div className="grid grid-cols-2 gap-4">
            <select className="rounded-lg border px-3 py-2 text-sm" value={form.customer_id} onChange={e => setForm({...form, customer_id: +e.target.value})}>
              <option value={0}>Select Customer</option>
              {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="rounded-lg border px-3 py-2 text-sm" value={form.plan} onChange={e => setForm({...form, plan: e.target.value})}>
              <option value="standard">Standard</option><option value="premium">Premium</option><option value="enterprise">Enterprise</option>
            </select>
            <input className="rounded-lg border px-3 py-2 text-sm" type="number" placeholder="Seats" value={form.seats} onChange={e => setForm({...form, seats: +e.target.value})} />
            <input className="rounded-lg border px-3 py-2 text-sm" type="date" value={form.expires_at} onChange={e => setForm({...form, expires_at: e.target.value})} />
          </div>
          <button className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700" onClick={create}>Generate</button>
        </div>
      )}

      <div className="rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead><tr className="text-gray-400 border-b"><th className="p-3 font-medium">Customer</th><th className="p-3 font-medium">License Key</th><th className="p-3 font-medium">Plan</th><th className="p-3 font-medium">Seats</th><th className="p-3 font-medium">Expires</th><th className="p-3 font-medium">Status</th><th className="p-3 font-medium"></th></tr></thead>
          <tbody>
            {licenses.map((l: any) => (
              <tr key={l.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">{getCustomerName(l.customer_id)}</td>
                <td className="p-3 font-mono text-xs">{l.license_key}</td>
                <td className="p-3 capitalize">{l.plan}</td>
                <td className="p-3">{l.seats}</td>
                <td className="p-3 text-gray-500">{new Date(l.expires_at).toLocaleDateString()}</td>
                <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs ${l.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{l.is_active ? "Active" : "Inactive"}</span></td>
                <td className="p-3">{l.is_active && <button className="text-xs text-red-600 hover:text-red-800" onClick={() => deactivate(l.id)}>Deactivate</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
