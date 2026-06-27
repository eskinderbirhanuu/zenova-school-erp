"use client"

import { useEffect, useState } from "react"
import { GenericListPage } from "@/components/ui/generic-list-page"
import api from "@/services/api"
import { toast } from "@/hooks/use-toast"

export default function CafeteriaReports() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get("/reports/cafeteria").then((res: any) => {
      setReports(res.data ?? res)
    }).catch(() => {
      toast({ title: "Error", description: "Failed to load reports", variant: "destructive" })
    }).finally(() => {
      setLoading(false)
    })
  }, [])

  return (
    <GenericListPage
      title="Reports" description="View cafeteria sales reports"
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
