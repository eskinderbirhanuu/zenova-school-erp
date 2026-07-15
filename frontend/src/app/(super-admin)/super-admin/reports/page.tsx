"use client"

import { GenericListPage } from "@/components/ui/generic-list-page"
import { useSystemReports } from "@/hooks/queries"

export default function SuperAdminReports() {
  const { data: reports = [], isLoading: loading } = useSystemReports()

  return (
    <GenericListPage
      title="Reports" description="View system-wide reports across all schools"
      columns={[
        { key: "name", header: "Report", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "type", header: "Type", render: (r) => <span>{r.type}</span> },
        { key: "period", header: "Period", render: (r) => <span className="text-muted-foreground">{r.period}</span> },
        { key: "generated", header: "Generated", render: (r) => <span className="text-muted-foreground">{r.generated}</span> },
      ]}
      data={reports} keyExtractor={(r) => r.id}
      loading={loading} emptyTitle="No reports found"
    />
  )
}
