"use client"

import { useEffect, useState } from "react"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api/v1"

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: "", domain: "", email: "", phone: "", address: "", notes: "" })

  const token = typeof window !== "undefined" ? localStorage.getItem("cc_token") : ""

  const fetchCustomers = async () => {
    const res = await fetch(`${API}/customers?limit=100`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) setCustomers((await res.json()).items || [])
    setLoading(false)
  }

  useEffect(() => { fetchCustomers() }, [])

  const create = async () => {
    await fetch(`${API}/customers`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    })
    setShowForm(false)
    setForm({ name: "", domain: "", email: "", phone: "", address: "", notes: "" })
    fetchCustomers()
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500">{customers.length} registered schools</p>
        </div>
        <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "Add Customer"}</button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border bg-white p-6">
          <div className="grid grid-cols-2 gap-4">
            <input className="rounded-lg border px-3 py-2 text-sm" placeholder="School Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Domain" value={form.domain} onChange={e => setForm({...form, domain: e.target.value})} />
            <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            <input className="col-span-2 rounded-lg border px-3 py-2 text-sm" placeholder="Address" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
          </div>
          <button className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700" onClick={create}>Save</button>
        </div>
      )}

      <div className="rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead><tr className="text-gray-400 border-b"><th className="p-3 font-medium">Name</th><th className="p-3 font-medium">Domain</th><th className="p-3 font-medium">Email</th><th className="p-3 font-medium">Version</th><th className="p-3 font-medium">Status</th></tr></thead>
          <tbody>
            {customers.map((c: any) => (
              <tr key={c.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3 text-gray-500">{c.domain}</td>
                <td className="p-3 text-gray-500">{c.email}</td>
                <td className="p-3">{c.version}</td>
                <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs ${c.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{c.is_active ? "Active" : "Inactive"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
