"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { financeService } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function RecordPaymentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ invoice_id: "", amount: 0, payment_method: "cash", reference_number: "", notes: "" })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.invoice_id || form.amount <= 0) { toast({ title: "Invoice & amount required", variant: "destructive" }); return }
    setLoading(true)
    try {
      await financeService.payments.create(form)
      toast({ title: "Payment recorded" }); router.push("/finance/payments")
    } catch { toast({ title: "Failed", variant: "destructive" }); setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/finance/payments"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-3xl font-bold">Record Payment</h1>
      </div>
      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="grid gap-4 md:grid-cols-2 pt-6">
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Invoice ID *</label>
              <Input value={form.invoice_id} onChange={e => setForm({...form, invoice_id: e.target.value})} required /></div>
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Amount *</label>
              <Input type="number" step="0.01" min="0.01" value={form.amount} onChange={e => setForm({...form, amount: Number(e.target.value)})} required /></div>
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Method</label>
              <select value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})} className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option><option value="check">Check</option><option value="mobile_money">Mobile Money</option><option value="card">Card</option>
              </select></div>
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Reference #</label>
              <Input value={form.reference_number} onChange={e => setForm({...form, reference_number: e.target.value})} /></div>
            <div className="flex flex-col gap-1.5 md:col-span-2"><label className="text-sm font-medium">Notes</label>
              <Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
          </CardContent>
        </Card>
        <div className="mt-6 flex justify-end gap-3">
          <Link href="/finance/payments"><Button type="button" variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={loading}>{loading ? "Recording..." : "Record Payment"}</Button>
        </div>
      </form>
    </div>
  )
}
