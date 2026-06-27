"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { financeService } from "@/services/api"
import { DollarSign, TrendingUp, TrendingDown, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function FinancePage() {
  const [tb, setTb] = useState<any>(null)

  useEffect(() => {
    financeService.trialBalance().then((res) => setTb(res.data)).catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Finance</h1>
        <div className="flex gap-2">
          <a href="/finance/accounts"><Button variant="outline" size="sm">Accounts</Button></a>
          <a href="/finance/journal"><Button variant="outline" size="sm">Journal</Button></a>
          <a href="/finance/invoices"><Button variant="outline" size="sm">Invoices</Button></a>
          <a href="/finance/payments"><Button variant="outline" size="sm">Payments</Button></a>
          <a href="/finance/fee-structures"><Button variant="outline" size="sm">Fees</Button></a>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Debit</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${tb?.total_debit?.toLocaleString() || "0.00"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Credit</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${tb?.total_credit?.toLocaleString() || "0.00"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Accounts</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tb?.rows?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Invoices</CardTitle>
            <FileText className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
          </CardContent>
        </Card>
      </div>
      {tb && (
        <Card>
          <CardHeader><CardTitle>Trial Balance</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Account</th>
                  <th className="pb-3 font-medium">Number</th>
                  <th className="pb-3 font-medium text-right">Debit</th>
                  <th className="pb-3 font-medium text-right">Credit</th>
                  <th className="pb-3 font-medium text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {tb.rows.map((row: any) => (
                  <tr key={row.account_id} className="border-b last:border-0">
                    <td className="py-2">{row.account_name}</td>
                    <td className="py-2 text-muted-foreground">{row.account_number}</td>
                    <td className="py-2 text-right">{row.total_debit.toFixed(2)}</td>
                    <td className="py-2 text-right">{row.total_credit.toFixed(2)}</td>
                    <td className={`py-2 text-right font-medium ${row.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {row.balance.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
