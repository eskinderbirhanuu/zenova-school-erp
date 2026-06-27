"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { hrService } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function MarkAttendancePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState([{ employee_id: "", employee_type: "teacher", date: new Date().toISOString().split("T")[0], status: "present", check_in: "08:00", check_out: "", notes: "" }])

  const addRow = () => setRows([...rows, { employee_id: "", employee_type: "teacher", date: new Date().toISOString().split("T")[0], status: "present", check_in: "08:00", check_out: "", notes: "" }])
  const updateRow = (i: number, field: string, value: any) => {
    const updated = [...rows]; (updated[i] as any)[field] = value; setRows(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      for (const row of rows) { await hrService.attendance.mark(row) }
      toast({ title: `${rows.length} attendance records saved` }); router.push("/hr")
    } catch { toast({ title: "Failed", variant: "destructive" }); setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/hr"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-3xl font-bold">Mark Attendance</h1>
        <Button type="button" variant="outline" size="sm" onClick={addRow}>+ Add Row</Button>
      </div>
      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="space-y-3 pt-6">
            {rows.map((row, i) => (
              <div key={i} className="flex items-end gap-2 border-b pb-3">
                <div className="flex-1"><label className="text-xs text-muted-foreground">Employee ID</label>
                  <Input value={row.employee_id} onChange={e => updateRow(i, "employee_id", e.target.value)} required /></div>
                <div className="w-24"><label className="text-xs text-muted-foreground">Type</label>
                  <select value={row.employee_type} onChange={e => updateRow(i, "employee_type", e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="teacher">Teacher</option><option value="staff">Staff</option></select></div>
                <div className="w-28"><label className="text-xs text-muted-foreground">Date</label>
                  <Input type="date" value={row.date} onChange={e => updateRow(i, "date", e.target.value)} required /></div>
                <div className="w-24"><label className="text-xs text-muted-foreground">Status</label>
                  <select value={row.status} onChange={e => updateRow(i, "status", e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option><option value="half-day">Half-day</option></select></div>
                <div className="w-20"><label className="text-xs text-muted-foreground">In</label>
                  <Input type="time" value={row.check_in} onChange={e => updateRow(i, "check_in", e.target.value)} /></div>
                <div className="w-20"><label className="text-xs text-muted-foreground">Out</label>
                  <Input type="time" value={row.check_out} onChange={e => updateRow(i, "check_out", e.target.value)} /></div>
                {rows.length > 1 && <button type="button" onClick={() => setRows(rows.filter((_, idx) => idx !== i))} className="text-red-500 text-xs mb-1">Remove</button>}
              </div>
            ))}
          </CardContent>
        </Card>
        <div className="mt-6 flex justify-end gap-3">
          <Link href="/hr"><Button type="button" variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Attendance"}</Button>
        </div>
      </form>
    </div>
  )
}
