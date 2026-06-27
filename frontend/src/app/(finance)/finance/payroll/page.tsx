"use client"

import { useEffect, useState } from "react"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { toast } from "@/hooks/use-toast"
import api from "@/services/api"

export default function PayrollPage() {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get("/payroll", { params: { limit: 200 } })
      .then((res) => {
        const raw = res.data?.data || res.data || []
        setRecords(raw.map((p: any) => ({
          id: p.id,
          employee: p.employee_name || p.staff_name || "—",
          position: p.position || p.job_title || "—",
          salary: p.salary ?? 0,
          deductions: p.deductions ?? 0,
          net: p.net_pay ?? p.net ?? 0,
          status: p.status || "pending",
          period: p.period || "—",
        })))
      })
      .catch(() => toast({ title: "Error", description: "Failed to load payroll records", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [])

  return (
    <GenericListPage
      title="Payroll" description="Manage employee salaries and payments"
      columns={[
        { key: "employee", header: "Employee", render: (r) => <span className="font-medium">{r.employee}</span> },
        { key: "position", header: "Position", render: (r) => <span className="text-muted-foreground">{r.position}</span> },
        { key: "salary", header: "Salary", render: (r) => <span className="font-mono">${r.salary.toLocaleString()}</span> },
        { key: "net", header: "Net Pay", render: (r) => <span className="font-mono font-medium">${r.net.toLocaleString()}</span> },
        { key: "period", header: "Period", render: (r) => <span className="text-muted-foreground">{r.period}</span> },
        { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      data={records} keyExtractor={(r) => r.id}
      loading={loading} emptyTitle="No payroll records"
    />
  )
}
