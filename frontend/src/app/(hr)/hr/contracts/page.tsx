"use client"

import { useEffect, useState } from "react"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { hrService } from "@/services/api"
import { toast } from "@/hooks/use-toast"

export default function HrContractsPage() {
  const [contracts, setContracts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    setLoading(true)
    hrService.contracts.list({ limit: 100 }).then((r: any) => setContracts(r.data)).catch(() => toast({ title: "Failed to load contracts", variant: "destructive" })).finally(() => setLoading(false))
  }, [])

  const filtered = contracts.filter(c => !search || c.employee_name?.toLowerCase().includes(search.toLowerCase()))

  return (
    <GenericListPage
      title="Contracts" description="Manage employee contracts"
      columns={[
        { key: "employee", header: "Employee", render: (c) => <span className="font-medium">{c.employee_name || c.employee?.first_name || "\u2014"}</span> },
        { key: "type", header: "Type", render: (c) => <span>{c.contract_type || c.type || "\u2014"}</span> },
        { key: "start", header: "Start Date", render: (c) => <span className="text-muted-foreground">{c.start_date || "\u2014"}</span> },
        { key: "end", header: "End Date", render: (c) => <span className="text-muted-foreground">{c.end_date || "\u2014"}</span> },
        { key: "status", header: "Status", render: (c) => <StatusBadge status={c.status || "active"} /> },
      ]}
      data={filtered} keyExtractor={(c) => c.id}
      loading={loading} searchPlaceholder="Search employee..." onSearch={setSearch}
      emptyTitle="No contracts found"
    />
  )
}
