"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { PageHeader } from "@/components/ui/page-header"
import { useStudents, useAcademicYears, useCreateInvoice } from "@/hooks/queries"
import { toast } from "@/hooks/use-toast"
import { ArrowLeft, Loader2, Plus, Trash2, Save } from "lucide-react"

interface LineItem { description: string; amount: string }

export default function NewInvoicePage() {
  const router = useRouter()
  const { data: students, isLoading: studentsLoading } = useStudents({ limit: 500 } as any)
  const { data: years, isLoading: yearsLoading } = useAcademicYears()

  const { mutateAsync: createInvoice, isPending: submitting } = useCreateInvoice()

  const [studentId, setStudentId] = useState("")
  const [yearId, setYearId] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [lines, setLines] = useState<LineItem[]>([{ description: "", amount: "" }])

  const addLine = () => setLines(prev => [...prev, { description: "", amount: "" }])
  const removeLine = (idx: number) => setLines(prev => prev.filter((_, i) => i !== idx))
  const updateLine = (idx: number, field: keyof LineItem, value: string) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l))
  }

  const total = lines.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0)

  const handleSubmit = async () => {
    if (!studentId || !yearId || !dueDate) {
      toast({ title: "Please fill all required fields", variant: "destructive" })
      return
    }
    const validLines = lines.filter((l: any) => l.description && l.amount)
    if (validLines.length === 0) {
      toast({ title: "Add at least one line item", variant: "destructive" })
      return
    }

    try {
      await createInvoice({
        student_id: studentId,
        academic_year_id: yearId,
        due_date: dueDate,
        lines: validLines.map((l: any) => ({ description: l.description, amount: parseFloat(l.amount) })),
      } as any)
      toast({ title: "Invoice created successfully" })
      router.push("/finance/invoices")
    } catch (err: any) {
      toast({ title: err.response?.data?.detail || "Failed to create invoice", variant: "destructive" })
    }
  }

  const studentsList = students || []
  const yearsList = years || []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/finance/invoices")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader title="New Invoice" description="Create a new student invoice" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Student</Label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder={studentsLoading ? "Loading..." : "Select student..."} />
                </SelectTrigger>
                <SelectContent>
                  {studentsList.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name || s.student_id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Academic Year</Label>
              <Select value={yearId} onValueChange={setYearId}>
                <SelectTrigger>
                  <SelectValue placeholder={yearsLoading ? "Loading..." : "Select year..."} />
                </SelectTrigger>
                <SelectContent>
                  {yearsList.map((y: any) => (
                    <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Line Items</CardTitle>
          <Button variant="outline" size="sm" onClick={addLine}>
            <Plus className="mr-1 h-4 w-4" /> Add Line
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {lines.map((line, idx) => (
            <div key={idx} className="flex items-end gap-3">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Description</Label>
                <Input
                  value={line.description}
                  onChange={e => updateLine(idx, "description", e.target.value)}
                  placeholder="Tuition fee, etc."
                />
              </div>
              <div className="w-32 space-y-1">
                <Label className="text-xs">Amount</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.amount}
                  onChange={e => updateLine(idx, "amount", e.target.value)}
                  placeholder="0.00"
                />
              </div>
              {lines.length > 1 && (
                <Button variant="ghost" size="icon" onClick={() => removeLine(idx)} className="mb-0.5">
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              )}
            </div>
          ))}

          <div className="flex justify-end pt-3 border-t">
            <p className="text-lg font-bold">Total: ${total.toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push("/finance/invoices")}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
          Create Invoice
        </Button>
      </div>
    </div>
  )
}
