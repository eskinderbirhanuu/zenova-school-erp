"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingUp, TrendingDown, PiggyBank, Loader2 } from "lucide-react"
import { useAccounts, usePayments, useInvoices } from "@/hooks/queries"

export default function DirectorFinance() {
  const { data: accounts, isLoading: accountsLoading } = useAccounts()
  const { data: payments, isLoading: paymentsLoading } = usePayments({ limit: 5 } as any)
  const { data: invoices, isLoading: invoicesLoading } = useInvoices({ limit: 5 } as any)

  const loading = accountsLoading || paymentsLoading || invoicesLoading

  const accountsList = accounts || []
  const paymentsList = payments || []
  const invoicesList = invoices || []

  const revenueAccounts = accountsList.filter((a: any) => a.type === "revenue" || a.normal_side === "credit")
  const expenseAccounts = accountsList.filter((a: any) => a.type === "expense" || a.normal_side === "debit")
  const totalRevenue = revenueAccounts.reduce((s: number, a: any) => s + (a.balance || 0), 0)
  const totalExpenses = expenseAccounts.reduce((s: number, a: any) => s + (a.balance || 0), 0)
  const outstandingInvoices = invoicesList.filter((i: any) => i.status === "pending" || i.status === "draft")

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
              {paymentsList.length === 0 ? (
                <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No payments yet</td></tr>
              ) : paymentsList.map((p: any, i: number) => (
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
