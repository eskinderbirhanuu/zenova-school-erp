"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingUp, TrendingDown, PiggyBank, Loader2 } from "lucide-react"
import { financeService } from "@/services/api"
import { toast } from "@/hooks/use-toast"

export default function DirectorFinance() {
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      financeService.accounts.list().then(r => setAccounts(r.data || [])),
      financeService.payments.list({ limit: 5 }).then(r => setPayments(r.data || [])),
      financeService.invoices.list({ limit: 5 }).then(r => setInvoices(r.data || [])),
    ]).catch(err => toast({ title: "Failed to load finance data", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [])

  const revenueAccounts = accounts.filter((a: any) => a.type === "revenue" || a.normal_side === "credit")
  const expenseAccounts = accounts.filter((a: any) => a.type === "expense" || a.normal_side === "debit")
  const totalRevenue = revenueAccounts.reduce((s: number, a: any) => s + (a.balance || 0), 0)
  const totalExpenses = expenseAccounts.reduce((s: number, a: any) => s + (a.balance || 0), 0)
  const outstandingInvoices = invoices.filter((i: any) => i.status === "pending" || i.status === "draft")

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Finance Overview</h1>
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Finance Overview</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Revenue</CardTitle><TrendingUp className="h-4 w-4 text-green-600" /></CardHeader><CardContent><div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div><p className="text-xs text-muted-foreground mt-1">All accounts</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Expenses</CardTitle><TrendingDown className="h-4 w-4 text-red-600" /></CardHeader><CardContent><div className="text-2xl font-bold">${totalExpenses.toLocaleString()}</div><p className="text-xs text-muted-foreground mt-1">All accounts</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Net Balance</CardTitle><DollarSign className="h-4 w-4 text-blue-600" /></CardHeader><CardContent><div className="text-2xl font-bold">${(totalRevenue - totalExpenses).toLocaleString()}</div><p className="text-xs text-muted-foreground mt-1">Available funds</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Outstanding Fees</CardTitle><PiggyBank className="h-4 w-4 text-orange-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{outstandingInvoices.length}</div><p className="text-xs text-muted-foreground mt-1">Pending invoices</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-lg">Recent Payments</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-4 font-medium">Description</th>
                <th className="p-4 font-medium">Method</th>
                <th className="p-4 font-medium">Amount</th>
                <th className="p-4 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No payments yet</td></tr>
              ) : payments.map((p: any, i: number) => (
                <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="p-4 font-medium">{p.description || p.invoice_id || "Payment"}</td>
                  <td className="p-4 text-muted-foreground">{p.payment_method || "—"}</td>
                  <td className="p-4 text-green-600">${(p.amount || 0).toLocaleString()}</td>
                  <td className="p-4 text-muted-foreground">{p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
