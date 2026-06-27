"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { academicService } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { Calendar, Loader2, Plus, CheckCircle2, XCircle, Star } from "lucide-react"

export default function AdminAcademicYears() {
  const [years, setYears] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: "", start_date: "", end_date: "" })
  const [saving, setSaving] = useState(false)

  const fetchYears = () => {
    setLoading(true)
    academicService.academicYears.list()
      .then((r: any) => setYears(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchYears() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await academicService.academicYears.create(form)
      toast({ title: "Academic year created" })
      setShowForm(false)
      setForm({ name: "", start_date: "", end_date: "" })
      fetchYears()
    } catch (err: any) {
      toast({ title: err?.response?.data?.detail || "Failed to create", variant: "destructive" })
    } finally { setSaving(false) }
  }

  const handleSetCurrent = async (id: string) => {
    try {
      await academicService.academicYears.setCurrent(id)
      toast({ title: "Academic year set as current" })
      fetchYears()
    } catch { toast({ title: "Failed to update", variant: "destructive" }) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Academic Years</h1>
          <p className="text-sm text-muted-foreground">Manage academic years and semesters</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4" /> New Year</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Create Academic Year</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Year Name</label>
                <Input placeholder="e.g. 2025/2026" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <Input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} required />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : "Create"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-lg">{loading ? "Loading..." : `${years.length} academic year${years.length !== 1 ? "s" : ""}`}</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : years.length === 0 ? (
            <div className="flex flex-col items-center py-12">
              <Calendar className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No academic years found. Create one to get started.</p>
              <Button variant="outline" className="mt-4" onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> Create Year</Button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-4 font-medium">Name</th>
                  <th className="p-4 font-medium">Start Date</th>
                  <th className="p-4 font-medium">End Date</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium w-28"></th>
                </tr>
              </thead>
              <tbody>
                {years.map((y: any) => (
                  <tr key={y.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4 font-medium">{y.name}</td>
                    <td className="p-4 text-muted-foreground">{y.start_date ? new Date(y.start_date).toLocaleDateString() : "—"}</td>
                    <td className="p-4 text-muted-foreground">{y.end_date ? new Date(y.end_date).toLocaleDateString() : "—"}</td>
                    <td className="p-4">
                      {y.is_current ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs">
                          <Star className="h-3 w-3 fill-current" /> Current
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-500 px-2 py-0.5 text-xs">
                          <XCircle className="h-3 w-3" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {!y.is_current && (
                        <Button variant="ghost" size="sm" onClick={() => handleSetCurrent(y.id)}>
                          <CheckCircle2 className="h-3 w-3" /> Set Current
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
