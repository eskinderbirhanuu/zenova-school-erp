"use client"

import { useEffect, useState } from "react"
import { announcementService } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Trash2, Loader2, Megaphone } from "lucide-react"
import { StatusBadge } from "@/components/ui/status-badge"

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({ title: "", content: "", target_roles: "" })

  const fetchAnnouncements = () => {
    setLoading(true)
    announcementService.list()
      .then((r) => setAnnouncements(r.data || []))
      .catch(() => setAnnouncements([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchAnnouncements() }, [])

  const handleCreate = async () => {
    if (!form.title || !form.content) { setError("Title and content are required"); return }
    setSaving(true)
    setError("")
    try {
      await announcementService.create(form)
      setForm({ title: "", content: "", target_roles: "" })
      setShowForm(false)
      fetchAnnouncements()
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to create announcement")
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this announcement?")) return
    try {
      await announcementService.delete(id)
      setAnnouncements(announcements.filter((a) => a.id !== id))
    } catch {}
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Announcements</h1>
          <p className="text-gray-600">Post and manage school-wide announcements.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" /> New Announcement
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-6 space-y-4">
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input type="text" value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm" rows={4} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Roles (comma-separated, leave empty for all)</label>
              <input type="text" value={form.target_roles}
                onChange={(e) => setForm({ ...form, target_roles: e.target.value })}
                placeholder="TEACHER, PARENT, STUDENT"
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Publish
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
      ) : announcements.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-gray-500">No announcements yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((a: any) => (
            <Card key={a.id}>
              <CardContent className="p-4">
                <div className="flex justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Megaphone className="h-4 w-4 text-indigo-500" />
                      <h3 className="font-semibold">{a.title}</h3>
                      <StatusBadge status={a.is_published ? "active" : "draft"} />
                    </div>
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{a.content}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {a.created_at ? new Date(a.created_at).toLocaleString() : ""}
                      {a.target_roles ? ` — For: ${a.target_roles}` : " — All roles"}
                    </p>
                  </div>
                  <button onClick={() => handleDelete(a.id)} className="text-gray-400 hover:text-red-600 ml-4">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
