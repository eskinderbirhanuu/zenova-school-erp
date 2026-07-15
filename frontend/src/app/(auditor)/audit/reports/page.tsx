"use client"

import { GenericListPage } from "@/components/ui/generic-list-page"
import { useAuditLogs } from "@/hooks/queries"

export default function AuditorReports() {
  const { data: reports, isLoading: loading } = useAuditLogs()

  return (
    <GenericListPage
      title="Reports" description="View audit reports"
      columns={[
        { key: "name", header: "Report", render: (r: any) => <span className="font-medium">{r.name}</span> },
        { key: "type", header: "Type", render: (r: any) => <span>{r.type}</span> },
        { key: "period", header: "Period", render: (r: any) => <span className="text-muted-foreground">{r.period}</span> },
        { key: "generated", header: "Generated", render: (r: any) => <span className="text-muted-foreground">{r.generated}</span> },
      ]}
      data={reports || []} keyExtractor={(r: any) => r.id}
      loading={loading} emptyTitle="No reports found"
    />
  )
}
