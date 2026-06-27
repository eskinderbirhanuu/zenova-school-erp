"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { studentService, financeService } from "@/services/api"
import { ArrowLeft, User, Mail, Phone, BookOpen, DollarSign, Calendar } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function StudentDetailPage() {
  const searchParams = useSearchParams()
  const id = searchParams.get("id")
  const [student, setStudent] = useState<any>(null)
  const [invoices, setInvoices] = useState<any[]>([])

  useEffect(() => {
    if (!id) return
    studentService.get(id).then((r) => setStudent(r.data)).catch(() => toast({ title: "Student not found", variant: "destructive" }))
    financeService.invoices.list({ student_id: id }).then((r) => setInvoices(r.data)).catch(() => {})
  }, [id])

  if (!id) return <div className="space-y-6"><h1 className="text-3xl font-bold">Student Detail</h1><p className="text-muted-foreground">Use ?id= parameter</p></div>
  if (!student) return <div className="space-y-6"><h1 className="text-3xl font-bold">Loading...</h1></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/students"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-3xl font-bold">{student.first_name} {student.last_name}</h1>
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">{student.student_id}</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Personal Info</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{student.first_name} {student.last_name}</span></div>
            <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{student.email || "—"}</span></div>
            <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{student.phone || "—"}</span></div>
            <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{student.date_of_birth || "—"}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Academic Info</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-muted-foreground" /><span className="text-sm">Class: {student.current_class_name || "Not assigned"}</span></div>
            <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-muted-foreground" /><span className="text-sm">Section: {student.current_section_name || "—"}</span></div>
            <div className="flex items-center gap-2"><span className="text-sm font-medium">Status: </span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${student.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>{student.status}</span>
            </div>
            <div className="flex items-center gap-2"><span className="text-sm font-medium">Gender: </span><span className="text-sm">{student.gender || "—"}</span></div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> Invoices</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-3 font-medium">#</th><th className="pb-3 font-medium">Amount</th><th className="pb-3 font-medium">Paid</th><th className="pb-3 font-medium">Due</th><th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv: any) => (
                <tr key={inv.id} className="border-b last:border-0">
                  <td className="py-2">{inv.invoice_number}</td>
                  <td className="py-2">${Number(inv.total_amount).toFixed(2)}</td>
                  <td className="py-2">${Number(inv.paid_amount).toFixed(2)}</td>
                  <td className="py-2">{inv.due_date}</td>
                  <td className="py-2"><span className={`rounded-full px-2 py-0.5 text-xs ${
                    inv.status === "paid" ? "bg-green-100 text-green-700" :
                    inv.status === "overdue" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                  }`}>{inv.status}</span></td>
                </tr>
              ))}
              {invoices.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No invoices</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
