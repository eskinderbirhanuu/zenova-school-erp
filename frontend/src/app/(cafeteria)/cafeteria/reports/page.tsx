"use client"

import { GenericListPage } from "@/components/ui/generic-list-page"
import { useCafeteriaReports } from "@/hooks/queries"

export default function CafeteriaReports() {
  const { data: reports, isLoading } = useCafeteriaReports()

  return (
    <GenericListPage
      title="Reports" description="View cafeteria sales reports"
      columns={[
        { key: "name", header: "Report", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "type", header: "Type", render: (r) => <span>{r.type}</span> },
        { key: "period", header: "Period", render: (r) => <span className="text-muted-foreground">{r.period}</span> },
        { key: "generated", header: "Generated", render: (r) => <span className="text-muted-foreground">{r.generated}</span> },
      ]}
      data={reports || []} keyExtractor={(r) => r.id}
      loading={isLoading} emptyTitle="No reports found"
    />
  )
}
