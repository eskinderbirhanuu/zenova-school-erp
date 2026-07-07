"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/ui/page-header"
import { nfcV2Service } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { Printer, Plus, Loader2, CheckCircle, XCircle, Clock, Download } from "lucide-react"

export default function CardPrintingPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ card_type: "student", reference_id: "", notes: "" })

  const fetch = (status?: string) => {
    setLoading(true)
    nfcV2Service.listPrintRequests(status || undefined).then(r => setRequests(r.data)).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [])

  useEffect(() => { fetch(filterStatus) }, [filterStatus])

  const doSubmit = async () => {
    if (!form.reference_id) { toast({ title: "Reference ID is required", variant: "destructive" }); return }
    setSubmitting(true)
    try {
      await nfcV2Service.createPrintRequest(form)
      toast({ title: "Print request created" })
      setShowForm(false)
      setForm({ card_type: "student", reference_id: "", notes: "" })
      fetch(filterStatus)
    } catch (err: any) {
      toast({ title: "Failed", description: err.response?.data?.detail, variant: "destructive" })
    }
    setSubmitting(false)
  }

  const downloadPdf = async (cardType: string, referenceId: string) => {
    try {
      const res = await nfcV2Service.downloadCardPdf(cardType, referenceId)
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }))
      const a = document.createElement("a")
      a.href = url
      a.download = `${cardType}_${referenceId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch { toast({ title: "PDF download failed", variant: "destructive" }) }
  }

  const doAction = async (id: string, action: string) => {
    try {
      await nfcV2Service.processPrintRequest(id, action)
      toast({ title: action === "approve" ? "Request approved" : action === "print" ? "Marked as printed" : "Request rejected" })
      fetch(filterStatus)
    } catch { toast({ title: "Action failed", variant: "destructive" }) }
  }

  const statusBadge = (s: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "Pending", variant: "secondary" },
      approved: { label: "Approved", variant: "default" },
      printed: { label: "Printed", variant: "outline" },
      rejected: { label: "Rejected", variant: "destructive" },
    }
    const m = map[s] || { label: s, variant: "default" }
    return <Badge variant={m.variant}>{m.label}</Badge>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Card Printing"
        description="Manage NFC card print requests"
        actions={<Button onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4 mr-2" /> New Print Request</Button>}
      />

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Printer className="h-5 w-5" /> New Print Request</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Card Type</label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.card_type} onChange={e => setForm(f => ({ ...f, card_type: e.target.value }))}>
                  <option value="student">Student</option>
                  <option value="staff">Staff</option>
                  <option value="parent">Parent</option>
                  <option value="employee">Corporate Employee</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Reference ID *</label>
                <Input value={form.reference_id} onChange={e => setForm(f => ({ ...f, reference_id: e.target.value }))} placeholder="Student/Staff/Parent/Employee ID" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Notes</label>
                <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={doSubmit} disabled={submitting}>{submitting ? "Submitting..." : "Submit Request"}</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Print Requests</CardTitle>
            <div className="ml-auto">
              <select className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="printed">Printed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Card Type</th>
                  <th className="pb-3 font-medium">Reference</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Requested</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr><td className="py-8 text-center text-muted-foreground" colSpan={5}>No print requests</td></tr>
                ) : requests.map((r: any) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-3 capitalize">{r.card_type}</td>
                    <td className="py-3 font-mono text-xs">{r.reference_id}</td>
                    <td className="py-3">{statusBadge(r.status)}</td>
                    <td className="py-3 text-muted-foreground text-xs">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="py-3">
                      <div className="flex gap-1">
                        {r.status === "pending" && (
                          <>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => doAction(r.id, "approve")}>Approve</Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => doAction(r.id, "reject")}>Reject</Button>
                          </>
                        )}
                        {r.status === "approved" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => doAction(r.id, "print")}>Mark Printed</Button>
                        )}
                        {r.status === "printed" && (
                          <>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => doAction(r.id, "print")}>Reprint</Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => downloadPdf(r.card_type, r.reference_id)}>
                              <Download className="h-3 w-3 mr-1" /> PDF
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
