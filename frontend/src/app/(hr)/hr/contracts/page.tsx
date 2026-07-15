"use client"

import { useState } from "react"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { useContracts } from "@/hooks/queries"

export default function HrContractsPage() {
  const { data: contracts, isLoading } = useContracts({ limit: 100 } as any)
  const [search, setSearch] = useState("")

  const contractsList = contracts || []

  const filtered = contractsList.filter((c: any) => !search || c.employee_name?.toLowerCase().includes(search.toLowerCase()))

  return (
    <GenericListPage
      title="Contracts" description="Manage employee contracts"
      columns={[
        { key: "employee", header: "Employee", render: (c: any) => <span className="font-medium">{c.employee_name || c.employee?.first_name || "\u2014"}</span> },
        { key: "type", header: "Type", render: (c: any) => <span>{c.contract_type || c.type || "\u2014"}</span> },
        { key: "start", header: "Start Date", render: (c: any) => <span className="text-muted-foreground">{c.start_date || "\u2014"}</span> },
        { key: "end", header: "End Date", render: (c: any) => <span className="text-muted-foreground">{c.end_date || "\u2014"}</span> },
        { key: "status", header: "Status", render: (c: any) => <StatusBadge status={c.status || "active"} /> },
      ]}
      data={filtered} keyExtractor={(c: any) => c.id}
      loading={isLoading} searchPlaceholder="Search employee..." onSearch={setSearch}
      emptyTitle="No contracts found"
    />
  )
}
