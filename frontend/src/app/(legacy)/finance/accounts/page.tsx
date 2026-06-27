"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { financeService } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => { setLoading(true); financeService.accounts.list().then((r: any) => setAccounts(r.data)).catch(() => toast({ title: "Failed", variant: "destructive" })).finally(() => setLoading(false)) }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Chart of Accounts</h1>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-4 font-medium">Code</th><th className="p-4 font-medium">Name</th><th className="p-4 font-medium">Type</th><th className="p-4 font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Loading...</td></tr>}
              {!loading && accounts.map((a: any) => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="p-4 font-mono text-xs">{a.account_code}</td>
                  <td className="p-4">{a.name}</td>
                  <td className="p-4"><span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{a.account_type}</span></td>
                  <td className={`p-4 font-mono ${Number(a.balance) >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {Number(a.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              {!loading && accounts.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No accounts</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
