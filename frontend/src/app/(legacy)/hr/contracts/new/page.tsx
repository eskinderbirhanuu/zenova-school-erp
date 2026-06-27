"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { hrService } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NewContractPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    employee_id: "", employee_type: "teacher", contract_type: "permanent",
    start_date: "", end_date: "", salary: 0, benefits: "", position: "", department: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await hrService.contracts.create(form)
      toast({ title: "Contract created" }); router.push("/hr")
    } catch { toast({ title: "Failed", variant: "destructive" }); setLoading(false) }
  }

  const Field = ({ label, name, type = "text" }: any) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">{label}</label>
      {type === "select" ? (
        <select name={name} value={(form as any)[name]} onChange={e => setForm({...form, [name]: e.target.value})} className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
          {name === "employee_type" && ["teacher", "staff"].map(o => <option key={o} value={o}>{o}</option>)}
          {name === "contract_type" && ["permanent", "fixed_term", "probation", "temporary"].map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <Input type={type} value={(form as any)[name]} onChange={e => setForm({...form, [name]: type === "number" ? Number(e.target.value) : e.target.value})} />
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/hr"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-3xl font-bold">New Contract</h1>
      </div>
      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="grid gap-4 md:grid-cols-2 pt-6">
            <Field label="Employee ID" name="employee_id" />
            <Field label="Employee Type" name="employee_type" type="select" />
            <Field label="Contract Type" name="contract_type" type="select" />
            <Field label="Position" name="position" />
            <Field label="Department" name="department" />
            <Field label="Start Date" name="start_date" type="date" />
            <Field label="End Date" name="end_date" type="date" />
            <Field label="Salary" name="salary" type="number" />
            <Field label="Benefits" name="benefits" />
          </CardContent>
        </Card>
        <div className="mt-6 flex justify-end gap-3">
          <Link href="/hr"><Button type="button" variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Contract"}</Button>
        </div>
      </form>
    </div>
  )
}
