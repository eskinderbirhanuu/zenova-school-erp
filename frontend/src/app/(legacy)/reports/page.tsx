"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { financeService, studentService } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { FileText, Download } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

export default function ReportsPage() {
  const [tb, setTb] = useState<any>(null)
  const [students, setStudents] = useState<any[]>([])
  const [tab, setTab] = useState<"financial" | "students">("financial")

  useEffect(() => {
    financeService.trialBalance().then((r: any) => setTb(r.data)).catch(() => {})
    studentService.list({ limit: 200 }).then((r: any) => setStudents(r.data)).catch(() => {})
  }, [])

  const classData = students.reduce((acc: any, s: any) => {
    const cls = s.current_class_name || "Unassigned"
    acc[cls] = (acc[cls] || 0) + 1
    return acc
  }, {})

  const chartData = Object.entries(classData).map(([name, value]) => ({ name, count: value }))

  const exportCSV = (rows: any[], filename: string) => {
    if (rows.length === 0) return
    const keys = Object.keys(rows[0])
    const csv = [keys.join(","), ...rows.map(r => keys.map(k => `"${r[k] || ""}"`).join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Reports</h1>
        <div className="flex gap-2">
          <Button variant={tab === "financial" ? "default" : "outline"} size="sm" onClick={() => setTab("financial")}>Financial</Button>
          <Button variant={tab === "students" ? "default" : "outline"} size="sm" onClick={() => setTab("students")}>Students</Button>
        </div>
      </div>

      {tab === "financial" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => tb?.rows && exportCSV(tb.rows, "trial_balance.csv")}>
              <Download className="mr-2 h-4 w-4" />Export CSV
            </Button>
          </div>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Trial Balance</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Account</th><th className="pb-3 font-medium">Number</th>
                    <th className="pb-3 text-right font-medium">Debit</th><th className="pb-3 text-right font-medium">Credit</th>
                    <th className="pb-3 text-right font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {tb?.rows?.map((row: any) => (
                    <tr key={row.account_id} className="border-b last:border-0">
                      <td className="py-2">{row.account_name}</td><td className="py-2 text-muted-foreground">{row.account_number}</td>
                      <td className="py-2 text-right">{row.total_debit.toFixed(2)}</td><td className="py-2 text-right">{row.total_credit.toFixed(2)}</td>
                      <td className={`py-2 text-right font-medium ${row.balance >= 0 ? "text-green-600" : "text-red-600"}`}>{row.balance.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                {tb && <tfoot><tr className="border-t font-medium"><td colSpan={2} className="pt-3">Total</td>
                  <td className="pt-3 text-right">${tb.total_debit.toFixed(2)}</td><td className="pt-3 text-right">${tb.total_credit.toFixed(2)}</td>
                  <td className="pt-3 text-right">${(tb.total_debit - tb.total_credit).toFixed(2)}</td></tr></tfoot>}
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "students" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => exportCSV(students.map((s: any) => ({ id: s.student_id, name: `${s.first_name} ${s.last_name}`, class: s.current_class_name || "", status: s.status })), "students.csv")}>
              <Download className="mr-2 h-4 w-4" />Export CSV
            </Button>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Students by Class</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Student List</CardTitle></CardHeader>
              <CardContent className="max-h-80 overflow-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left text-muted-foreground"><th className="pb-2 font-medium">ID</th><th className="pb-2 font-medium">Name</th><th className="pb-2 font-medium">Class</th></tr></thead>
                  <tbody>
                    {students.map((s: any) => (
                      <tr key={s.id} className="border-b last:border-0">
                        <td className="py-1.5 text-xs">{s.student_id}</td>
                        <td className="py-1.5">{s.first_name} {s.last_name}</td>
                        <td className="py-1.5">{s.current_class_name || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
