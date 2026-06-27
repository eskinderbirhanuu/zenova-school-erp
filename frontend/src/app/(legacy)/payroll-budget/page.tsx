"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import api from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { Plus, DollarSign, PiggyBank, Briefcase } from "lucide-react"

export default function PayrollBudgetPage() {
  const [tab, setTab] = useState<"budgets" | "payroll">("budgets")
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [budgetForm, setBudgetForm] = useState({ name: "", fiscal_year: "", total_amount: 0, description: "" })
  const [payrollForm, setPayrollForm] = useState({ period: "", employee_ids: "", total_amount: 0, notes: "" })

  const load = async () => {
    setLoading(true)
    try {
      const endpoint = tab === "budgets" ? "/budgets" : "/payroll-runs"
      const res = await api.get(endpoint, { params: { limit: 50 } })
      setItems(res.data || [])
    } catch { setItems([]) }
    setLoading(false)
  }

  useEffect(() => { load() }, [tab])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const data = tab === "budgets" ? budgetForm : payrollForm
      const endpoint = tab === "budgets" ? "/budgets" : "/payroll-runs"
      await api.post(endpoint, data)
      toast({ title: `${tab.slice(0, -1)} created` })
      setShowForm(false)
      setBudgetForm({ name: "", fiscal_year: "", total_amount: 0, description: "" })
      setPayrollForm({ period: "", employee_ids: "", total_amount: 0, notes: "" })
      load()
    } catch { toast({ title: "Failed", variant: "destructive" }) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Payroll & Budget</h1>
        <div className="flex gap-2">
          <Button variant={tab === "budgets" ? "default" : "outline"} size="sm" onClick={() => setTab("budgets")}><PiggyBank className="mr-1 h-4 w-4" />Budgets</Button>
          <Button variant={tab === "payroll" ? "default" : "outline"} size="sm" onClick={() => setTab("payroll")}><Briefcase className="mr-1 h-4 w-4" />Payroll</Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="mr-1 h-4 w-4" />New</Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>New {tab === "budgets" ? "Budget" : "Payroll Run"}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
              {tab === "budgets" ? (
                <>
                  <Input placeholder="Name" value={budgetForm.name} onChange={e => setBudgetForm({...budgetForm, name: e.target.value})} required />
                  <Input placeholder="Fiscal Year (e.g. 2025-2026)" value={budgetForm.fiscal_year} onChange={e => setBudgetForm({...budgetForm, fiscal_year: e.target.value})} />
                  <Input placeholder="Total Amount" type="number" step="0.01" value={budgetForm.total_amount} onChange={e => setBudgetForm({...budgetForm, total_amount: Number(e.target.value)})} />
                  <Input placeholder="Description" className="md:col-span-2" value={budgetForm.description} onChange={e => setBudgetForm({...budgetForm, description: e.target.value})} />
                </>
              ) : (
                <>
                  <Input placeholder="Period (e.g. 2025-01)" value={payrollForm.period} onChange={e => setPayrollForm({...payrollForm, period: e.target.value})} required />
                  <Input placeholder="Employee IDs (comma-separated)" value={payrollForm.employee_ids} onChange={e => setPayrollForm({...payrollForm, employee_ids: e.target.value})} />
                  <Input placeholder="Total Amount" type="number" step="0.01" value={payrollForm.total_amount} onChange={e => setPayrollForm({...payrollForm, total_amount: Number(e.target.value)})} />
                  <Input placeholder="Notes" value={payrollForm.notes} onChange={e => setPayrollForm({...payrollForm, notes: e.target.value})} />
                </>
              )}
              <Button type="submit" className="md:col-start-2">Create</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                {tab === "budgets" ? (
                  <><th className="p-4 font-medium">Name</th><th className="p-4 font-medium">Fiscal Year</th><th className="p-4 font-medium">Amount</th><th className="p-4 font-medium">Description</th></>
                ) : (
                  <><th className="p-4 font-medium">Period</th><th className="p-4 font-medium">Employees</th><th className="p-4 font-medium">Amount</th><th className="p-4 font-medium">Notes</th></>
                )}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={4} className="p-8 text-center">Loading...</td></tr>}
              {!loading && items.map((i: any) => (
                <tr key={i.id} className="border-b last:border-0 hover:bg-muted/50">
                  {tab === "budgets" ? (
                    <><td className="p-4 font-medium">{i.name}</td><td className="p-4">{i.fiscal_year}</td>
                      <td className="p-4">${Number(i.total_amount).toLocaleString()}</td><td className="p-4 text-muted-foreground">{i.description || "—"}</td></>
                  ) : (
                    <><td className="p-4">{i.period}</td><td className="p-4">{i.employee_count || i.employee_ids || "—"}</td>
                      <td className="p-4">${Number(i.total_amount).toLocaleString()}</td><td className="p-4 text-muted-foreground">{i.notes || "—"}</td></>
                  )}
                </tr>
              ))}
              {!loading && items.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No {tab}</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
