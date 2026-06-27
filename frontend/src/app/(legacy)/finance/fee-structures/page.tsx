"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { financeService } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { Plus } from "lucide-react"

export default function FeeStructuresPage() {
  const [feeTypes, setFeeTypes] = useState<any[]>([])
  const [feeStructures, setFeeStructures] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"types" | "structures">("types")
  const [showForm, setShowForm] = useState(false)
  const [typeForm, setTypeForm] = useState({ name: "", code: "", description: "", amount: 0, frequency: "termly" })
  const [structForm, setStructForm] = useState({ name: "", fee_type_ids: "", class_ids: "", amount: 0 })

  const load = async () => {
    setLoading(true)
    try { const [ft, fs] = await Promise.all([financeService.feeTypes.list(), financeService.feeStructures.list()]); setFeeTypes(ft.data); setFeeStructures(fs.data) } catch { toast({ title: "Failed", variant: "destructive" }) }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const createType = async (e: React.FormEvent) => {
    e.preventDefault()
    try { await financeService.feeTypes.create(typeForm); toast({ title: "Fee type created" }); setShowForm(false); setTypeForm({ name: "", code: "", description: "", amount: 0, frequency: "termly" }); load() } catch { toast({ title: "Failed", variant: "destructive" }) }
  }

  const createStructure = async (e: React.FormEvent) => {
    e.preventDefault()
    try { await financeService.feeStructures.create(structForm); toast({ title: "Fee structure created" }); setShowForm(false); setStructForm({ name: "", fee_type_ids: "", class_ids: "", amount: 0 }); load() } catch { toast({ title: "Failed", variant: "destructive" }) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Fee Management</h1>
        <div className="flex gap-2">
          <Button variant={tab === "types" ? "default" : "outline"} size="sm" onClick={() => setTab("types")}>Fee Types</Button>
          <Button variant={tab === "structures" ? "default" : "outline"} size="sm" onClick={() => setTab("structures")}>Structures</Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="mr-1 h-4 w-4" />New</Button>
        </div>
      </div>

      {showForm && tab === "types" && (
        <Card>
          <CardHeader><CardTitle>New Fee Type</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={createType} className="grid gap-4 md:grid-cols-3">
              <Input placeholder="Name" value={typeForm.name} onChange={e => setTypeForm({...typeForm, name: e.target.value})} required />
              <Input placeholder="Code" value={typeForm.code} onChange={e => setTypeForm({...typeForm, code: e.target.value})} required />
              <Input placeholder="Description" value={typeForm.description} onChange={e => setTypeForm({...typeForm, description: e.target.value})} />
              <Input placeholder="Amount" type="number" step="0.01" value={typeForm.amount} onChange={e => setTypeForm({...typeForm, amount: Number(e.target.value)})} required />
              <select value={typeForm.frequency} onChange={e => setTypeForm({...typeForm, frequency: e.target.value})} className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="termly">Termly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option><option value="one-time">One-time</option>
              </select>
              <Button type="submit">Create</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {showForm && tab === "structures" && (
        <Card>
          <CardHeader><CardTitle>New Fee Structure</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={createStructure} className="grid gap-4 md:grid-cols-2">
              <Input placeholder="Name" value={structForm.name} onChange={e => setStructForm({...structForm, name: e.target.value})} required />
              <Input placeholder="Fee Type IDs (comma-separated)" value={structForm.fee_type_ids} onChange={e => setStructForm({...structForm, fee_type_ids: e.target.value})} />
              <Input placeholder="Class IDs (comma-separated)" value={structForm.class_ids} onChange={e => setStructForm({...structForm, class_ids: e.target.value})} />
              <Input placeholder="Amount" type="number" step="0.01" value={structForm.amount} onChange={e => setStructForm({...structForm, amount: Number(e.target.value)})} />
              <Button type="submit">Create</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {tab === "types" && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground"><th className="p-4 font-medium">Name</th><th className="p-4 font-medium">Code</th><th className="p-4 font-medium">Amount</th><th className="p-4 font-medium">Frequency</th></tr></thead>
              <tbody>
                {feeTypes.map((ft: any) => (
                  <tr key={ft.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4">{ft.name}</td><td className="p-4 font-mono text-xs">{ft.code}</td>
                    <td className="p-4">${Number(ft.amount).toFixed(2)}</td><td className="p-4 capitalize">{ft.frequency}</td>
                  </tr>
                ))}
                {feeTypes.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No fee types</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {tab === "structures" && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground"><th className="p-4 font-medium">Name</th><th className="p-4 font-medium">Amount</th><th className="p-4 font-medium">Classes</th><th className="p-4 font-medium">Fee Types</th></tr></thead>
              <tbody>
                {feeStructures.map((fs: any) => (
                  <tr key={fs.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4">{fs.name}</td><td className="p-4">${Number(fs.amount).toFixed(2)}</td>
                    <td className="p-4 text-xs">{fs.class_ids}</td><td className="p-4 text-xs">{fs.fee_type_ids}</td>
                  </tr>
                ))}
                {feeStructures.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No fee structures</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
