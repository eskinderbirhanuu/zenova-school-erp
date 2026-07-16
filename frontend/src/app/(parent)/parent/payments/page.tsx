"use client"

import { useState } from "react"
import { StatusBadge } from "@/components/ui/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DollarSign, Loader2 } from "lucide-react"
import { usePayments, useCreatePayment } from "@/hooks/queries"

export default function ParentPaymentsPage() {
  const { data: payments, isLoading } = usePayments({})
  const createPayment = useCreatePayment()
  const [payingId, setPayingId] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState("")
  const [paySuccess, setPaySuccess] = useState(false)
  const items = payments || []

  const handlePay = async (payment: any) => {
    setPaying(true)
    setPayError("")
    setPaySuccess(false)
    try {
      await createPayment.mutateAsync({
        invoice_id: payment.invoice_id,
        amount: payment.amount,
        payment_method: "online",
        payment_date: new Date().toISOString().split("T")[0],
      })
      setPaySuccess(true)
      setPayingId(payment.id)
    } catch (e: any) {
      setPayError(e?.response?.data?.detail || "Payment failed")
    }
    setPaying(false)
  }

  if (isLoading) {
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
        <p className="text-gray-600">View and pay your children&apos;s school invoices.</p>
      </div>

      {paySuccess && payingId && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          Payment completed successfully!
        </div>
      )}

      {payError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{payError}</div>
      )}

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">No payment records found.</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((p: any) => {
            return (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Payment #{p.id?.slice(0, 8)}</p>
                      <p className="text-sm text-gray-500">
                        Date: {p.payment_date ? new Date(p.payment_date).toLocaleDateString() : "—"} — Status: <StatusBadge status={p.status} />
                      </p>
                      <p className="text-sm text-gray-500">
                        Amount: ${Number(p.amount).toFixed(2)}
                      </p>
                    </div>
                    <StatusBadge status={p.status} />
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
