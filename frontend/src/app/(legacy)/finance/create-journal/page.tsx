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

export default function CreateJournalPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [lines, setLines] = useState([{ account_id: "", description: "", debit: 0, credit: 0 }])
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0])
  const [description, setDescription] = useState("")
  const [reference, setReference] = useState("")

  const addLine = () => setLines([...lines, { account_id: "", description: "", debit: 0, credit: 0 }])
  const removeLine = (i: number) => lines.length > 1 && setLines(lines.filter((_, idx) => idx !== i))

  const updateLine = (i: number, field: string, value: any) => {
    const updated = [...lines]; (updated[i] as any)[field] = value; setLines(updated)
  }

  const totalDebit = lines.reduce((s, l) => s + Number(l.debit), 0)
  const totalCredit = lines.reduce((s, l) => s + Number(l.credit), 0)
  const balanced = Math.abs(totalDebit - totalCredit) < 0.001 && totalDebit > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!balanced) { toast({ title: "Debit must equal Credit", variant: "destructive" }); return }
    setLoading(true)
    try {
      await financeService.journalEntries.create({ entry_date: entryDate, description, reference, lines })
      toast({ title: "Journal entry created" }); router.push("/finance/journal")
    } catch { toast({ title: "Failed", variant: "destructive" }); setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/finance/journal"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-3xl font-bold">Create Journal Entry</h1>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          <Card>
            <CardHeader><CardTitle>Entry Details</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Date</label>
                <Input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} required /></div>
              <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Reference</label>
                <Input placeholder="Optional ref #" value={reference} onChange={e => setReference(e.target.value)} /></div>
              <div className="flex flex-col gap-1.5 md:col-span-3"><label className="text-sm font-medium">Description</label>
                <Input placeholder="Entry description" value={description} onChange={e => setDescription(e.target.value)} required /></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><div className="flex items-center justify-between"><CardTitle>Journal Lines</CardTitle><Button type="button" variant="outline" size="sm" onClick={addLine}><Plus className="mr-1 h-4 w-4" />Add Line</Button></div></CardHeader>
            <CardContent className="space-y-3">
              {lines.map((line, i) => (
                <div key={i} className="flex items-end gap-2 border-b pb-3">
                  <div className="flex-1"><label className="text-xs text-muted-foreground">Account ID</label>
                    <Input value={line.account_id} onChange={e => updateLine(i, "account_id", e.target.value)} required /></div>
                  <div className="flex-1"><label className="text-xs text-muted-foreground">Description</label>
                    <Input value={line.description} onChange={e => updateLine(i, "description", e.target.value)} /></div>
                  <div className="w-28"><label className="text-xs text-muted-foreground">Debit</label>
                    <Input type="number" step="0.01" min="0" value={line.debit} onChange={e => updateLine(i, "debit", Number(e.target.value))} /></div>
                  <div className="w-28"><label className="text-xs text-muted-foreground">Credit</label>
                    <Input type="number" step="0.01" min="0" value={line.credit} onChange={e => updateLine(i, "credit", Number(e.target.value))} /></div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(i)} disabled={lines.length <= 1}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </div>
              ))}
              <div className="flex justify-end gap-6 pt-2 text-sm font-medium">
                <span>Total Debit: <span className="text-green-600">${totalDebit.toFixed(2)}</span></span>
                <span>Total Credit: <span className="text-red-600">${totalCredit.toFixed(2)}</span></span>
                <span className={balanced ? "text-green-600" : "text-red-600"}>{balanced ? "✓ Balanced" : "✗ Unbalanced"}</span>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Link href="/finance/journal"><Button type="button" variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={loading || !balanced}>{loading ? "Creating..." : "Create Entry"}</Button>
        </div>
      </form>
    </div>
  )
}
