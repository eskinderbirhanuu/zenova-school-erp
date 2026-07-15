"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { useCorporateDepartments } from "@/hooks/queries"
import { corporateService } from "@/services/api"
import { Loader2, Plus, Search } from "lucide-react"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"

export default function DepartmentsPage() {
  const [search, setSearch] = useState("")
  const { data: departments, isLoading } = useCorporateDepartments(true)

  const doToggle = async (id: string, current: boolean) => {
    try {
      await corporateService.departments.update(id, { is_active: !current })
      toast({ title: current ? "Department deactivated" : "Department activated" })
    } catch {
      toast({ title: "Update failed", variant: "destructive" })
    }
  }

  const filtered = (departments || []).filter((d: any) =>
    !search || d.name?.toLowerCase().includes(search.toLowerCase()) || d.code?.toLowerCase().includes(search.toLowerCase())
  )

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        description="Manage corporate departments"
        actions={<Link href="/corporate/departments/new"><Button><Plus className="h-4 w-4 mr-2" /> New Department</Button></Link>}
      />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search departments..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-3 font-medium">Code</th>
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium">Description</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td className="py-8 text-center text-muted-foreground" colSpan={5}>No departments found</td></tr>
              ) : filtered.map((dept: any) => (
                <tr key={dept.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-3 font-mono text-xs">{dept.code}</td>
                  <td className="py-3 font-medium">{dept.name}</td>
                  <td className="py-3 text-muted-foreground max-w-xs truncate">{dept.description || "—"}</td>
                  <td className="py-3">
                    <StatusBadge status={dept.is_active ? "Active" : "Inactive"} variant={dept.is_active ? "success" : "default"} />
                  </td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => doToggle(dept.id, dept.is_active)}>
                        {dept.is_active ? "Deactivate" : "Activate"}
                      </Button>
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
