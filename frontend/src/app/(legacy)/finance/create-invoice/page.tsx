"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { financeService } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import Link from "next/link"

export default function CreateInvoicePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ student_id: "", due_date: "", notes: "" })
  const [lines, setLines] = useState([{ description: "", quantity: 1, unit_price: 0 }])

  const addLine = () => setLines([...lines, { description: "", quantity: 1, unit_price: 0 }])
  const removeLine = (i: number) => lines.length > 1 && setLines(lines.filter((_, idx) => idx !== i))
  const updateLine = (i: number, field: string, value: any) => {
    const updated = [...lines]; (updated[i] as any)[field] = value; setLines(updated)
  }
  const total = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.student_id || lines.length === 0) { toast({ title: "Student and at least 1 line required", variant: "destructive" }); return }
    setLoading(true)
    try {
      await financeService.invoices.create({ ...form, lines })
      toast({ title: "Invoice created" }); router.push("/finance/invoices")
    } catch { toast({ title: "Failed", variant: "destructive" }); setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/finance/invoices"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-3xl font-bold">Create Invoice</h1>
      </div>
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader><CardTitle>Invoice Details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Student ID *</label>
              <Input value={form.student_id} onChange={e => setForm({...form, student_id: e.target.value})} required /></div>
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Due Date</label>
              <Input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} /></div>
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Notes</label>
              <Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
          </CardContent>
        </Card>
        <Card className="mt-6">
          <CardHeader><div className="flex items-center justify-between"><CardTitle>Invoice Lines</CardTitle><Button type="button" variant="outline" size="sm" onClick={addLine}><Plus className="mr-1 h-4 w-4" />Add Line</Button></div></CardHeader>
          <CardContent className="space-y-3">
            {lines.map((line, i) => (
              <div key={i} className="flex items-end gap-2 border-b pb-3">
                <div className="flex-[2]"><label className="text-xs text-muted-foreground">Description</label>
                  <Input value={line.description} onChange={e => updateLine(i, "description", e.target.value)} required /></div>
                <div className="w-20"><label className="text-xs text-muted-foreground">Qty</label>
                  <Input type="number" min="1" value={line.quantity} onChange={e => updateLine(i, "quantity", Number(e.target.value))} /></div>
                <div className="w-28"><label className="text-xs text-muted-foreground">Unit Price</label>
                  <Input type="number" step="0.01" min="0" value={line.unit_price} onChange={e => updateLine(i, "unit_price", Number(e.target.value))} /></div>
                <div className="w-24 pt-5 text-sm font-medium">${(line.quantity * line.unit_price).toFixed(2)}</div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(i)} disabled={lines.length <= 1}><Trash2 className="h-4 w-4 text-red-500" /></Button>
              </div>
            ))}
            <div className="flex justify-end pt-2 text-lg font-bold">Total: ${total.toFixed(2)}</div>
          </CardContent>
        </Card>
        <div className="mt-6 flex justify-end gap-3">
          <Link href="/finance/invoices"><Button type="button" variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Invoice"}</Button>
        </div>
      </form>
    </div>
  )
}
