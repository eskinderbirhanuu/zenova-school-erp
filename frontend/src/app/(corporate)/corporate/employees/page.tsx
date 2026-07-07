"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { corporateService } from "@/services/api"
import { Loader2, Plus, Search, Pencil, Trash2 } from "lucide-react"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const router = useRouter()

  const fetch = () => {
    setLoading(true)
    corporateService.employees.list().then((res) => setEmployees(res.data)).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [])

  const doDelete = async (id: string) => {
    if (!confirm("Delete this employee?")) return
    try {
      await corporateService.employees.delete(id)
      toast({ title: "Employee deleted" })
      fetch()
    } catch {
      toast({ title: "Delete failed", variant: "destructive" })
    }
  }

  const filtered = employees.filter((e: any) =>
    !search || e.full_name?.toLowerCase().includes(search.toLowerCase()) || e.employee_id?.toLowerCase().includes(search.toLowerCase()) || e.email?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        description="Manage ZENOVA corporate employees"
        actions={<Link href="/corporate/employees/new"><Button><Plus className="h-4 w-4 mr-2" /> New Employee</Button></Link>}
      />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-3 font-medium">Employee ID</th>
                <th className="pb-3 font-medium">Full Name</th>
                <th className="pb-3 font-medium">Email</th>
                <th className="pb-3 font-medium">Department</th>
                <th className="pb-3 font-medium">Position</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td className="py-8 text-center text-muted-foreground" colSpan={7}>No employees found</td></tr>
              ) : filtered.map((emp: any) => (
                <tr key={emp.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-3 font-mono text-xs">{emp.employee_id}</td>
                  <td className="py-3 font-medium">{emp.full_name}</td>
                  <td className="py-3">{emp.email}</td>
                  <td className="py-3">{emp.department_name || "—"}</td>
                  <td className="py-3">{emp.position || "—"}</td>
                  <td className="py-3"><StatusBadge status={emp.status === "active" ? "Active" : "Inactive"} variant={emp.status === "active" ? "success" : "default"} /></td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => router.push(`/corporate/employees/${emp.id}`)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => doDelete(emp.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
