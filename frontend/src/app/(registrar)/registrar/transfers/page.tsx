"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { studentService, academicService } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { Search, ArrowRightLeft } from "lucide-react"

export default function TransfersPage() {
  const [students, setStudents] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null)
  const [targetClassId, setTargetClassId] = useState("")
  const [reason, setReason] = useState("")
  const [transferring, setTransferring] = useState(false)

  useEffect(() => {
    academicService.classes.list().then((r: any) => setClasses(r.data)).catch(() => {})
  }, [])

  const searchStudents = async () => {
    if (!search.trim()) return
    try {
      const res = await studentService.list({ search: search.trim(), limit: 20 })
      setStudents(res.data || [])
    } catch { toast({ title: "Search failed", variant: "destructive" }) }
  }

  const doTransfer = async () => {
    if (!selectedStudent || !targetClassId) { toast({ title: "Select a student and target class", variant: "destructive" }); return }
    setTransferring(true)
    try {
      await studentService.transfer(selectedStudent.id, { to_class_id: targetClassId, reason: reason || undefined })
      toast({ title: "Transfer successful", description: `${selectedStudent.first_name} moved to new class` })
      setSelectedStudent(null)
      setTargetClassId("")
      setReason("")
      searchStudents()
    } catch { toast({ title: "Transfer failed", variant: "destructive" }) }
    setTransferring(false)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Student Transfers</h1>
      <Card>
        <CardHeader><CardTitle>Search Student</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input placeholder="Search by name or student ID..." value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchStudents()} className="max-w-sm" />
            <Button onClick={searchStudents}><Search className="mr-2 h-4 w-4" />Search</Button>
          </div>
        </CardContent>
      </Card>
      {students.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Results ({students.length})</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 font-medium">ID</th><th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Current Class</th><th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s: any) => (
                  <tr key={s.id} className={`border-b last:border-0 ${selectedStudent?.id === s.id ? "bg-blue-50" : ""}`}>
                    <td className="py-3">{s.student_id}</td>
                    <td className="py-3">{s.first_name} {s.last_name}</td>
                    <td className="py-3">{s.current_class_name || "—"}</td>
                    <td className="py-3">
                      <Button variant="outline" size="sm" onClick={() => setSelectedStudent(s)}>
                        {selectedStudent?.id === s.id ? "Selected" : "Select"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
      {selectedStudent && (
        <Card className="border-blue-200">
          <CardHeader><CardTitle className="flex items-center gap-2"><ArrowRightLeft className="h-5 w-5" /> Transfer Student</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-sm font-medium">{selectedStudent.first_name} {selectedStudent.last_name}</p>
              <p className="text-xs text-muted-foreground">{selectedStudent.student_id} — {selectedStudent.current_class_name || "No class"}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Target Class</label>
              <select value={targetClassId} onChange={e => setTargetClassId(e.target.value)}
                className="flex h-10 w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Select target class</option>
                {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Reason (optional)</label>
              <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Academic performance" />
            </div>
            <Button onClick={doTransfer} disabled={!targetClassId || transferring}>
              {transferring ? "Transferring..." : "Confirm Transfer"}
            </Button>
          </CardContent>
        </Card>
      )}
      {!students.length && !selectedStudent && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">Search for a student to begin a transfer</CardContent>
        </Card>
      )}
    </div>
  )
}
