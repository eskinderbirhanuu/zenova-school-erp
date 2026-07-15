"use client"

import { GenericListPage } from "@/components/ui/generic-list-page"
import { useAdminReports } from "@/hooks/queries"

export default function AdminReports() {
  const { data: reports = [], isLoading: loading } = useAdminReports()

  return (
    <GenericListPage
      title="Reports" description="View school reports and insights"
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
