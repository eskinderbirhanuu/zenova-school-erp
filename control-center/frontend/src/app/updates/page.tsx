"use client"

import { useEffect, useState } from "react"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api/v1"

export default function UpdatesPage() {
  const [updates, setUpdates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const token = typeof window !== "undefined" ? localStorage.getItem("cc_token") : ""

  const load = async () => {
    const res = await fetch(`${API}/updates`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) setUpdates(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const upload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setUploading(true)
    const fd = new FormData(e.currentTarget)
    const res = await fetch(`${API}/updates`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd })
    if (res.ok) { e.currentTarget.reset(); load() }
    setUploading(false)
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Updates</h1>
        <p className="text-sm text-gray-500">Upload and manage ERP versions</p>
      </div>

      <div className="mb-6 rounded-xl border bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold">Upload New Version</h2>
        <form onSubmit={upload} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <input name="version" className="rounded-lg border px-3 py-2 text-sm" placeholder="Version (e.g., 1.1.0)" required />
            <input name="min_version" className="rounded-lg border px-3 py-2 text-sm" placeholder="Min version (e.g., 1.0.0)" defaultValue="0.0.0" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_mandatory" value="true" /> Mandatory update</label>
          </div>
          <textarea name="changelog" className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Changelog" rows={3} />
          <input type="file" name="file" className="text-sm" required accept=".tar.gz" />
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={uploading}>{uploading ? "Uploading..." : "Upload"}</button>
        </form>
      </div>

      <div className="rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead><tr className="text-gray-400 border-b"><th className="p-3 font-medium">Version</th><th className="p-3 font-medium">Size</th><th className="p-3 font-medium">Mandatory</th><th className="p-3 font-medium">Date</th></tr></thead>
          <tbody>
            {updates.map((u: any) => (
              <tr key={u.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">v{u.version}</td>
                <td className="p-3 text-gray-500">{(u.file_size / 1024 / 1024).toFixed(1)} MB</td>
                <td className="p-3">{u.is_mandatory ? <span className="text-red-600">Yes</span> : <span className="text-gray-400">No</span>}</td>
                <td className="p-3 text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
