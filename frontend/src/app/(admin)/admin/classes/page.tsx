"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { academicService } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { Layers, Loader2, Plus, Pencil, Trash2, X, ChevronDown, ChevronRight, Check } from "lucide-react"
import { useClasses, useCreateClass, useUpdateClass, useDeleteClass, useCreateSection, useDeleteSection } from "@/hooks/queries"

export default function AdminClassesPage() {
  const { data: classesData, isLoading } = useClasses()
  const createClass = useCreateClass()
  const updateClass = useUpdateClass()
  const deleteClass = useDeleteClass()
  const createSection = useCreateSection()
  const deleteSectionMutation = useDeleteSection()
  const classes = classesData || []
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: "", code: "", description: "" })

  const [expandedClass, setExpandedClass] = useState<string | null>(null)
  const [sections, setSections] = useState<Record<string, any[]>>({})
  const [sectionForms, setSectionForms] = useState<Record<string, { name: string; capacity: string }>>({})
  const [savingSection, setSavingSection] = useState<string | null>(null)

  const resetForm = () => {
    setForm({ name: "", code: "", description: "" })
    setEditingId(null)
    setShowForm(false)
  }

  const handleEdit = (c: any) => {
    setForm({ name: c.name, code: c.code || "", description: c.description || "" })
    setEditingId(c.id)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    try {
      if (editingId) {
        await updateClass.mutateAsync({ id: editingId, data: form })
        toast({ title: "Class updated" })
      } else {
        await createClass.mutateAsync(form)
        toast({ title: "Class created" })
      }
      resetForm()
    } catch (err: any) {
      toast({ title: err?.response?.data?.detail || "Failed to save", variant: "destructive" })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this class and all associated data?")) return
    try {
      await deleteClass.mutateAsync(id)
      toast({ title: "Class deleted" })
    } catch { toast({ title: "Failed to delete", variant: "destructive" }) }
  }

  const toggleExpand = async (classId: string) => {
    if (expandedClass === classId) {
      setExpandedClass(null)
      return
    }
    setExpandedClass(classId)
    if (!sections[classId]) {
      try {
        const res = await academicService.sections.list({ class_id: classId })
        setSections(prev => ({ ...prev, [classId]: res.data || [] }))
      } catch { setSections(prev => ({ ...prev, [classId]: [] })) }
    }
  }

  const addSection = async (classId: string) => {
    const sf = sectionForms[classId]
    if (!sf?.name) { toast({ title: "Enter section name", variant: "destructive" }); return }
    setSavingSection(classId)
    try {
      await createSection.mutateAsync({ name: sf.name, class_id: classId, capacity: parseInt(sf.capacity) || 0 } as any)
      toast({ title: "Section added" })
      setSectionForms(prev => ({ ...prev, [classId]: { name: "", capacity: "30" } }))
      const res = await academicService.sections.list({ class_id: classId })
      setSections(prev => ({ ...prev, [classId]: res.data || [] }))
    } catch (err: any) {
      toast({ title: err?.response?.data?.detail || "Failed to add section", variant: "destructive" })
    } finally { setSavingSection(null) }
  }

  const handleDeleteSection = async (sectionId: string, classId: string) => {
    if (!confirm("Delete this section?")) return
    try {
      await deleteSectionMutation.mutateAsync(sectionId)
      const res = await academicService.sections.list({ class_id: classId })
      setSections(prev => ({ ...prev, [classId]: res.data || [] }))
      toast({ title: "Section deleted" })
    } catch { toast({ title: "Failed to delete", variant: "destructive" }) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Classes & Sections</h1>
          <p className="text-sm text-muted-foreground">Manage grades/classes and their sections</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(!showForm) }}>
          <Plus className="h-4 w-4" /> {showForm ? "Cancel" : "New Class"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-lg">{editingId ? "Edit Class" : "Create Class"}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Class Name</Label>
                  <Input placeholder="e.g. Grade 10" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Code (optional)</Label>
                  <Input placeholder="e.g. G10" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input placeholder="Optional description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={resetForm}><X className="h-4 w-4" /> Cancel</Button>
                <Button type="submit" disabled={createClass.isPending || updateClass.isPending}>
                  {createClass.isPending || updateClass.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {editingId ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : classes.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Layers className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No classes created yet.</p>
              <Button variant="outline" className="mt-4" onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> Create Class</Button>
            </div>
          ) : (
            <div className="divide-y">
              {classes.map((c: any) => (
                <div key={c.id}>
                  <div className="flex items-center gap-3 p-4 hover:bg-muted/30">
                    <button onClick={() => toggleExpand(c.id)} className="p-1 hover:bg-muted rounded">
                      {expandedClass === c.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{c.name}</p>
                      {c.code && <p className="text-xs text-muted-foreground">{c.code}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}><Trash2 className="h-3.5 w-3.5 text-red-400" /></Button>
                    </div>
                  </div>

                  {expandedClass === c.id && (
                    <div className="border-t bg-muted/20 px-4 py-3 pl-12 space-y-2">
                      {(sections[c.id] || []).map((s: any) => (
                        <div key={s.id} className="flex items-center gap-3">
                          <span className="text-sm flex-1">{s.name} {s.capacity ? <span className="text-xs text-muted-foreground">(capacity: {s.capacity})</span> : null}</span>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteSection(s.id, c.id)} className="h-7 w-7">
                            <Trash2 className="h-3 w-3 text-red-400" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 pt-2">
                        <Input
                          placeholder="Section name (e.g. A)"
                          className="h-8 text-sm flex-1"
                          value={sectionForms[c.id]?.name || ""}
                          onChange={e => setSectionForms(prev => ({ ...prev, [c.id]: { ...prev[c.id], name: e.target.value, capacity: prev[c.id]?.capacity || "30" } }))}
                        />
                        <Input
                          type="number"
                          placeholder="Capacity"
                          className="h-8 text-sm w-24"
                          value={sectionForms[c.id]?.capacity || "30"}
                          onChange={e => setSectionForms(prev => ({ ...prev, [c.id]: { ...prev[c.id], name: prev[c.id]?.name || "", capacity: e.target.value } }))}
                        />
                        <Button size="sm" variant="outline" className="h-8" onClick={() => addSection(c.id)} disabled={savingSection === c.id}>
                          {savingSection === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Add
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
