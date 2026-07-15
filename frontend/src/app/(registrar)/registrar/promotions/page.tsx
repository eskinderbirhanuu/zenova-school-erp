"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { studentService } from "@/services/api"
import { useClasses } from "@/hooks/queries"
import api from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { GraduationCap, ArrowRight } from "lucide-react"

export default function PromotionsPage() {
  const { data: classesData } = useClasses()
  const [students, setStudents] = useState<any[]>([])
  const [fromClassId, setFromClassId] = useState("")
  const [toClassId, setToClassId] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [promoting, setPromoting] = useState(false)

  const classes = classesData || []

  const loadStudents = async () => {
    if (!fromClassId) return
    setLoading(true)
    try {
      const res = await studentService.list({ class_id: fromClassId, limit: 200 })
      setStudents(res.data || [])
      setSelectedIds(new Set())
    } catch { toast({ title: "Failed to load students", variant: "destructive" }) }
    setLoading(false)
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelectedIds(next)
  }

  const selectAll = () => {
    if (selectedIds.size === students.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(students.map((s: any) => s.id)))
  }

  const doPromote = async () => {
    if (selectedIds.size === 0 || !toClassId) { toast({ title: "Select students and target class", variant: "destructive" }); return }
    setPromoting(true)
    try {
      const res = await api.post("/promotions/bulk", { student_ids: Array.from(selectedIds), to_class_id: toClassId })
      toast({ title: res.data.message || "Promotion successful" })
      setSelectedIds(new Set())
      loadStudents()
    } catch { toast({ title: "Promotion failed", variant: "destructive" }) }
    setPromoting(false)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Student Promotions</h1>
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">From Class</label>
          <select value={fromClassId} onChange={e => setFromClassId(e.target.value)} className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-60">
            <option value="">Select class</option>
            {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground mb-3" />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">To Class</label>
          <select value={toClassId} onChange={e => setToClassId(e.target.value)} className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-60">
            <option value="">Select target</option>
            {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <Button onClick={loadStudents} disabled={!fromClassId || loading}>{loading ? "Loading..." : "Load Students"}</Button>
      </div>
      {students.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" /> {students.length} Students
                <span className="text-sm font-normal text-muted-foreground">({selectedIds.size} selected)</span>
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  {selectedIds.size === students.length ? "Deselect All" : "Select All"}
                </Button>
                <Button size="sm" onClick={doPromote} disabled={promoting || selectedIds.size === 0 || !toClassId}>
                  {promoting ? "Promoting..." : `Promote (${selectedIds.size})`}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-4 font-medium w-12"></th>
                  <th className="p-4 font-medium">Name</th><th className="p-4 font-medium">ID</th><th className="p-4 font-medium">Current Class</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s: any) => (
                  <tr key={s.id} className={`border-b last:border-0 hover:bg-muted/50 cursor-pointer ${selectedIds.has(s.id) ? "bg-blue-50" : ""}`}
                    onClick={() => toggleSelect(s.id)}>
                    <td className="p-4">
                      <input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleSelect(s.id)}
                        className="h-4 w-4 rounded border-gray-300" />
                    </td>
                    <td className="p-4 font-medium">{s.first_name} {s.last_name}</td>
                    <td className="p-4 text-xs">{s.student_id}</td>
                    <td className="p-4">{s.current_class_name || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : fromClassId && !loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">No students found in this class</CardContent>
        </Card>
      ) : (
        !loading && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">Select a class and click Load Students to begin</CardContent>
          </Card>
        )
      )}
    </div>
  )
}
