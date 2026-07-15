"use client"

import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { useFinanceReports } from "@/hooks/queries"

export default function FinanceReports() {
  const { data: reports, isLoading } = useFinanceReports()

  return (
    <GenericListPage
      title="Reports" description="View financial reports and summaries"
      columns={[
        { key: "name", header: "Report", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "type", header: "Type", render: (r) => <span>{r.type}</span> },
        { key: "period", header: "Period", render: (r) => <span className="text-muted-foreground">{r.period}</span> },
        { key: "generated", header: "Generated", render: (r) => <span className="text-muted-foreground">{r.generated}</span> },
        { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      data={reports || []} keyExtractor={(r) => r.id}
      loading={isLoading} emptyTitle="No reports found"
    />
  )
}
