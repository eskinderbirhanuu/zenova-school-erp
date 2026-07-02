"use client"

import { useEffect, useState } from "react"
import { StatusBadge } from "@/components/ui/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DollarSign, Loader2 } from "lucide-react"
import api from "@/services/api"

export default function ParentPaymentsPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState("")
  const [paySuccess, setPaySuccess] = useState(false)

  useEffect(() => {
    api.get("/parent-portal/invoices")
      .then((res) => setInvoices(Array.isArray(res.data) ? res.data : []))
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false))
  }, [])

  const handlePay = async (invoice: any) => {
    setPaying(true)
    setPayError("")
    setPaySuccess(false)
    try {
      await api.post("/parent-portal/payments", {
        invoice_id: invoice.id,
        amount: invoice.total_amount - invoice.paid_amount,
        payment_method: "online",
        payment_date: new Date().toISOString().split("T")[0],
        idempotency_key: `parent_pay_${invoice.id}_${Date.now()}`,
      })
      setPaySuccess(true)
      setPayingId(invoice.id)
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoice.id ? { ...inv, paid_amount: inv.total_amount, status: "paid" } : inv
        )
      )
    } catch (e: any) {
      setPayError(e?.response?.data?.detail || "Payment failed")
    }
    setPaying(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Invoices & Payments</h1>
        <p className="text-gray-600">View and pay your children's school invoices.</p>
      </div>

      {paySuccess && payingId && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          Payment completed successfully!
        </div>
      )}

      {payError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{payError}</div>
      )}

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">No invoices found for your children.</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv: any) => {
            const due = (inv.total_amount - inv.paid_amount).toFixed(2)
            return (
              <Card key={inv.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{inv.invoice_number}</p>
                      <p className="text-sm text-gray-500">
                        Due: {inv.due_date} — Status: <StatusBadge status={inv.status} />
                      </p>
                      <p className="text-sm text-gray-500">
                        Total: ${Number(inv.total_amount).toFixed(2)} — Paid: ${Number(inv.paid_amount).toFixed(2)}
                      </p>
                      {Number(due) > 0 && inv.status !== "paid" && (
                        <p className="text-sm font-semibold text-red-600">Balance due: ${due}</p>
                      )}
                    </div>
                    {Number(due) > 0 && inv.status !== "paid" && (
                      <Button
                        onClick={() => handlePay(inv)}
                        disabled={paying}
                        size="sm"
                      >
                        {paying ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <DollarSign className="h-4 w-4 mr-1" />}
                        Pay ${due}
                      </Button>
                    )}
                    {inv.status === "paid" && (
                      <StatusBadge status="paid" />
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
