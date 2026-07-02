"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { academicService } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { BookOpen, Loader2, Plus, Pencil, Trash2, X, Check } from "lucide-react"

export default function AdminSubjectsPage() {
  const [classes, setClasses] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: "", code: "", class_id: "" })
  const [saving, setSaving] = useState(false)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [clsRes, subRes] = await Promise.all([
        academicService.classes.list(),
        academicService.subjects.list({ limit: 200 }),
      ])
      setClasses(Array.isArray(clsRes.data) ? clsRes.data : [])
      setSubjects(Array.isArray(subRes.data) ? subRes.data : [])
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [])

  const resetForm = () => {
    setForm({ name: "", code: "", class_id: "" })
    setEditingId(null)
    setShowForm(false)
  }

  const handleEdit = (s: any) => {
    setForm({ name: s.name, code: s.code || "", class_id: s.class_id || "" })
    setEditingId(s.id)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingId) {
        await academicService.subjects.update(editingId, form)
        toast({ title: "Subject updated" })
      } else {
        await academicService.subjects.create(form)
        toast({ title: "Subject created" })
      }
      resetForm()
      fetchAll()
    } catch (err: any) {
      toast({ title: err?.response?.data?.detail || "Failed to save", variant: "destructive" })
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this subject?")) return
    try {
      await academicService.subjects.delete(id)
      toast({ title: "Subject deleted" })
      fetchAll()
    } catch { toast({ title: "Failed to delete", variant: "destructive" }) }
  }

  const getClassName = (id: string) => classes.find(c => c.id === id)?.name || "—"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Subjects</h1>
          <p className="text-sm text-muted-foreground">Manage subjects offered per class</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(!showForm) }}>
          <Plus className="h-4 w-4" /> {showForm ? "Cancel" : "New Subject"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-lg">{editingId ? "Edit Subject" : "Create Subject"}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Subject Name</Label>
                  <Input placeholder="e.g. Mathematics" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Code</Label>
                  <Input placeholder="e.g. MATH" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={form.class_id} onValueChange={v => setForm(p => ({ ...p, class_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class..." />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={resetForm}><X className="h-4 w-4" /> Cancel</Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {editingId ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : subjects.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No subjects created yet.</p>
              <Button variant="outline" className="mt-4" onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> Create Subject</Button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-4 font-medium">Name</th>
                  <th className="p-4 font-medium">Code</th>
                  <th className="p-4 font-medium">Class</th>
                  <th className="p-4 font-medium w-24"></th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((s: any) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4 font-medium">{s.name}</td>
                    <td className="p-4 text-muted-foreground font-mono">{s.code || "—"}</td>
                    <td className="p-4 text-muted-foreground">{getClassName(s.class_id)}</td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}><Trash2 className="h-3.5 w-3.5 text-red-400" /></Button>
                      </div>
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
