"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { hrService } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { DollarSign } from "lucide-react"

export default function HrPayrollPage() {
  const [contracts, setContracts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    hrService.contracts.list({ limit: 100 })
      .then((r: any) => setContracts(r.data))
      .catch(() => toast({ title: "Failed to load payroll data", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [])

  const activeContracts = contracts.filter((c: any) => c.status === "active")
  const totalSalary = activeContracts.reduce((s: number, c: any) => s + Number(c.salary || c.monthly_salary || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Payroll</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Active Employees</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{loading ? "\u2014" : activeContracts.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Monthly Payroll</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{loading ? "\u2014" : `$${totalSalary.toLocaleString()}`}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Average Salary</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading || activeContracts.length === 0 ? "\u2014" : `$${(totalSalary / activeContracts.length).toLocaleString()}`}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Contracts</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{loading ? "\u2014" : contracts.length}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Payroll Summary</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-4 font-medium">Employee</th><th className="p-4 font-medium">Position</th><th className="p-4 font-medium">Salary</th><th className="p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Loading...</td></tr>}
              {!loading && activeContracts.map((c: any) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="p-4 font-medium">{c.employee_name || c.employee_id || "\u2014"}</td>
                  <td className="p-4">{c.position || c.job_title || "\u2014"}</td>
                  <td className="p-4 font-mono">${Number(c.salary || c.monthly_salary || 0).toLocaleString()}</td>
                  <td className="p-4">
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Active</span>
                  </td>
                </tr>
              ))}
              {!loading && activeContracts.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground"><DollarSign className="mx-auto h-8 w-8 mb-2 opacity-50" /><p>No records found</p></td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
