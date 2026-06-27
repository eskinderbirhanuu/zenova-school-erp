"use client"

import { useEffect, useState } from "react"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { hrService } from "@/services/api"
import { toast } from "@/hooks/use-toast"

const statusOptions = ["active", "inactive", "suspended", "terminated"]

export default function HrEmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    hrService.contracts.list({ limit: 100 })
      .then((r: any) => setEmployees(r.data))
      .catch(() => toast({ title: "Failed to load employees", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [])

  const filtered = employees.filter((e: any) => {
    const name = `${e.employee_name || e.employee?.first_name || ""} ${e.employee?.last_name || ""}`.toLowerCase()
    const matchSearch = !search || name.includes(search.toLowerCase()) || e.employee_id?.includes(search)
    const matchStatus = !statusFilter || e.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <GenericListPage
      title="Employees"
      description="Manage staff and contracts"
      columns={[
        { key: "name", header: "Employee", render: (e) => <span className="font-medium">{e.employee_name || `${e.employee?.first_name || ""} ${e.employee?.last_name || ""}` || e.id?.slice(0, 8)}</span> },
        { key: "dept", header: "Department", render: (e) => <span>{e.department || "\u2014"}</span> },
        { key: "position", header: "Position", render: (e) => <span>{e.position || e.job_title || "\u2014"}</span> },
        { key: "status", header: "Status", render: (e) => <StatusBadge status={e.status || "active"} /> },
      ]}
      data={filtered}
      keyExtractor={(e) => e.id}
      loading={loading}
      searchPlaceholder="Search by name or ID..."
      onSearch={setSearch}
      emptyTitle="No employees found"
      extraFilters={
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="">All Status</option>
          {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      }
    />
  )
}
